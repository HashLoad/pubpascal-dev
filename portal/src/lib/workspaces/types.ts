// Workspace graph — type contract (Epic 1/6 — Demand 1/3, ESP-002).
//
// Row shapes for the three tables created in
// `supabase/migrations/20260531000000_workspaces_schema.sql`:
// workspaces / workspace_nodes / workspace_edges. The next demands (CRUD UI 2/3,
// form editor 3/3) import these.
//
// Pure types only: no Supabase client, no `server-only`, no `src/app/**` import.

// workspaces.visibility — owner-only ('private') vs world-readable ('public').
export type WorkspaceVisibility = "private" | "public";

// workspace_nodes.ref_type — the kind of git ref a node pins.
export type NodeRefType = "branch" | "tag" | "version";

// public.workspaces row (ADR-046).
export interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  visibility: WorkspaceVisibility;
  created_at: string;
  updated_at: string;
}

// Target XOR (ADR-047, BR2): a node references exactly one of package_id /
// external_link_id — never both, never neither. The DB CHECK enforces it at the
// data layer; this union enforces it at the type layer.
export type WorkspaceNodeTarget =
  | { package_id: string; external_link_id: null }
  | { package_id: null; external_link_id: string };

// Ref-pin co-presence (BR3): both fields set, or both null (null pair = track
// default branch). Mirrors the DB CHECK at the type layer.
export type WorkspaceNodeRefPin =
  | { ref_type: NodeRefType; ref_value: string }
  | { ref_type: null; ref_value: null };

// public.workspace_nodes row (ADR-046/ADR-047). Base columns intersected with the
// target XOR and the ref-pin co-presence unions, so an invalid combination is a
// compile error rather than only a runtime CHECK failure.
export type WorkspaceNode = {
  id: string;
  workspace_id: string;
  is_root: boolean;
  created_at: string;
  updated_at: string;
} & WorkspaceNodeTarget &
  WorkspaceNodeRefPin;

// public.workspace_edges row (ADR-046). Directed edge between two nodes of the
// same workspace; the DAG (no cycle, no cross-workspace) is guarded by the
// `workspace_edges_prevent_cycle` trigger, not expressible here.
export interface WorkspaceEdge {
  id: string;
  workspace_id: string;
  from_node_id: string;
  to_node_id: string;
  created_at: string;
}

// Sanitized public projection types (ADR-065, RN-006).
//
// These types represent the shape visible to a NON-OWNER viewing a public
// workspace. They intentionally omit fork_url, label, and write_target — the
// omission is a compile-time guarantee of the RN-006 privacy rule (ADR-064).
// An external node carries ONLY upstream_url; any attempt to attach fork_url
// is a compile error.
//
// PublicWorkspaceNode is a discriminated union so the renderer can narrow on kind.
export type PublicWorkspaceNode =
  | { kind: "package"; package: { name: string; slug: string } }
  | { kind: "external"; upstream_url: string };

// PublicWorkspaceView: sanitized read model returned by getPublicWorkspaceView.
// nodes is an array of sanitized nodes (no fork/label/write_target anywhere).
// edges reuse WorkspaceEdge — edges are node-id pairs and contain no link data.
export type PublicWorkspaceView = {
  workspace: { id: string; name: string; description: string | null };
  nodes: PublicWorkspaceNode[];
  edges: WorkspaceEdge[];
};

// external_repo_links.write_target — push-routing hint (ADR-057, BR2).
export type ExternalRepoWriteTarget = "fork" | "none";

// public.external_repo_links row (ADR-057, ADR-060).
// Discriminated union mirrors the BR3 CHECK: write_target:'fork' requires
// fork_url non-null; write_target:'none' allows fork_url to be null.
export type ExternalRepoLink = {
  id: string;
  owner_id: string;
  label: string;
  upstream_url: string;
  created_at: string;
  updated_at: string;
} & (
  | { write_target: "fork"; fork_url: string }
  | { write_target: "none"; fork_url: string | null }
);
