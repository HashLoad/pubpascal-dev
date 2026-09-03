export const PACKAGES_PAGE_SIZE = 12;

export const PLATFORM_ALLOWLIST = [
  "Windows",
  "macOS",
  "Linux",
  "Android",
  "iOS",
  "Web",
] as const;

export const LANGUAGE_ALLOWLIST = [
  "Delphi",
  "Lazarus",
  "C++ Builder",
] as const;

export const CATEGORY_ALLOWLIST = [
  "ORM",
  "Database",
  "JSON",
  "REST",
  "HTTP",
  "UI",
  "FMX",
  "Testing",
  "Networking",
  "Cryptography",
  "Serialization",
  "Logging",
  "Dependency Injection",
  "Collections",
  "Validation",
] as const;

// User-facing sort. "relevant" (default) keeps the curated within-tier order
// (downloads → score → recency). The rest sort within each tier so promoted
// (gold/silver/bronze) packages still lead.
export const SORT_ALLOWLIST = ["relevant", "newest", "stars", "name"] as const;

export type Platform = (typeof PLATFORM_ALLOWLIST)[number];
export type Language = (typeof LANGUAGE_ALLOWLIST)[number];
export type Category = (typeof CATEGORY_ALLOWLIST)[number];
export type SortKey = (typeof SORT_ALLOWLIST)[number];

export const DEFAULT_SORT: SortKey = "relevant";

export type RawSearchParams = {
  [key: string]: string | string[] | undefined;
};

export type ParsedSearchParams = {
  q: string;
  platform: Platform | null;
  language: Language | null;
  category: Category | null;
  sort: SortKey;
  page: number;
};

function pickString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function normalizePlatform(value: string): Platform | null {
  const trimmed = value.trim();
  return (PLATFORM_ALLOWLIST as readonly string[]).includes(trimmed)
    ? (trimmed as Platform)
    : null;
}

function normalizeLanguage(value: string): Language | null {
  const trimmed = value.trim();
  return (LANGUAGE_ALLOWLIST as readonly string[]).includes(trimmed)
    ? (trimmed as Language)
    : null;
}

function normalizeCategory(value: string): Category | null {
  const trimmed = value.trim();
  return (CATEGORY_ALLOWLIST as readonly string[]).includes(trimmed)
    ? (trimmed as Category)
    : null;
}

function normalizePage(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

function normalizeSort(value: string): SortKey {
  const trimmed = value.trim();
  return (SORT_ALLOWLIST as readonly string[]).includes(trimmed)
    ? (trimmed as SortKey)
    : DEFAULT_SORT;
}

export function parseSearchParams(raw: RawSearchParams): ParsedSearchParams {
  const q = pickString(raw.q).trim();
  const platform = normalizePlatform(pickString(raw.platform));
  const language = normalizeLanguage(pickString(raw.language));
  const category = normalizeCategory(pickString(raw.category));
  const sort = normalizeSort(pickString(raw.sort));
  const page = normalizePage(pickString(raw.page));
  return { q, platform, language, category, sort, page };
}

export function escapeIlikePattern(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function buildPackagesUrl(params: {
  q?: string;
  platform?: Platform | null;
  language?: Language | null;
  category?: Category | null;
  sort?: SortKey;
  page?: number;
  lang?: string;
}): string {
  const base = params.lang ? `/${params.lang}/packages` : "/packages";
  const search = new URLSearchParams();
  if (params.q && params.q.length > 0) search.set("q", params.q);
  if (params.platform) search.set("platform", params.platform);
  if (params.language) search.set("language", params.language);
  if (params.category) search.set("category", params.category);
  if (params.sort && params.sort !== DEFAULT_SORT) search.set("sort", params.sort);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const qs = search.toString();
  return qs.length > 0 ? `${base}?${qs}` : base;
}
