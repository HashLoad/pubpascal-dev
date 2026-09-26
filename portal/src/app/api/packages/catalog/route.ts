// GET /api/packages/catalog — public package list for the IDE plugin (OTA) cockpit.
//   - no `q`   -> the GOLD sponsors only (highlight_level='gold'): the curated
//                 front page. (Other tiers/ranking come later.)
//   - with `q` -> search ALL active packages (sponsors AND non-sponsors) by
//                 name/slug/description.
// Active-only (public catalog), capped by `limit`. Mirrors the resolve route: the
// anon client reads active packages, no session required — the CLI calls this
// headless (`pp pkg list` / `pp pkg search`).
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { computePubPoints } from "@/utils/pubPoints";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

type Row = {
  slug: string;
  name: string;
  description: string | null;
  highlight_level: string | null;
  downloads: number | null;
  stars: number | null;
  score: number | null;
  validation_report: unknown;
  license_type: string | null;
  repository_url: string | null;
};

// Neutralise PostgREST ilike wildcards / list separators so user text stays literal.
function escapeIlike(input: string): string {
  return input.replace(/[%,()\\]/g, "\\$&");
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limitRaw = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;

  const supabase = await createClient();
  let builder = supabase
    .from("packages")
    .select("slug, name, description, highlight_level, downloads, stars, score, validation_report, license_type, repository_url")
    .eq("status", "active");

  if (q.length > 0) {
    const escaped = escapeIlike(q);
    builder = builder.or(
      `name.ilike.%${escaped}%,slug.ilike.%${escaped}%,description.ilike.%${escaped}%`
    );
  } else {
    // Only return subscribers (Gold, Silver, Bronze) when there is no search query
    builder = builder.in("highlight_level", ["gold", "silver", "bronze"]);
  }

  // Fetch all active packages to sort them by tier first
  const { data, error } = await builder
    .order("downloads", { ascending: false, nullsFirst: false })
    .order("score", { ascending: false, nullsFirst: false })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "catalog query failed" }, { status: 500 });
  }

  const mapped = ((data ?? []) as Row[]).map((r) => {
    const computedScore = r.score && r.score > 0
      ? r.score
      : (r.validation_report ? computePubPoints(r.validation_report).total : 0);

    return {
      slug: r.slug,
      name: r.name,
      description: r.description ?? "",
      tier: r.highlight_level && r.highlight_level !== "none" ? r.highlight_level.toLowerCase() : "none",
      stars: r.stars ?? 0,
      score: computedScore,
      downloads: r.downloads ?? 0,
      license_type: r.license_type ?? "",
      repository_url: r.repository_url ?? "",
    };
  });

  // Sort by subscription tier: Gold -> Silver -> Bronze -> None
  const tierOrder: Record<string, number> = { gold: 0, silver: 1, bronze: 2, none: 3 };
  const sorted = mapped.sort((a, b) => {
    const orderA = tierOrder[a.tier] ?? 3;
    const orderB = tierOrder[b.tier] ?? 3;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return b.downloads - a.downloads;
  });

  const packages = sorted.slice(0, limit);

  return NextResponse.json({ packages }, { headers: { "Cache-Control": "no-store" } });
}
