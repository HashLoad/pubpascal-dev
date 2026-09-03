// GET /api/packages/[slug]/resolve — resolve a published package to the data the
// CLI (`pp pkg add`) needs to fetch it: the git repo URL + the available versions
// (real git tags). Public catalog data: only ACTIVE packages are visible, so this
// works for the headless CLI without a session (a bearer may be sent but isn't
// required to read public package metadata). Versions are 1h-cached at the fetch
// layer. Non-GitHub repos return an empty version list (the CLI clones the
// default branch then).
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { fetchGithubVersions } from "@/app/[lang]/packages/[slug]/github";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const { slug } = await params;

  const supabase = await createClient();
  // Active packages are world-readable (the catalog is public), so the anon
  // client resolves them without a session. status='active' gates visibility.
  const { data: pkg } = await supabase
    .from("packages")
    .select("name, slug, repository_url")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  const row = pkg as
    | { name: string; slug: string; repository_url: string | null }
    | null;
  if (!row || !row.repository_url) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const rows = await fetchGithubVersions(row.repository_url);
  const versions = (rows ?? [])
    .map((r) => r.version)
    .filter((v) => v && v !== "—");

  return NextResponse.json(
    {
      name: row.name,
      slug: row.slug,
      repository_url: row.repository_url,
      versions,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
