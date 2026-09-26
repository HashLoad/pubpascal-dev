import "server-only";
import { createClient } from "@/utils/supabase/server";
import type { Workspace, WorkspaceNode, WorkspaceEdge, ExternalRepoLink } from "@/lib/workspaces/types";

// Header columns rendered by the list/edit surfaces (no nodes/edges this demand).
const WORKSPACE_SELECT =
  "id, owner_id, name, description, visibility, created_at, updated_at";

// Owner-scoped list for the profile workspaces page. RLS also enforces ownership;
// the explicit owner_id filter keeps the intent clear (defense-in-depth, BR3).
// Fail-soft: a missing-table / RLS / no-user condition returns [] so the page
// degrades to an empty-state before the Demand-1/3 migration is applied live (R3).
export async function getMyWorkspaces(userId: string): Promise<Workspace[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select(WORKSPACE_SELECT)
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.warn("[workspaces] getMyWorkspaces failed", error);
    return [];
  }
  return (data ?? []) as Workspace[];
}

// Single owned workspace for the edit page. Returns null when not found or not
// owned (RLS + the explicit owner_id filter). The caller maps null → redirect,
// so no foreign workspace is ever rendered (AC4, BR3).
export async function getMyWorkspaceById(
  userId: string,
  id: string,
): Promise<Workspace | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select(WORKSPACE_SELECT)
    .eq("id", id)
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) {
    console.warn("[workspaces] getMyWorkspaceById failed", error);
    return null;
  }
  return (data as Workspace | null) ?? null;
}

// WorkspaceNode row enriched with the joined package name and slug (legacy shape,
// kept for backward-compat with WorkspaceEdgesForm which imports this type).
export type WorkspaceNodeWithPackage = WorkspaceNode & {
  packages: { name: string; slug: string } | null;
};

// WorkspaceNode enriched with BOTH package and external link label (AC-13, ADR-061)
// plus the persisted canvas position (satellite; null when unset → auto-layout).
// The owner editor uses this shape so a link-bound node shows the link label.
// external_link carries only label — owner-safe inside the owner-gated route.
export type WorkspaceNodeWithTarget = WorkspaceNode & {
  packages: { name: string; slug: string } | null;
  external_link: { label: string } | null;
  position_x: number | null;
  position_y: number | null;
};

// Fail-soft: returns [] if workspace_nodes is absent or on any error. The edit
// page degrades gracefully to an empty Nodes section.
//
// CRITICAL: the external_link label and canvas position live in tables/FKs added
// by LATER migrations (external_repo_links, workspace_node_positions) that may
// NOT be applied in a given environment. Embedding them in the node select makes
// PostgREST fail the WHOLE query (PGRST200/PGRST205) — which previously hid every
// node. So the core read embeds only `packages` (always present), and the two
// optional enrichments run as separate, independently fail-soft queries.
export async function getWorkspaceNodes(
  workspaceId: string,
): Promise<WorkspaceNodeWithTarget[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_nodes")
    .select("*, packages(name, slug)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[workspaces] getWorkspaceNodes failed", error);
    return [];
  }

  const rows = (data ?? []) as (Record<string, unknown> & {
    id: string;
    external_link_id: string | null;
  })[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);

  // Positions (satellite) — fail-soft: a missing table just yields no positions.
  const positions = new Map<string, { position_x: number; position_y: number }>();
  {
    const { data: pos } = await supabase
      .from("workspace_node_positions")
      .select("node_id, position_x, position_y")
      .in("node_id", ids);
    for (const p of (pos ?? []) as { node_id: string; position_x: number; position_y: number }[]) {
      positions.set(p.node_id, { position_x: p.position_x, position_y: p.position_y });
    }
  }

  // External-link labels — fail-soft: a missing table just yields no labels.
  const linkLabels = new Map<string, string>();
  const linkIds = rows.map((r) => r.external_link_id).filter((v): v is string => !!v);
  if (linkIds.length > 0) {
    const { data: links } = await supabase
      .from("external_repo_links")
      .select("id, label")
      .in("id", linkIds);
    for (const l of (links ?? []) as { id: string; label: string }[]) {
      linkLabels.set(l.id, l.label);
    }
  }

  return rows.map((row) => {
    const pos = positions.get(row.id);
    return {
      ...row,
      external_link: row.external_link_id
        ? { label: linkLabels.get(row.external_link_id) ?? "—" }
        : null,
      position_x: pos?.position_x ?? null,
      position_y: pos?.position_y ?? null,
    } as WorkspaceNodeWithTarget;
  });
}

// Owner's external repo links for the manage list + bind <select> (AC-08, ADR-062).
// Fail-soft → [] on error or absent table.
export async function getMyExternalRepoLinks(
  userId: string,
): Promise<ExternalRepoLink[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("external_repo_links")
    .select("id, owner_id, label, upstream_url, fork_url, write_target, created_at, updated_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[workspaces] getMyExternalRepoLinks failed", error);
    return [];
  }
  return (data ?? []) as ExternalRepoLink[];
}

// WorkspaceEdge row enriched with from/to package names via their parent nodes.
export type WorkspaceEdgeWithLabels = WorkspaceEdge & {
  from_node: { packages: { name: string } | null } | null;
  to_node: { packages: { name: string } | null } | null;
};

// Fail-soft: returns [] on any error or absent table.
export async function getWorkspaceEdges(
  workspaceId: string,
): Promise<WorkspaceEdgeWithLabels[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_edges")
    .select(
      "*, from_node:from_node_id(packages(name)), to_node:to_node_id(packages(name))",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) {
    console.warn("[workspaces] getWorkspaceEdges failed", error);
    return [];
  }
  return (data ?? []) as WorkspaceEdgeWithLabels[];
}

// `owned` flags the acting user's own packages; `pending` marks one not yet
// 'active' (awaiting catalog approval). The builder library groups "yours" apart
// and shows the pending state, so you can compose a workspace from your own
// repos immediately — without waiting for the public-catalog approval.
export type ActivePackageOption = {
  id: string;
  name: string;
  slug: string;
  owned: boolean;
  pending: boolean;
};

// Packages selectable in the builder library. Public/third-party packages are
// only included when 'active'; the acting user's OWN packages are included at
// any non-rejected status (so a just-published, still-pending package of yours
// can be added to your workspace). Fail-soft → [] on error.
export async function getActivePackagesForSelect(
  userId?: string,
): Promise<ActivePackageOption[]> {
  const supabase = await createClient();

  let query = supabase.from("packages").select("id, name, slug, publisher_id, status");
  if (userId) {
    // active (anyone) OR your own, any status except rejected.
    query = query.or(
      `status.eq.active,and(publisher_id.eq.${userId},status.neq.rejected)`,
    );
  } else {
    query = query.eq("status", "active");
  }

  const { data, error } = await query.order("name", { ascending: true });

  if (error) {
    console.warn("[workspaces] getActivePackagesForSelect failed", error);
    return [];
  }
  return (
    (data ?? []) as {
      id: string;
      name: string;
      slug: string;
      publisher_id: string | null;
      status: string | null;
    }[]
  ).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    owned: p.publisher_id === userId,
    pending: (p.status ?? "") !== "active",
  }));
}
