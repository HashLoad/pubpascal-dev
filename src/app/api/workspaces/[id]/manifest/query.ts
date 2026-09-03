import "server-only";
// Manifest data fetch — per-viewer projection (ADR-073, ADR-074).
// Owner reads fork_url/write_target/label via session client (owner-only RLS).
// Non-owner reads only id + upstream_url via service-role client (fail-soft, AC-12).
// Returns null for 404 cases (BR2, BR7).

import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import type {
  ManifestRawNode,
  ManifestInput,
  OwnerLinkFields,
  NonOwnerLinkFields,
} from "@/lib/workspaces/manifest";

type WorkspaceRow = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  visibility: string;
};

// Returns the inputs buildManifest needs, or null for 404 (private-not-owner /
// non-existent / hard workspace-read failure).
// isHeadless=true: bearer-token path — no session cookie, so auth.uid()=null.
// Uses service-role + manual auth gate to replicate RLS for that path (AC-05).
export async function getWorkspaceManifestData(
  id: string,
  viewerId: string | null,
  isHeadless = false,
): Promise<Omit<ManifestInput, "generatedAt"> | null> {
  try {
    // Headless requests carry no Supabase cookie → auth.uid()=null → RLS blocks
    // private workspaces. Use service-role so the row is always reachable, then
    // enforce visibility manually below (replicates RLS: owner OR public).
    const supabase = isHeadless ? createServiceClient() : await createClient();

    // Step 1: Read workspace (session RLS for cookie path; service-role for headless).
    const { data: workspace, error: wsError } = await supabase
      .from("workspaces")
      .select("id, owner_id, name, description, visibility")
      .eq("id", id)
      .maybeSingle();

    if (wsError) {
      console.warn("[manifest] workspace fetch failed", wsError);
      return null;
    }
    if (!workspace) return null;

    const ws = workspace as WorkspaceRow;
    const isOwner = viewerId !== null && ws.owner_id === viewerId;

    // Manual auth gate for headless path: replicate RLS (owner OR public visibility).
    if (isHeadless && ws.visibility === "private" && !isOwner) return null;

    // Step 2: Read nodes (join packages) + edges ordered by created_at asc.
    const [nodesResult, edgesResult] = await Promise.all([
      supabase
        .from("workspace_nodes")
        .select(
          "id, workspace_id, is_root, package_id, external_link_id, ref_type, ref_value, created_at, updated_at, packages(name, slug, repository_url, publisher_id)",
        )
        .eq("workspace_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("workspace_edges")
        .select("id, workspace_id, from_node_id, to_node_id, created_at")
        .eq("workspace_id", id)
        .order("created_at", { ascending: true }),
    ]);

    if (nodesResult.error) {
      console.warn("[manifest] nodes fetch failed", nodesResult.error);
      return null;
    }
    if (edgesResult.error) {
      console.warn("[manifest] edges fetch failed", edgesResult.error);
      return null;
    }

    const rawNodes = (nodesResult.data ?? []) as unknown as ManifestRawNode[];
    const edges = (edgesResult.data ?? []) as Array<{
      from_node_id: string;
      to_node_id: string;
    }>;

    // Step 3: Collect external_link_ids and resolve per viewer.
    const linkIds = rawNodes
      .map((n) => n.external_link_id)
      .filter((lid): lid is string => lid !== null);

    const linkMap = new Map<string, OwnerLinkFields | NonOwnerLinkFields>();

    if (linkIds.length > 0) {
      if (isOwner) {
        // Owner path: session client uses RLS; headless path uses service-role (supabase
        // is already service-role when isHeadless, so this branch works for both).
        const { data: linkRows, error: linkError } = await supabase
          .from("external_repo_links")
          .select("id, upstream_url, fork_url, write_target, label")
          .in("id", linkIds);

        if (linkError) {
          console.warn("[manifest] owner link fetch failed", linkError);
          // Fail-soft: linkMap stays empty for affected nodes.
        } else {
          for (const row of linkRows ?? []) {
            if (row.id) {
              linkMap.set(row.id as string, {
                upstream_url: (row.upstream_url as string) ?? "",
                fork_url: (row.fork_url as string | null) ?? null,
                write_target: (row.write_target as "fork" | "none") ?? "none",
                label: (row.label as string) ?? "",
              });
            }
          }
        }
      } else {
        // Non-owner path: read ONLY id + upstream_url via service-role client (ADR-074, BR3).
        // createServiceClient() throws when SUPABASE_SERVICE_ROLE_KEY is absent (AC-12).
        try {
          const serviceClient = createServiceClient();
          const { data: linkRows, error: linkError } = await serviceClient
            .from("external_repo_links")
            .select("id, upstream_url")
            .in("id", linkIds);

          if (linkError) {
            console.warn("[manifest] non-owner link upstream fetch failed", linkError);
            // Fail-soft: upstreamMap stays empty.
          } else {
            for (const row of linkRows ?? []) {
              if (row.id) {
                linkMap.set(row.id as string, {
                  upstream_url: (row.upstream_url as string) ?? "",
                } as NonOwnerLinkFields);
              }
            }
          }
        } catch (serviceErr) {
          // SUPABASE_SERVICE_ROLE_KEY absent — fail-soft (AC-12, BR7).
          console.warn("[manifest] service client unavailable", serviceErr);
        }
      }
    }

    return {
      workspace: {
        id: ws.id,
        name: ws.name,
        description: ws.description,
      },
      rawNodes,
      edges,
      isOwner,
      viewerId,
      linkMap,
    };
  } catch (err) {
    console.warn("[manifest] getWorkspaceManifestData failed", err);
    return null;
  }
}
