import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import {
  PACKAGES_PAGE_SIZE,
  type ParsedSearchParams,
  type SortKey,
  escapeIlikePattern,
} from "./searchParams";

export type PackageRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  license_type: string | null;
  license_name: string | null;
  highlight_level: "gold" | "silver" | "bronze" | "none" | null;
  platforms: string[] | null;
  languages: string[] | null;
  categories: string[] | null;
  stars: number | null;
  downloads: number | null;
  score: number | null;
  // jsonb — kept `unknown` to match the sibling row types (MyPackageRow / admin)
  // and consumed only through the tolerant computePubPoints() helper.
  validation_report: unknown;
  deprecated_message: string | null;
  created_at: string | null;
};

const PACKAGE_SELECT =
  "id, name, slug, description, license_type, license_name, highlight_level, platforms, languages, categories, stars, downloads, score, validation_report, deprecated_message, created_at";

const TIER_ORDER = ["gold", "silver", "bronze", "none"] as const;
type Tier = (typeof TIER_ORDER)[number];

type AnyBuilder = {
  eq: (column: string, value: unknown) => AnyBuilder;
  or: (filters: string) => AnyBuilder;
  is: (column: string, value: unknown) => AnyBuilder;
  contains: (column: string, value: unknown) => AnyBuilder;
  order: (column: string, options: { ascending: boolean; nullsFirst?: boolean }) => AnyBuilder;
  range: (from: number, to: number) => Promise<{ data: unknown; error: unknown }>;
  then?: unknown;
};

function applyFilters(builder: AnyBuilder, params: ParsedSearchParams): AnyBuilder {
  let q = builder.eq("status", "active");

  if (params.q.length > 0) {
    const escaped = escapeIlikePattern(params.q);
    const pattern = `%${escaped}%`;
    q = q.or(
      `name.ilike.${pattern},slug.ilike.${pattern},description.ilike.${pattern}`,
    );
  }

  if (params.platform) {
    q = q.contains("platforms", [params.platform]);
  }

  if (params.language) {
    q = q.contains("languages", [params.language]);
  }

  if (params.category) {
    q = q.contains("categories", [params.category]);
  }

  return q;
}

function applyTier(builder: AnyBuilder, tier: Tier): AnyBuilder {
  if (tier === "none") {
    return builder.or("highlight_level.eq.none,highlight_level.is.null");
  }
  return builder.eq("highlight_level", tier);
}

// User sort, applied WITHIN each tier so promotion (gold→silver→bronze) is
// preserved. "relevant" is the curated default (downloads → score → recency).
function applySort(builder: AnyBuilder, sort: SortKey): AnyBuilder {
  switch (sort) {
    case "newest":
      return builder.order("created_at", { ascending: false });
    case "stars":
      return builder
        .order("stars", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
    case "name":
      return builder.order("name", { ascending: true });
    case "relevant":
    default:
      return builder
        .order("downloads", { ascending: false, nullsFirst: false })
        .order("score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
  }
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

function tierCountBuilder(
  supabase: SupabaseClient,
  params: ParsedSearchParams,
  tier: Tier,
): AnyBuilder {
  const filtered = applyFilters(
    supabase
      .from("packages")
      .select(PACKAGE_SELECT, { count: "exact", head: true }) as unknown as AnyBuilder,
    params,
  );
  return applyTier(filtered, tier);
}

function tierDataBuilder(
  supabase: SupabaseClient,
  params: ParsedSearchParams,
  tier: Tier,
): AnyBuilder {
  const filtered = applyFilters(
    supabase.from("packages").select(PACKAGE_SELECT) as unknown as AnyBuilder,
    params,
  );
  return applySort(applyTier(filtered, tier), params.sort);
}

export type PackagesQueryResult = {
  rows: PackageRow[];
  totalCount: number;
  pageSize: number;
  page: number;
  totalPages: number;
  error: boolean;
};

async function fetchPackagesUncached(
  params: ParsedSearchParams,
): Promise<PackagesQueryResult> {
  const pageSize = PACKAGES_PAGE_SIZE;
  const safePage = Math.max(1, params.page);
  const pageFrom = (safePage - 1) * pageSize;
  const pageTo = pageFrom + pageSize - 1;

  try {
    const supabase = await createClient();

    const countResults = (await Promise.all(
      TIER_ORDER.map((tier) => tierCountBuilder(supabase, params, tier)),
    )) as unknown as Array<{ count: number | null; error: { message: string } | null }>;

    const countError = countResults.find((r) => r.error)?.error;
    if (countError) {
      console.warn("[/packages] supabase count query failed", countError);
      return { rows: [], totalCount: 0, pageSize, page: safePage, totalPages: 0, error: true };
    }

    const tierCounts: Record<Tier, number> = {
      gold: countResults[0].count ?? 0,
      silver: countResults[1].count ?? 0,
      bronze: countResults[2].count ?? 0,
      none: countResults[3].count ?? 0,
    };

    const totalCount =
      tierCounts.gold + tierCounts.silver + tierCounts.bronze + tierCounts.none;
    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

    if (totalCount === 0) {
      return { rows: [], totalCount: 0, pageSize, page: safePage, totalPages: 0, error: false };
    }

    type TierSlice = { tier: Tier; from: number; to: number };
    const slices: TierSlice[] = [];
    let cursor = 0;
    for (const tier of TIER_ORDER) {
      const tierSize = tierCounts[tier];
      if (tierSize === 0) continue;
      const tierStart = cursor;
      const tierEnd = cursor + tierSize - 1;

      const sliceFrom = Math.max(pageFrom, tierStart);
      const sliceTo = Math.min(pageTo, tierEnd);
      if (sliceFrom <= sliceTo) {
        slices.push({
          tier,
          from: sliceFrom - tierStart,
          to: sliceTo - tierStart,
        });
      }
      cursor = tierEnd + 1;
      if (cursor > pageTo) break;
    }

    if (slices.length === 0) {
      return {
        rows: [],
        totalCount,
        pageSize,
        page: safePage,
        totalPages,
        error: false,
      };
    }

    const dataResults = (await Promise.all(
      slices.map(
        (s) =>
          tierDataBuilder(supabase, params, s.tier).range(s.from, s.to) as unknown as Promise<{
            data: PackageRow[] | null;
            error: { message: string } | null;
          }>,
      ),
    )) as Array<{ data: PackageRow[] | null; error: { message: string } | null }>;

    const dataError = dataResults.find((r) => r.error)?.error;
    if (dataError) {
      console.warn("[/packages] supabase tier query failed", dataError);
      return { rows: [], totalCount: 0, pageSize, page: safePage, totalPages: 0, error: true };
    }

    const rows: PackageRow[] = [];
    for (const result of dataResults) {
      if (result.data) rows.push(...result.data);
    }

    return { rows, totalCount, pageSize, page: safePage, totalPages, error: false };
  } catch (err) {
    console.warn("[/packages] supabase client failed", err);
    return {
      rows: [],
      totalCount: 0,
      pageSize,
      page: safePage,
      totalPages: 0,
      error: true,
    };
  }
}

const fetchPackagesCached = cache(
  async (_key: string, params: ParsedSearchParams) => fetchPackagesUncached(params),
);

function cacheKey(params: ParsedSearchParams): string {
  return `${params.q}|${params.platform ?? ""}|${params.language ?? ""}|${params.category ?? ""}|${params.sort}|${params.page}`;
}

export function fetchPackages(params: ParsedSearchParams): Promise<PackagesQueryResult> {
  return fetchPackagesCached(cacheKey(params), params);
}
