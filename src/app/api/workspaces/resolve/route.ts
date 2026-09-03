import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { resolveViewerId } from "../[id]/manifest/auth";

// Normalize a version token for comparison: lowercase, no leading "v" (so 1.0
// matches v1.0 / V1.0). Mirrors how a tag (v1.2.0) and a typed version (1.2.0)
// should resolve to the same workspace.
function normVersion(v: string | null | undefined): string {
  if (!v) return "";
  return v.trim().toLowerCase().replace(/^v/, "");
}

// Resolve a "<package-slug>@<version>" identifier to the caller's workspace whose
// ROOT (PAI) node is that package pinned at that version. This is the "download
// by the root project's version" feature: a workspace IS the PAI at a version, so
// `janus@1.0` selects the workspace whose root is Janus pinned at 1.0 — letting
// project A pull janus@1.0 and project B pull janus@2.0 without juggling UUIDs.
//
// Auth: bearer token (CLI) → owner, or session → owner. Service-role lookup gated
// by owner_id so no other owner's workspace can leak.
export async function GET(request: NextRequest): Promise<NextResponse> {
  const viewerId = await resolveViewerId(request);
  if (!viewerId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ref = (request.nextUrl.searchParams.get("ref") ?? "").trim();
  const at = ref.lastIndexOf("@");
  if (at <= 0 || at === ref.length - 1) {
    return NextResponse.json(
      { error: "bad-ref", hint: "expected <package-slug>@<version>, e.g. janus@1.0" },
      { status: 400 },
    );
  }
  const slug = ref.slice(0, at).toLowerCase();
  const version = ref.slice(at + 1);

  let svc;
  try {
    svc = createServiceClient();
  } catch {
    return NextResponse.json({ error: "server-misconfigured" }, { status: 500 });
  }

  const { data: pkg } = await svc
    .from("packages")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  const packageId = (pkg as { id: string } | null)?.id;
  if (!packageId) {
    return NextResponse.json(
      { error: "not-found", reason: "no-such-package", slug },
      { status: 404 },
    );
  }

  // Root nodes (PAI) of THIS owner's workspaces bound to that package.
  const { data: rows } = await svc
    .from("workspace_nodes")
    .select("workspace_id, ref_value, workspaces!inner(id, name, owner_id)")
    .eq("is_root", true)
    .eq("package_id", packageId)
    .eq("workspaces.owner_id", viewerId);

  const matches = (
    (rows ?? []) as unknown as {
      workspace_id: string;
      ref_value: string | null;
      workspaces: { id: string; name: string };
    }[]
  ).filter((n) => normVersion(n.ref_value) === normVersion(version));

  if (matches.length === 0) {
    return NextResponse.json(
      { error: "not-found", reason: "no-workspace-for-version", slug, version },
      { status: 404 },
    );
  }
  if (matches.length > 1) {
    return NextResponse.json(
      {
        error: "ambiguous",
        candidates: matches.map((m) => ({ id: m.workspace_id, name: m.workspaces.name })),
      },
      { status: 409 },
    );
  }

  const m = matches[0];
  return NextResponse.json({ id: m.workspace_id, name: m.workspaces.name, slug, version });
}
