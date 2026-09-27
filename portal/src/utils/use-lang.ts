"use client";

import { usePathname } from "next/navigation";

// Mirrors SUPPORTED_LOCALES from dictionaries.ts — kept inline to avoid
// importing the server-only module into a client component.
const LOCALES = ["en", "pt-BR"] as const;
type Locale = (typeof LOCALES)[number];

export function detectLocaleFromPath(pathname: string): Locale {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale;
    }
  }
  return "en";
}

export function useLang(): Locale {
  const pathname = usePathname() ?? "/";
  return detectLocaleFromPath(pathname);
}
