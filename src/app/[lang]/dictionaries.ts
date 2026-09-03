import "server-only";

export const SUPPORTED_LOCALES = ["en", "pt-BR"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const dictionaries = {
  en: () => import("@/dictionaries/en.json").then((m) => m.default),
  "pt-BR": () => import("@/dictionaries/pt-BR.json").then((m) => m.default),
} as const;

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)[Locale]>>;

export function hasLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}

export function ogLocale(locale: Locale): string {
  return locale === "en" ? "en_US" : "pt_BR";
}
