import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const SUPPORTED_LOCALES = ["en", "pt-BR"] as const;
const DEFAULT_LOCALE = "en";

const LOCALIZABLE_PREFIXES = ["/packages", "/partners"] as const;
const NON_LOCALIZABLE_EXACT = new Set(["/partners/apply"]);
const NON_LOCALIZABLE_PREFIXES = [
  "/partners/apply",
  "/admin",
  "/dashboard",
  "/login",
  "/register",
  "/publish",
  "/portal-status",
  "/profile",
  "/auth",
  "/api",
  "/_next",
];

function isLocalizablePath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (NON_LOCALIZABLE_EXACT.has(pathname)) return false;
  if (NON_LOCALIZABLE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return false;
  }
  return LOCALIZABLE_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function detectLocaleFromPath(pathname: string): (typeof SUPPORTED_LOCALES)[number] | null {
  for (const locale of SUPPORTED_LOCALES) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return locale;
    }
  }
  return null;
}

function buildLocalizedPath(pathname: string): string {
  return pathname === "/" ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${pathname}`;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip updateSession for /auth/* — calling getUser() here clears the PKCE
  // code-verifier cookie before the route handler can exchange it.
  if (pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  const localeFromPath = detectLocaleFromPath(pathname);

  if (!localeFromPath && isLocalizablePath(pathname)) {
    const target = new URL(buildLocalizedPath(pathname), request.url);
    // Preserve the query string (e.g. ?tab=changelog, ?readme=1) on the locale redirect.
    target.search = request.nextUrl.search;
    return NextResponse.redirect(target);
  }

  const activeLocale = localeFromPath ?? DEFAULT_LOCALE;
  request.headers.set("x-locale", activeLocale);

  const response = await updateSession(request);
  response.headers.set("x-locale", activeLocale);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - all images/assets in public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
