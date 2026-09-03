import "server-only";
import { createClient } from "@/utils/supabase/server";

// A workspace (visible to the viewer) that anchors THIS package as its root,
// with the bundled package nodes (root + non-root) it groups together.
export type PackageWorkspaceMember = {
  slug: string;
  name: string;
  isRoot: boolean;
};

export type PackageWorkspace = {
  id: string;
  name: string;
  isOwn: boolean; // owned by the viewer (vs. a public workspace by someone else)
  members: PackageWorkspaceMember[];
};

type RootRow = {
  workspace_id: string;
  workspaces: { id: string; name: string; visibility: string; owner_id: string } | null;
};

type MemberRow = {
  workspace_id: string;
  is_root: boolean;
  packages: { slug: string; name: string } | null;
};

// Workspaces the VIEWER may see that are rooted at `packageId`: PUBLIC ones for
// anyone, PLUS the viewer's OWN (owner_id = viewerId) when logged in. RLS already
// restricts reads to public-or-owned, so the join naturally yields only those;
// `viewerId` just lets us flag which are the viewer's own. Fail-soft → [].
export async function getWorkspacesForPackage(
  packageId: string,
  viewerId: string | null,
): Promise<PackageWorkspace[]> {
  try {
    const supabase = await createClient();

    const { data: rootRows, error: rootErr } = await supabase
      .from("workspace_nodes")
      .select("workspace_id, workspaces!inner(id, name, visibility, owner_id)")
      .eq("package_id", packageId)
      .eq("is_root", true);

    if (rootErr || !rootRows) return [];

    const wsMeta = new Map<string, { name: string; isOwn: boolean }>();
    for (const r of rootRows as unknown as RootRow[]) {
      const ws = r.workspaces;
      if (!ws?.id) continue;
      const isOwn = viewerId !== null && ws.owner_id === viewerId;
      // RLS guarantees we only read public or own; guard anyway.
      if (ws.visibility !== "public" && !isOwn) continue;
      wsMeta.set(ws.id, { name: ws.name ?? "", isOwn });
    }
    if (wsMeta.size === 0) return [];

    const ids = [...wsMeta.keys()];
    const { data: memberRows, error: memberErr } = await supabase
      .from("workspace_nodes")
      .select("workspace_id, is_root, packages(slug, name)")
      .in("workspace_id", ids)
      .not("package_id", "is", null);

    if (memberErr) return [];

    const membersByWs = new Map<string, PackageWorkspaceMember[]>();
    for (const r of (memberRows ?? []) as unknown as MemberRow[]) {
      if (!r.packages?.slug) continue;
      const list = membersByWs.get(r.workspace_id) ?? [];
      list.push({
        slug: r.packages.slug,
        name: r.packages.name ?? "",
        isRoot: r.is_root,
      });
      membersByWs.set(r.workspace_id, list);
    }

    return ids.map((id) => {
      const meta = wsMeta.get(id)!;
      const members = (membersByWs.get(id) ?? []).sort(
        (a, b) => Number(b.isRoot) - Number(a.isRoot),
      );
      return { id, name: meta.name, isOwn: meta.isOwn, members };
    });
  } catch {
    return [];
  }
}
