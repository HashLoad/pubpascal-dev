import "server-only";
import { headers } from "next/headers";
import { hasLocale, type Locale } from "@/app/[lang]/dictionaries";

const DEFAULT_LOCALE: Locale = "en";

// Resolve the active locale for routes outside the `[lang]/` segment (e.g.
// /publish, /dashboard). The proxy emits the `x-locale` header on every matched
// response (src/proxy.ts); we validate it and fall back to the default locale.
// Mirrors the proxy's DEFAULT_LOCALE so non-localizable routes stay consistent.
export async function getRequestLocale(): Promise<Locale> {
  const value = (await headers()).get("x-locale");
  return value && hasLocale(value) ? value : DEFAULT_LOCALE;
}
