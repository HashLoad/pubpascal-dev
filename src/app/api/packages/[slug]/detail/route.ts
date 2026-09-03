// GET /api/packages/[slug]/detail — public package "detail" payload for the IDE
// plugin (OTA) / CLI: the catalog metadata + declared manifest dependencies +
// the PUBLIC workspaces that anchor (is_root) this package. Mirrors the resolve
// route: only ACTIVE packages are visible, read through the anon client (RLS
// already restricts workspaces to visibility='public'), no session required.
// The workspace sub-query is fail-soft — any failure yields "workspaces": []
// rather than a 500, so a flaky relationship never breaks the core payload.
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  fetchManifestDependencies,
  fetchSecurityPolicyPresence,
  fetchGithubVersions,
  fetchGithubRepoMeta,
  isGithubRepo,
} from "@/app/[lang]/packages/[slug]/github";
import { computeReadiness, isMaintained, type CraReadiness } from "@/lib/cra/readiness";
import { fetchRepoSbom, type RepoSbom } from "@/lib/sbom/repo-sbom";

export const dynamic = "force-dynamic";

type PackageRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  highlight_level: string | null;
  license_type: string | null;
  license_name: string | null;
  score: number | null;
  repository_url: string | null;
  platforms: string[] | null;
  languages: string[] | null;
};

// CRA seal + SBOM metadata — the exact computation the package detail PAGE runs
// (computeReadiness over SBOM presence + a SECURITY policy + an actively
// maintained release cadence), reshaped for the IDE cockpit. Fully fail-soft:
// any GitHub/SBOM error degrades to best-effort signals + sbom:null and never
// throws, so the core package payload always returns.
type CraPayload = {
  percent: number;
  level: string;
  signals: { sbom: boolean; securityPolicy: boolean; maintained: boolean };
};
type SbomPayload = {
  format: string;
  attestedBy: string;
  published: string;
  downloads: number;
  downloadUrl: string;
};

// "full" at 100%, "partial" when any signal is met, else "none" — mirrors the
// CraReadinessPanel's tone grading.
function craLevel(r: CraReadiness): string {
  if (r.complete) return "full";
  return r.pct > 0 ? "partial" : "none";
}

async function buildCraAndSbom(
  row: PackageRow,
): Promise<{ cra: CraPayload; sbom: SbomPayload | null }> {
  // The SBOM is the repo's responsibility: read it LIVE from the repo (no DB),
  // self-correcting and fail-soft. The GitHub-derived signals are likewise
  // wrapped so a flaky probe can't 500.
  let repoSbom: RepoSbom | null = null;
  let securityPolicy = false;
  let maintained = false;
  try {
    const repo = row.repository_url;
    repoSbom = repo ? await fetchRepoSbom(repo) : null;
    securityPolicy = repo ? await fetchSecurityPolicyPresence(repo) : false;
    const repoMeta = isGithubRepo(repo) ? await fetchGithubRepoMeta(repo as string) : null;
    const ghVersions = (repo ? await fetchGithubVersions(repo) : []) ?? [];
    const maintainedDate = repoMeta?.pushed_at ?? ghVersions[0]?.date ?? null;
    maintained = isMaintained(maintainedDate, new Date());
  } catch {
    // Best-effort: keep whatever signals resolved, leave the rest false.
  }

  const readiness = computeReadiness({
    sbom: repoSbom !== null,
    securityPolicy,
    maintained,
  });

  const cra: CraPayload = {
    percent: readiness.pct,
    level: craLevel(readiness),
    signals: {
      sbom: readiness.signals.sbom,
      securityPolicy: readiness.signals.securityPolicy,
      maintained: readiness.signals.maintained,
    },
  };

  const sbom: SbomPayload | null = repoSbom
    ? {
        format: repoSbom.format,
        attestedBy: repoSbom.author ?? "",
        published: repoSbom.timestamp ?? "",
        downloads: 0,
        downloadUrl: repoSbom.downloadUrl,
      }
    : null;

  return { cra, sbom };
}

type WorkspaceDependency = { slug: string; name: string };
type WorkspaceEntry = { id: string; name: string; dependencies: WorkspaceDependency[] };

// PUBLIC workspaces (RLS-restricted) that have THIS package as is_root, each with
// its OTHER (non-root) package nodes. Defensive: any failure → [].
async function loadWorkspaces(
  supabase: Awaited<ReturnType<typeof createClient>>,
  packageId: string,
): Promise<WorkspaceEntry[]> {
  try {
    // Root nodes referencing this package, joined to their (public-only) workspace.
    const { data: rootRows, error: rootErr } = await supabase
      .from("workspace_nodes")
      .select("workspace_id, workspaces!inner(id, name, visibility)")
      .eq("package_id", packageId)
      .eq("is_root", true)
      .eq("workspaces.visibility", "public");

    if (rootErr || !rootRows) return [];

    const workspaces = new Map<string, string>(); // id -> name
    for (const r of rootRows as unknown as {
      workspaces: { id: string; name: string } | null;
    }[]) {
      if (r.workspaces?.id) workspaces.set(r.workspaces.id, r.workspaces.name ?? "");
    }
    if (workspaces.size === 0) return [];

    const ids = [...workspaces.keys()];
    // The OTHER (non-root) package nodes across those workspaces.
    const { data: depRows, error: depErr } = await supabase
      .from("workspace_nodes")
      .select("workspace_id, is_root, packages(slug, name)")
      .in("workspace_id", ids)
      .eq("is_root", false)
      .not("package_id", "is", null);

    if (depErr) return [];

    const depsByWs = new Map<string, WorkspaceDependency[]>();
    for (const r of (depRows ?? []) as unknown as {
      workspace_id: string;
      packages: { slug: string; name: string } | null;
    }[]) {
      if (!r.packages?.slug) continue;
      const list = depsByWs.get(r.workspace_id) ?? [];
      list.push({ slug: r.packages.slug, name: r.packages.name ?? "" });
      depsByWs.set(r.workspace_id, list);
    }

    return ids.map((id) => ({
      id,
      name: workspaces.get(id) ?? "",
      dependencies: depsByWs.get(id) ?? [],
    }));
  } catch {
    return [];
  }
}

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
    .select(
      "id, slug, name, description, highlight_level, license_type, license_name, score, repository_url, platforms, languages",
    )
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  const row = pkg as PackageRow | null;
  if (!row) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const rawDeps = row.repository_url
    ? await fetchManifestDependencies(row.repository_url)
    : null;
  const dependencies = (rawDeps ?? []).map((d) => ({
    name: d.key,
    version: d.version,
  }));

  const workspaces = await loadWorkspaces(supabase, row.id);
  const { cra, sbom } = await buildCraAndSbom(row);

  return NextResponse.json(
    {
      slug: row.slug,
      name: row.name,
      description: row.description ?? "",
      tier:
        row.highlight_level && row.highlight_level !== "none"
          ? row.highlight_level
          : "none",
      license_type: row.license_type ?? "",
      license_name: row.license_name ?? "",
      score: row.score ?? 0,
      repository_url: row.repository_url ?? "",
      platforms: row.platforms ?? [],
      languages: row.languages ?? [],
      dependencies,
      workspaces,
      cra,
      sbom,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
