// Pure, client- and server-safe (no `server-only`): the single source of truth
// for building `[lang]`-routed hrefs. The locale list is mirrored inline rather
// than imported from the `server-only` dictionaries module so client components
// (Header, PackageCard) can import it too (ADR-141).
export const SUPPORTED_LOCALES = ["en", "pt-BR"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

// Prefix a locale-relative path with the active locale. Query/hash ride along in
// `path` (plain concatenation preserves them). `/` and `` collapse to `/${locale}`
// with no trailing slash. Caller is responsible for only passing `[lang]`-routed
// paths — non-`[lang]` routes must not go through here (ADR-143, BR1).
export function localizedHref(path: string, locale: Locale): string {
  if (path === "/" || path === "") return `/${locale}`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalized}`;
}
