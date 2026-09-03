import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { fetchGithubVersions } from "@/app/[lang]/packages/[slug]/github";

// Real git tags/releases for a package's repo, for the workspace builder's
// version picker. Authenticated-only (used in the owner editor); resolves the
// package by slug under RLS (active packages OR the caller's own), then returns
// the GitHub tag names. Non-GitHub repos → empty list, so the UI falls back to
// a free-form input. Versions are 1h-cached at the fetch layer.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ versions: [] }, { status: 401 });
  }

  // RLS gates row visibility (active OR own); no explicit status filter needed.
  const { data: pkg } = await supabase
    .from("packages")
    .select("repository_url")
    .eq("slug", slug)
    .maybeSingle();

  const repoUrl = (pkg as { repository_url: string | null } | null)?.repository_url;
  if (!repoUrl) {
    return NextResponse.json({ versions: [] });
  }

  const rows = await fetchGithubVersions(repoUrl);
  const versions = (rows ?? [])
    .map((r) => r.version)
    .filter((v) => v && v !== "—");

  return NextResponse.json({ versions });
}
