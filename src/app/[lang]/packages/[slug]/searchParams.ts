export const TAB_KEYS = [
  "readme",
  "changelog",
  "example",
  "installing",
  "versions",
  "scores",
  "reviews",
] as const;

export type TabKey = (typeof TAB_KEYS)[number];

export const DEFAULT_TAB: TabKey = "readme";

export type RawSearchParams = {
  [key: string]: string | string[] | undefined;
};

function pickString(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export function parseTab(raw: RawSearchParams): TabKey {
  const value = pickString(raw.tab).trim();
  return (TAB_KEYS as readonly string[]).includes(value)
    ? (value as TabKey)
    : DEFAULT_TAB;
}

// The repo README is fetched lazily: only when `?readme=1` is present (i.e. the
// user clicked "expandir"). Collapsed renders the summary alone, no git call.
export function parseReadmeOpen(raw: RawSearchParams): boolean {
  return pickString(raw.readme).trim() === "1";
}

export type TabDescriptor = {
  key: TabKey;
  label: string;
};

export const TABS: TabDescriptor[] = [
  { key: "readme", label: "Readme" },
  { key: "changelog", label: "Changelog" },
  { key: "example", label: "Example" },
  { key: "installing", label: "Installing" },
  { key: "versions", label: "Versions" },
  { key: "scores", label: "Scores" },
  { key: "reviews", label: "Reviews" },
];

export function buildTabHref(slug: string, tab: TabKey): string {
  return tab === DEFAULT_TAB ? `/packages/${slug}` : `/packages/${slug}?tab=${tab}`;
}
