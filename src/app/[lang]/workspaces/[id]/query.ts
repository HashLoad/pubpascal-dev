import "server-only";
// RN-006 projection layer — ADR-064.
//
// getPublicWorkspaceView: server-side sanitized read of a public workspace.
// Privacy is enforced by:
//   1. Visibility gate: returns null unless workspace.visibility = 'public'.
//   2. Service-role read for link upstream_url only — fork_url is NEVER selected.
//   3. Return type PublicWorkspaceView (ADR-065) has no fork/label/write_target field.
//
// createServiceClient() THROWS when SUPABASE_SERVICE_ROLE_KEY is absent.
// The link read is wrapped in try/catch — on throw, external nodes resolve
// without an upstream (fail-soft, R3), never crash, never leak.

import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import type { PublicWorkspaceView, PublicWorkspaceNode, WorkspaceEdge } from "@/lib/workspaces/types";

// Raw node row shape as returned by Supabase (before projection).
type RawNode = {
  id: string;
  workspace_id: string;
  is_root: boolean;
  package_id: string | null;
  external_link_id: string | null;
  ref_type: string | null;
  ref_value: string | null;
  created_at: string;
  updated_at: string;
  packages: { name: string; slug: string } | null;
};

// Sanitized RN-006 projection (AC-10, AC-11, ADR-064).
// Returns null for a non-public or non-existent workspace (BR-L6, no existence leak).
// Fail-soft on any error → null.
export async function getPublicWorkspaceView(
  id: string,
): Promise<PublicWorkspaceView | null> {
  try {
    const supabase = await createClient();

    // Step 1: Read workspace with ordinary server client.
    // Return null unless visibility='public' (BR-L6, AC-10).
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("id, name, description, visibility")
      .eq("id", id)
      .maybeSingle();

    if (wsError) {
      console.warn("[public-workspace] workspace fetch failed", wsError);
      return null;
    }
    if (!workspace || workspace.visibility !== "public") {
      // Non-existent and private yield the same null — no existence leak.
      return null;
    }

    // Step 2: Read nodes + edges (public-readable via workspace public RLS).
    const [nodesResult, edgesResult] = await Promise.all([
      supabase
        .from("workspace_nodes")
        .select("id, workspace_id, is_root, package_id, external_link_id, ref_type, ref_value, created_at, updated_at, packages(name, slug)")
        .eq("workspace_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("workspace_edges")
        .select("id, workspace_id, from_node_id, to_node_id, created_at")
        .eq("workspace_id", id)
        .order("created_at", { ascending: true }),
    ]);

    if (nodesResult.error) {
      console.warn("[public-workspace] nodes fetch failed", nodesResult.error);
      return null;
    }
    if (edgesResult.error) {
      console.warn("[public-workspace] edges fetch failed", edgesResult.error);
      return null;
    }

    const rawNodes = (nodesResult.data ?? []) as unknown as RawNode[];
    const edges = (edgesResult.data ?? []) as WorkspaceEdge[];

    // Step 3: Collect external_link_ids and fetch ONLY id + upstream_url via
    // service-role client (ADR-064). fork_url is NEVER named in the select list.
    // createServiceClient() throws when SUPABASE_SERVICE_ROLE_KEY is absent (R3);
    // wrap in try/catch → fail-soft (empty map), never leak.
    const linkIds = rawNodes
      .map((n) => n.external_link_id)
      .filter((lid): lid is string => lid !== null);

    const upstreamMap = new Map<string, string>();

    if (linkIds.length > 0) {
      try {
        const serviceClient = createServiceClient();
        // ADR-064: select only id + upstream_url. fork_url never selected.
        const { data: linkRows, error: linkError } = await serviceClient
          .from("external_repo_links")
          .select("id, upstream_url")
          .in("id", linkIds);

        if (linkError) {
          console.warn("[public-workspace] link upstream fetch failed", linkError);
          // Fail-soft: upstreamMap stays empty; external nodes resolve without upstream.
        } else {
          for (const row of linkRows ?? []) {
            if (row.id && row.upstream_url) {
              upstreamMap.set(row.id as string, row.upstream_url as string);
            }
          }
        }
      } catch (serviceErr) {
        // createServiceClient() threw — SUPABASE_SERVICE_ROLE_KEY absent (R3).
        // Fail-soft: external nodes resolve without upstream, never crash, never leak.
        console.warn("[public-workspace] service client unavailable", serviceErr);
      }
    }

    // Step 4: Project each raw node → PublicWorkspaceNode (ADR-065).
    // The external arm carries only upstream_url — no fork_url/label/write_target.
    const nodes: PublicWorkspaceNode[] = rawNodes.map((node): PublicWorkspaceNode => {
      if (node.external_link_id !== null) {
        // External arm: resolve upstream_url only (RN-006).
        const upstream = upstreamMap.get(node.external_link_id) ?? "";
        return { kind: "external", upstream_url: upstream };
      }
      // Package arm.
      return {
        kind: "package",
        package: {
          name: node.packages?.name ?? "",
          slug: node.packages?.slug ?? "",
        },
      };
    });

    return {
      workspace: {
        id: workspace.id as string,
        name: workspace.name as string,
        description: (workspace.description as string | null) ?? null,
      },
      nodes,
      edges,
    };
  } catch (err) {
    console.warn("[public-workspace] getPublicWorkspaceView failed", err);
    return null;
  }
}
