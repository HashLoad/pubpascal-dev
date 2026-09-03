"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isUuid } from "@/utils/queries/admin-submissions";
import { getRequestLocale } from "@/utils/locale";
import { getDictionary, type Dictionary } from "@/app/[lang]/dictionaries";
import { fetchGithubRaw } from "@/app/[lang]/packages/[slug]/github";
import type { WorkspaceVisibility, NodeRefType } from "@/lib/workspaces/types";

export type WorkspaceFormState = { error?: string };
export type NodeEdgeFormState = { error?: string };
export type LinkFormState = { error?: string };
export type BossImportState = {
  error?: string;
  imported?: number;
  skipped?: number;
  alreadyPresent?: number;
};

type WorkspaceErrors = Dictionary["workspaces"]["errors"];
type WorkspaceNodesDict = Dictionary["workspaces"]["nodes"];
type WorkspaceEdgesDict = Dictionary["workspaces"]["edges"];

// Bounds mirror the DB CHECKs in the Demand-1/3 migration (name 1..120,
// description <= 2000, visibility in {private,public}).
const NAME_MAX = 120;
const DESCRIPTION_MAX = 2000;
const VISIBILITIES: readonly WorkspaceVisibility[] = ["private", "public"];

type WorkspaceInput = {
  name: string;
  description: string | null;
  visibility: WorkspaceVisibility;
};

// Parse + validate the shared create/edit fields. Name required + trimmed (BR4);
// blank description → null; visibility defaults to 'private' (BR5).
function parseWorkspace(
  formData: FormData,
  msgs: WorkspaceErrors,
): WorkspaceInput | { error: string } {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length === 0 || name.length > NAME_MAX) return { error: msgs.name };

  const description = String(formData.get("description") ?? "").trim();
  if (description.length > DESCRIPTION_MAX) return { error: msgs.description };

  const visibility = String(formData.get("visibility") ?? "private");
  if (!VISIBILITIES.includes(visibility as WorkspaceVisibility)) {
    return { error: msgs.visibility };
  }

  return {
    name,
    description: description.length > 0 ? description : null,
    visibility: visibility as WorkspaceVisibility,
  };
}

export async function createWorkspace(
  _prev: WorkspaceFormState,
  formData: FormData,
): Promise<WorkspaceFormState> {
  const msgs = (await getDictionary(await getRequestLocale())).workspaces.errors;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile/workspaces");

  const parsed = parseWorkspace(formData, msgs);
  if ("error" in parsed) return { error: parsed.error };

  // owner_id always stamped server-side; never trust a client-supplied owner (BR1/BR3).
  // Read back the inserted id so the create flow can land on the new workspace's editor.
  const { data, error } = await supabase
    .from("workspaces")
    .insert({ ...parsed, owner_id: user.id })
    .select("id")
    .single();

  if (error) {
    console.warn("[workspaces] create failed", error);
    return { error: msgs.saveFailed };
  }

  // Root (PAI) package optionally picked at creation: now that the workspace id
  // exists, create the root node so the editor opens with the PAI already placed.
  const rootPackageId = String(formData.get("root_package_id") ?? "").trim();
  if (data?.id && rootPackageId.length > 0 && isUuid(rootPackageId)) {
    await ensureRootPackage(supabase, data.id, rootPackageId);
  }

  revalidatePath("/profile/workspaces");
  // Success → graph-first editor of the just-created workspace; fail soft to the
  // list if the id is somehow unreadable (BR3, AC-08).
  redirect(data?.id ? `/profile/workspaces/${data.id}/edit` : "/profile/workspaces");
}

export async function updateWorkspace(
  _prev: WorkspaceFormState,
  formData: FormData,
): Promise<WorkspaceFormState> {
  const msgs = (await getDictionary(await getRequestLocale())).workspaces.errors;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile/workspaces");

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { error: msgs.id };

  const parsed = parseWorkspace(formData, msgs);
  if ("error" in parsed) return { error: parsed.error };

  // Owner-scoped update; a foreign/unknown id matches no row (safe no-op, BR3).
  const { error } = await supabase
    .from("workspaces")
    .update(parsed)
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    console.warn("[workspaces] update failed", error);
    return { error: msgs.saveFailed };
  }

  // Root (PAI) package picked in the header: ensure that package is a node and
  // mark it the workspace root. A workspace is centred on its PAI, so it's chosen
  // here, then dependencies are added in the canvas. Empty selection is a no-op
  // (it never clears an existing root — which may be an external-link node the
  // package <select> can't represent; clearing/changing it is done in the canvas).
  const rootPackageId = String(formData.get("root_package_id") ?? "").trim();
  if (rootPackageId.length > 0 && isUuid(rootPackageId)) {
    await ensureRootPackage(supabase, id, rootPackageId);
  }

  revalidatePath("/profile/workspaces");
  revalidatePath(`/profile/workspaces/${id}/edit`);
  // Stay on the editor so the canvas reflects the new root and deps can be added
  // right away (the PAI-then-dependencies flow).
  redirect(`/profile/workspaces/${id}/edit`);
}

// Ensure `packageId` is a node of the workspace and is the (single) root. Creates
// the node with no ref (default branch) if absent. Owner scope already verified
// by the workspace update above. Fail-soft: a missing root just isn't set.
async function ensureRootPackage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  packageId: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from("workspace_nodes")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("package_id", packageId)
    .maybeSingle();

  let nodeId = (existing as { id: string } | null)?.id ?? null;
  if (!nodeId) {
    const { data: inserted, error } = await supabase
      .from("workspace_nodes")
      .insert({
        workspace_id: workspaceId,
        package_id: packageId,
        external_link_id: null,
        ref_type: null,
        ref_value: null,
        is_root: false,
      })
      .select("id")
      .single();
    if (error) {
      console.warn("[workspaces] ensureRootPackage insert failed", error);
      return;
    }
    nodeId = (inserted as { id: string } | null)?.id ?? null;
  }

  if (nodeId) {
    await markNodeAsRoot(supabase, workspaceId, nodeId);
  }
}

// Make `nodeId` the single root of the workspace WITHOUT the
// set_workspace_root_node RPC (which is operator-deferred in some environments —
// debt #65). Clear every node's flag, then set the one. Two steps keep the
// single-root partial unique index satisfied (≤1 true at any committed point).
async function markNodeAsRoot(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  nodeId: string,
): Promise<void> {
  const cleared = await supabase
    .from("workspace_nodes")
    .update({ is_root: false })
    .eq("workspace_id", workspaceId);
  if (cleared.error) {
    console.warn("[workspaces] markNodeAsRoot clear failed", cleared.error);
    return;
  }
  const set = await supabase
    .from("workspace_nodes")
    .update({ is_root: true })
    .eq("id", nodeId)
    .eq("workspace_id", workspaceId);
  if (set.error) console.warn("[workspaces] markNodeAsRoot set failed", set.error);
}

export async function deleteWorkspace(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile/workspaces");

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) redirect("/profile/workspaces");

  // Owner-scoped delete; cascades to nodes/edges per the schema. A foreign/unknown
  // id matches no row (safe no-op, BR3/BR6).
  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) console.warn("[workspaces] delete failed", error);

  revalidatePath("/profile/workspaces");
  redirect("/profile/workspaces");
}

const REF_TYPES: readonly NodeRefType[] = ["branch", "tag", "version"];

// Canvas position (UI-only). Both coordinates present + finite, or both null.
function parsePosition(formData: FormData): { x: number | null; y: number | null } {
  const rawX = formData.get("position_x");
  const rawY = formData.get("position_y");
  if (rawX === null || rawY === null) return { x: null, y: null };
  const x = Number(rawX);
  const y = Number(rawY);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { x: null, y: null };
  return { x, y };
}

// Persist a node's position into the satellite (fail-soft — a missing position
// table or absent id never fails the node add; the canvas auto-layouts instead).
async function savePosition(
  supabase: Awaited<ReturnType<typeof createClient>>,
  nodeId: string | null | undefined,
  pos: { x: number | null; y: number | null },
): Promise<void> {
  if (!nodeId || pos.x === null || pos.y === null) return;
  const { error } = await supabase
    .from("workspace_node_positions")
    .upsert(
      { node_id: nodeId, position_x: pos.x, position_y: pos.y, updated_at: new Date().toISOString() },
      { onConflict: "node_id" },
    );
  if (error) console.warn("[workspaces] savePosition failed", error);
}

// Verify workspace belongs to the authenticated user; returns null when not owned.
async function verifyWorkspaceOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("owner_id", userId)
    .maybeSingle();
  return data !== null;
}

export async function addWorkspaceNode(
  _prev: NodeEdgeFormState,
  formData: FormData,
): Promise<NodeEdgeFormState> {
  const dict = await getDictionary(await getRequestLocale());
  const msgs: WorkspaceNodesDict = dict.workspaces.nodes;
  const errs = dict.workspaces.errors;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile/workspaces");

  const workspaceId = String(formData.get("workspace_id") ?? "");
  if (!isUuid(workspaceId)) return { error: msgs.addNodeError };

  // Ref pin is OPTIONAL — the schema allows both ref columns null ("track the
  // default branch"), and the CLI clones the default branch when no ref is
  // present. The drag-drop graph builder adds a node with no ref (pin it later);
  // the Add-Node popup always sends one. Co-presence rule mirrors the DB CHECK:
  // both set, or both empty.
  const rawRefType = String(formData.get("ref_type") ?? "").trim();
  const rawRefValue = String(formData.get("ref_value") ?? "").trim();
  let refType: NodeRefType | null = null;
  let refValue: string | null = null;
  if (rawRefType.length > 0 || rawRefValue.length > 0) {
    if (!REF_TYPES.includes(rawRefType as NodeRefType) || rawRefValue.length === 0)
      return { error: msgs.addNodeError };
    refType = rawRefType as NodeRefType;
    refValue = rawRefValue;
  }

  const owned = await verifyWorkspaceOwnership(supabase, workspaceId, user.id);
  if (!owned) return { error: msgs.addNodeError };

  // Optional drop position from the canvas (UI-only; the CLI manifest ignores
  // it). Both present or both absent — a malformed pair is dropped to null.
  const position = parsePosition(formData);

  // ADR-061: target_kind discriminator — 'package' (default) | 'external'.
  // Backward-safe: absent or 'package' target_kind behaves as before.
  const targetKind = String(formData.get("target_kind") ?? "package");

  if (targetKind === "external") {
    // External arm: validate link ownership before insert (BR-L3, AC-03).
    const externalLinkId = String(formData.get("external_link_id") ?? "");
    if (!isUuid(externalLinkId)) return { error: msgs.addNodeError };

    // Ownership pre-check (BR-L3): verify the link is owned by the acting user.
    // Defense-in-depth — RLS also blocks foreign reads, but this gives a
    // localized, user-facing error (nodeLinkNotOwned) rather than a raw DB error.
    const { data: linkRow } = await supabase
      .from("external_repo_links")
      .select("id")
      .eq("id", externalLinkId)
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!linkRow) {
      return { error: errs.nodeLinkNotOwned };
    }

    // XOR: set external_link_id, null package_id (BR-L4, AC-02).
    const { data: inserted, error } = await supabase
      .from("workspace_nodes")
      .insert({
        workspace_id: workspaceId,
        package_id: null,
        external_link_id: externalLinkId,
        ref_type: refType,
        ref_value: refValue,
        is_root: false,
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[workspaces] addWorkspaceNode (external) failed", error);
      if (
        error.code === "23505" ||
        error.message?.toLowerCase().includes("duplicate") ||
        error.message?.toLowerCase().includes("unique")
      ) {
        return { error: msgs.duplicateNodeError };
      }
      return { error: msgs.addNodeError };
    }
    await savePosition(supabase, inserted?.id, position);
  } else {
    // Package arm (default — backward-safe): set package_id, null external_link_id (BR-L4, AC-02).
    const packageId = String(formData.get("package_id") ?? "");
    if (!isUuid(packageId)) return { error: msgs.addNodeError };

    const { data: inserted, error } = await supabase
      .from("workspace_nodes")
      .insert({
        workspace_id: workspaceId,
        package_id: packageId,
        external_link_id: null,
        ref_type: refType,
        ref_value: refValue,
        is_root: false,
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[workspaces] addWorkspaceNode (package) failed", error);
      // Unique index on (workspace_id, package_id) → duplicate-node error (BR-004).
      if (
        error.code === "23505" ||
        error.message?.toLowerCase().includes("duplicate") ||
        error.message?.toLowerCase().includes("unique")
      ) {
        return { error: msgs.duplicateNodeError };
      }
      return { error: msgs.addNodeError };
    }
    await savePosition(supabase, inserted?.id, position);
  }

  revalidatePath(`/profile/workspaces/${workspaceId}/edit`);
  return {};
}

// Link field length bounds mirror the DB CHECKs in the Demand-1/2 migration.
const LABEL_MAX = 120;
const URL_MAX = 2000;
const WRITE_TARGETS = ["fork", "none"] as const;

// Create an external_repo_links row for the authenticated user (ADR-062, AC-04..06).
// owner_id is always stamped server-side — never trust a client-supplied owner (BR-L2).
export async function createExternalRepoLink(
  _prev: LinkFormState,
  formData: FormData,
): Promise<LinkFormState> {
  const dict = await getDictionary(await getRequestLocale());
  const errs = dict.workspaces.errors;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile/workspaces");

  // Validate label (1..120, required).
  const label = String(formData.get("label") ?? "").trim();
  if (label.length === 0 || label.length > LABEL_MAX) return { error: errs.linkLabel };

  // Validate upstream_url (1..2000, required).
  const upstreamUrl = String(formData.get("upstream_url") ?? "").trim();
  if (upstreamUrl.length === 0 || upstreamUrl.length > URL_MAX) return { error: errs.linkUpstream };

  // Validate write_target in {fork, none}.
  const writeTarget = String(formData.get("write_target") ?? "none");
  if (!WRITE_TARGETS.includes(writeTarget as "fork" | "none")) return { error: errs.linkWriteTarget };

  // fork_url: optional, blank → null, max 2000.
  const forkUrlRaw = String(formData.get("fork_url") ?? "").trim();
  const forkUrl = forkUrlRaw.length > 0 ? forkUrlRaw : null;
  if (forkUrl && forkUrl.length > URL_MAX) return { error: errs.linkUpstream };

  // BR-L7: write_target='fork' requires non-empty fork_url (mirrors DB CHECK).
  if (writeTarget === "fork" && !forkUrl) return { error: errs.linkForkRequired };

  // owner_id stamped server-side (BR-L2, AC-04).
  const { error } = await supabase.from("external_repo_links").insert({
    owner_id: user.id,
    label,
    upstream_url: upstreamUrl,
    fork_url: forkUrl,
    write_target: writeTarget,
  });

  if (error) {
    console.warn("[workspaces] createExternalRepoLink failed", error);
    return { error: errs.linkSaveFailed };
  }

  // Workspace id is passed as a hidden field so we can revalidate the editor path.
  const workspaceId = String(formData.get("workspace_id") ?? "");
  if (isUuid(workspaceId)) {
    revalidatePath(`/profile/workspaces/${workspaceId}/edit`);
  }
  revalidatePath("/profile/workspaces");
  return {};
}

// Delete an owner-scoped external_repo_links row (ADR-062, AC-07).
// Owner-scoped DELETE with .eq("owner_id", user.id) defense-in-depth.
// A foreign/unknown id matches no row — safe no-op (AC-07).
// FK ON DELETE CASCADE unbinds any node bound to the deleted link (BR-L8).
export async function deleteExternalRepoLink(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile/workspaces");

  const linkId = String(formData.get("link_id") ?? "");
  if (!isUuid(linkId)) return;

  // Owner-scoped DELETE — foreign/unknown id is a safe no-op (AC-07).
  const { error } = await supabase
    .from("external_repo_links")
    .delete()
    .eq("id", linkId)
    .eq("owner_id", user.id);

  if (error) console.warn("[workspaces] deleteExternalRepoLink failed", error);

  const workspaceId = String(formData.get("workspace_id") ?? "");
  if (isUuid(workspaceId)) {
    revalidatePath(`/profile/workspaces/${workspaceId}/edit`);
  }
  revalidatePath("/profile/workspaces");
}

export async function removeWorkspaceNode(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile/workspaces");

  const nodeId = String(formData.get("node_id") ?? "");
  const workspaceId = String(formData.get("workspace_id") ?? "");
  if (!isUuid(nodeId) || !isUuid(workspaceId)) return;

  const owned = await verifyWorkspaceOwnership(supabase, workspaceId, user.id);
  if (!owned) return;

  // DB ON DELETE CASCADE removes incident edges (BR-008).
  const { error } = await supabase
    .from("workspace_nodes")
    .delete()
    .eq("id", nodeId)
    .eq("workspace_id", workspaceId);

  if (error) console.warn("[workspaces] removeWorkspaceNode failed", error);

  revalidatePath(`/profile/workspaces/${workspaceId}/edit`);
}

export async function setRootNode(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile/workspaces");

  const nodeId = String(formData.get("node_id") ?? "");
  const workspaceId = String(formData.get("workspace_id") ?? "");
  if (!isUuid(nodeId) || !isUuid(workspaceId)) return;

  const owned = await verifyWorkspaceOwnership(supabase, workspaceId, user.id);
  if (!owned) return;

  // Direct two-step update (clear all, set one) — no set_workspace_root_node RPC,
  // which is operator-deferred in some environments (debt #65). Robust whether or
  // not the function exists in the live DB.
  await markNodeAsRoot(supabase, workspaceId, nodeId);

  revalidatePath(`/profile/workspaces/${workspaceId}/edit`);
}

// Persist a node's canvas position after a drag (UI-only — invisible to the CLI
// manifest). Owner-scoped; silent no-op on any failure (a missed position save
// never blocks the builder).
export async function updateNodePosition(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const nodeId = String(formData.get("node_id") ?? "");
  const workspaceId = String(formData.get("workspace_id") ?? "");
  if (!isUuid(nodeId) || !isUuid(workspaceId)) return;

  const pos = parsePosition(formData);
  if (pos.x === null || pos.y === null) return;

  const owned = await verifyWorkspaceOwnership(supabase, workspaceId, user.id);
  if (!owned) return;

  // Upsert into the position satellite (fail-soft).
  await savePosition(supabase, nodeId, pos);
  // No revalidatePath: the client already holds the dragged position; a refresh
  // would just re-fetch the same value and fight the in-flight drag.
}

// Re-pin (or clear) a node's git ref inline on the canvas. An empty ref pair
// clears the pin → tracks the default branch (the CLI clones default when no
// ref is present). Co-presence mirrors the DB CHECK. Owner-scoped, fail-soft.
export async function updateNodeRef(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile/workspaces");

  const nodeId = String(formData.get("node_id") ?? "");
  const workspaceId = String(formData.get("workspace_id") ?? "");
  if (!isUuid(nodeId) || !isUuid(workspaceId)) return;

  const rawRefType = String(formData.get("ref_type") ?? "").trim();
  const rawRefValue = String(formData.get("ref_value") ?? "").trim();
  let refType: NodeRefType | null = null;
  let refValue: string | null = null;
  if (rawRefType.length > 0 || rawRefValue.length > 0) {
    if (!REF_TYPES.includes(rawRefType as NodeRefType) || rawRefValue.length === 0) return;
    refType = rawRefType as NodeRefType;
    refValue = rawRefValue;
  }

  const owned = await verifyWorkspaceOwnership(supabase, workspaceId, user.id);
  if (!owned) return;

  const { error } = await supabase
    .from("workspace_nodes")
    .update({ ref_type: refType, ref_value: refValue })
    .eq("id", nodeId)
    .eq("workspace_id", workspaceId);

  if (error) console.warn("[workspaces] updateNodeRef failed", error);

  revalidatePath(`/profile/workspaces/${workspaceId}/edit`);
}

export async function addWorkspaceEdge(
  _prev: NodeEdgeFormState,
  formData: FormData,
): Promise<NodeEdgeFormState> {
  const dict = await getDictionary(await getRequestLocale());
  const msgs: WorkspaceEdgesDict = dict.workspaces.edges;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile/workspaces");

  const workspaceId = String(formData.get("workspace_id") ?? "");
  const fromNodeId = String(formData.get("from_node_id") ?? "");
  const toNodeId = String(formData.get("to_node_id") ?? "");

  if (!isUuid(workspaceId) || !isUuid(fromNodeId) || !isUuid(toNodeId))
    return { error: msgs.addEdgeError };

  const owned = await verifyWorkspaceOwnership(supabase, workspaceId, user.id);
  if (!owned) return { error: msgs.addEdgeError };

  const { error } = await supabase.from("workspace_edges").insert({
    workspace_id: workspaceId,
    from_node_id: fromNodeId,
    to_node_id: toNodeId,
  });

  if (error) {
    console.warn("[workspaces] addWorkspaceEdge failed", error);
    // ADR-056: check both message and details for the "cycle" keyword.
    const isCycle =
      error.message?.toLowerCase().includes("cycle") ||
      (error.details as string | undefined)?.toLowerCase().includes("cycle");
    return { error: isCycle ? msgs.cyclicDependencyError : msgs.addEdgeError };
  }

  revalidatePath(`/profile/workspaces/${workspaceId}/edit`);
  return {};
}

export async function removeWorkspaceEdge(
  formData: FormData,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile/workspaces");

  const edgeId = String(formData.get("edge_id") ?? "");
  const workspaceId = String(formData.get("workspace_id") ?? "");
  if (!isUuid(edgeId) || !isUuid(workspaceId)) return;

  const owned = await verifyWorkspaceOwnership(supabase, workspaceId, user.id);
  if (!owned) return;

  const { error } = await supabase
    .from("workspace_edges")
    .delete()
    .eq("id", edgeId)
    .eq("workspace_id", workspaceId);

  if (error) console.warn("[workspaces] removeWorkspaceEdge failed", error);

  revalidatePath(`/profile/workspaces/${workspaceId}/edit`);
}

// Normalize a git repo URL or a boss.json "host/owner/repo" dependency key to a
// comparable token: lowercase, no protocol, no `git@`, no `.git`, no trailing /.
function normalizeRepoKey(url: string): string {
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^git@/, "")
    .replace(/:/g, "/")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
}

// Host-agnostic repo identity: the last two path segments (owner/repo). Lets a
// pubpascal.json dep key ("owner/repo") and a boss.json key ("host/owner/repo")
// both match a package's repository_url.
function repoSlug(url: string): string {
  const parts = normalizeRepoKey(url).split("/").filter(Boolean);
  return parts.length >= 2 ? parts.slice(-2).join("/") : parts.join("/");
}

// Presence check for the "Import dependencies" button: does the root (PAI) repo
// publish a manifest we can import from — our pubpascal.json, or (during
// migration) a boss.json? Gates the button so it is offered only when there is
// something to import. Metadata-only: raw fetch, no clone.
export async function checkManifestAvailable(workspaceId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isUuid(workspaceId)) return false;

  const owned = await verifyWorkspaceOwnership(supabase, workspaceId, user.id);
  if (!owned) return false;

  const { data: rootRow } = await supabase
    .from("workspace_nodes")
    .select("packages(repository_url)")
    .eq("workspace_id", workspaceId)
    .eq("is_root", true)
    .maybeSingle();
  const repo = (
    rootRow as { packages: { repository_url: string | null } | null } | null
  )?.packages?.repository_url;
  if (!repo) return false;

  // Prefer our own manifest (pubpascal.json); fall back to boss.json during
  // migration.
  if ((await fetchGithubRaw(repo, "pubpascal.json")).ok) return true;
  const boss = await fetchGithubRaw(repo, "boss.json");
  return boss.ok;
}

// Import the root (PAI) repo's declared dependencies into the workspace graph.
// Reads them from OUR manifest (pubpascal.json) when present, else from boss.json
// during migration; matches each to a published package by repository_url; creates
// the dependency node (pinned to the declared version) and wires root → dep. Deps
// with no matching published package are skipped. Metadata-only: the manifest is
// fetched from GitHub raw; the portal never clones.
export async function importManifestDependencies(
  workspaceId: string,
): Promise<BossImportState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthorized" };
  if (!isUuid(workspaceId)) return { error: "bad-id" };

  const owned = await verifyWorkspaceOwnership(supabase, workspaceId, user.id);
  if (!owned) return { error: "not-owned" };

  // Root node + its package repository_url.
  const { data: rootRow } = await supabase
    .from("workspace_nodes")
    .select("id, package_id, packages(repository_url)")
    .eq("workspace_id", workspaceId)
    .eq("is_root", true)
    .maybeSingle();
  const rootNode = rootRow as {
    id: string;
    package_id: string | null;
    packages: { repository_url: string | null } | null;
  } | null;
  if (!rootNode?.id || !rootNode.package_id || !rootNode.packages?.repository_url) {
    return { error: "no-root-package" };
  }

  // Resolve the root's declared dependencies — prefer OUR manifest
  // (pubpascal.json), fall back to boss.json during migration. Both expose
  // `dependencies` as { "<repo-key>": "<version>" }; repoSlug() matches either
  // key shape ("owner/repo" or "host/owner/repo").
  const repoUrl = rootNode.packages.repository_url;
  let deps: Record<string, string>;
  const pd = await fetchGithubRaw(repoUrl, "pubpascal.json");
  if (pd.ok) {
    try {
      const manifest = JSON.parse(pd.body) as { dependencies?: Record<string, string> };
      deps = manifest.dependencies ?? {};
    } catch {
      return { error: "bad-manifest" };
    }
  } else {
    const boss = await fetchGithubRaw(repoUrl, "boss.json");
    if (!boss.ok) return { error: "no-boss" };
    try {
      const parsed = JSON.parse(boss.body) as { dependencies?: Record<string, string> };
      deps = parsed.dependencies ?? {};
    } catch {
      return { error: "bad-boss" };
    }
  }
  const depKeys = Object.keys(deps);
  if (depKeys.length === 0) return { imported: 0, skipped: 0, alreadyPresent: 0 };

  // Active packages indexed by host-agnostic repo slug (owner/repo).
  const { data: pkgRows } = await supabase
    .from("packages")
    .select("id, repository_url")
    .eq("status", "active");
  const byRepo = new Map<string, string>();
  for (const p of (pkgRows ?? []) as { id: string; repository_url: string | null }[]) {
    if (p.repository_url) byRepo.set(repoSlug(p.repository_url), p.id);
  }

  // Existing nodes (avoid duplicate inserts).
  const { data: existing } = await supabase
    .from("workspace_nodes")
    .select("id, package_id")
    .eq("workspace_id", workspaceId);
  const nodeByPkg = new Map<string, string>();
  for (const n of (existing ?? []) as { id: string; package_id: string | null }[]) {
    if (n.package_id) nodeByPkg.set(n.package_id, n.id);
  }

  let imported = 0;
  let skipped = 0;
  let alreadyPresent = 0;

  for (const key of depKeys) {
    const pkgId = byRepo.get(repoSlug(key));
    if (!pkgId || pkgId === rootNode.package_id) {
      if (!pkgId) skipped++;
      continue;
    }

    // Ensure the dependency node exists.
    let depNodeId = nodeByPkg.get(pkgId) ?? null;
    if (!depNodeId) {
      const version = (deps[key] ?? "").trim();
      const { data: inserted, error } = await supabase
        .from("workspace_nodes")
        .insert({
          workspace_id: workspaceId,
          package_id: pkgId,
          external_link_id: null,
          ref_type: version.length > 0 ? "version" : null,
          ref_value: version.length > 0 ? version : null,
          is_root: false,
        })
        .select("id")
        .single();
      if (error) {
        skipped++;
        continue;
      }
      depNodeId = (inserted as { id: string } | null)?.id ?? null;
      if (depNodeId) nodeByPkg.set(pkgId, depNodeId);
    }
    if (!depNodeId) {
      skipped++;
      continue;
    }

    // Wire root → dep (unique constraint / cycle trigger guard against dupes).
    const { error: edgeErr } = await supabase.from("workspace_edges").insert({
      workspace_id: workspaceId,
      from_node_id: rootNode.id,
      to_node_id: depNodeId,
    });
    if (edgeErr) {
      if (
        edgeErr.code === "23505" ||
        /duplicate|unique/i.test(edgeErr.message ?? "")
      ) {
        alreadyPresent++;
      } else {
        skipped++;
      }
    } else {
      imported++;
    }
  }

  revalidatePath(`/profile/workspaces/${workspaceId}/edit`);
  return { imported, skipped, alreadyPresent };
}
