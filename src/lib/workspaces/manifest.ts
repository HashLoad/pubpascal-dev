// Workspace manifest v1 — pure types + mapper (ADR-072, ADR-074).
// No Supabase client, no I/O, no Date.now() / Math.random().
// `generatedAt` is injected by the route handler (AC-14).

import type { NodeRefType } from "@/lib/workspaces/types";

export type ManifestRef = { type: NodeRefType; value: string } | null;

export interface ManifestRepo {
  node_id: string;
  kind: "package" | "external";
  name: string | null;
  slug: string | null;
  clone_url: string;
  ref: ManifestRef;
  is_root: boolean;
  writable: boolean;
  push_url: string | null;
}

export interface ManifestEdge {
  from_node_id: string;
  to_node_id: string;
}

export interface WorkspaceManifest {
  schema_version: 1;
  generated_at: string;
  workspace: { id: string; name: string; description: string | null };
  viewer: { is_owner: boolean };
  repos: ManifestRepo[];
  edges: ManifestEdge[];
}

// Raw node shape as returned by the manifest query.
export type ManifestRawNode = {
  id: string;
  is_root: boolean;
  package_id: string | null;
  external_link_id: string | null;
  ref_type: string | null;
  ref_value: string | null;
  packages: {
    name: string;
    slug: string;
    repository_url: string;
    publisher_id: string;
  } | null;
};

// Owner-path link fields (only selected by getWorkspaceManifestData when isOwner).
export type OwnerLinkFields = {
  upstream_url: string;
  fork_url: string | null;
  write_target: "fork" | "none";
  label: string;
};

// Non-owner path — upstream_url only (ADR-074, BR3).
export type NonOwnerLinkFields = {
  upstream_url: string;
};

export type ManifestInput = {
  workspace: { id: string; name: string; description: string | null };
  rawNodes: ManifestRawNode[];
  edges: Array<{ from_node_id: string; to_node_id: string }>;
  isOwner: boolean;
  // The authenticated viewer's id (null when anonymous). A package node whose
  // publisher IS the viewer is writable (push straight to its origin).
  viewerId: string | null;
  // Key: external_link_id. Owner gets full fields; non-owner gets upstream only.
  linkMap: Map<string, OwnerLinkFields | NonOwnerLinkFields>;
  generatedAt: string;
};

function buildRef(ref_type: string | null, ref_value: string | null): ManifestRef {
  if (ref_type !== null && ref_value !== null) {
    return { type: ref_type as NodeRefType, value: ref_value };
  }
  return null;
}

// Per-node projection — branches on (kind, isOwner, write_target) per ADR-074.
// CCN ≤ 10: the package arm and external arm are each simple; owner vs non-owner
// is a single conditional inside the external arm.
function toManifestRepo(
  node: ManifestRawNode,
  isOwner: boolean,
  viewerId: string | null,
  linkMap: Map<string, OwnerLinkFields | NonOwnerLinkFields>,
): ManifestRepo {
  const ref = buildRef(node.ref_type, node.ref_value);

  // Package arm. A package YOU publish (publisher === viewer) is writable: push
  // goes straight to its origin (repository_url) so you can co-develop your own
  // dependencies. A third-party package stays read-only (fork-link to push).
  if (node.external_link_id === null) {
    const repoUrl = node.packages?.repository_url ?? "";
    const ownedByViewer =
      isOwner &&
      viewerId !== null &&
      node.packages != null &&
      node.packages.publisher_id === viewerId;
    return {
      node_id: node.id,
      kind: "package",
      name: node.packages?.name ?? null,
      slug: node.packages?.slug ?? null,
      clone_url: repoUrl,
      ref,
      is_root: node.is_root,
      writable: ownedByViewer,
      push_url: ownedByViewer ? repoUrl : null,
    };
  }

  // External arm — resolve per viewer.
  const linkFields = linkMap.get(node.external_link_id);

  if (isOwner) {
    // Owner path: full fields present (ADR-074 rows 2 & 3).
    const owner = linkFields as OwnerLinkFields | undefined;
    const upstream = owner?.upstream_url ?? "";
    const label = owner?.label ?? null;
    const isFork = owner?.write_target === "fork";

    return {
      node_id: node.id,
      kind: "external",
      name: label,
      slug: null,
      clone_url: upstream,
      ref,
      is_root: node.is_root,
      writable: isFork,
      push_url: isFork ? (owner?.fork_url ?? null) : null,
    };
  }

  // Non-owner public path: upstream only (ADR-074 row 4, BR3).
  const nonOwner = linkFields as NonOwnerLinkFields | undefined;
  return {
    node_id: node.id,
    kind: "external",
    name: null,
    slug: null,
    clone_url: nonOwner?.upstream_url ?? "",
    ref,
    is_root: node.is_root,
    writable: false,
    push_url: null,
  };
}

// Pure mapper — no I/O, no Date.now(), deterministic (AC-14).
export function buildManifest(input: ManifestInput): WorkspaceManifest {
  const { workspace, rawNodes, edges, isOwner, viewerId, linkMap, generatedAt } = input;

  const repos: ManifestRepo[] = rawNodes.map((node) =>
    toManifestRepo(node, isOwner, viewerId, linkMap),
  );

  const manifestEdges: ManifestEdge[] = edges.map((e) => ({
    from_node_id: e.from_node_id,
    to_node_id: e.to_node_id,
  }));

  return {
    schema_version: 1,
    generated_at: generatedAt,
    workspace: {
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
    },
    viewer: { is_owner: isOwner },
    repos,
    edges: manifestEdges,
  };
}
