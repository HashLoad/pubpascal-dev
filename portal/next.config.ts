import type { NextConfig } from "next";

// Safe-fallback Supabase URL used only when NEXT_PUBLIC_SUPABASE_URL is absent
// or malformed at config build time (e.g. CI prerender of /_not-found). Mirrors
// src/utils/supabase/client.ts so the emitted CSP never silently omits a
// Supabase-shaped origin (ESP-002 A7 / ADR-130).
const FALLBACK_SUPABASE_URL = "https://placeholder.supabase.co";

// Two-year HSTS max-age in seconds (ADR-131).
const HSTS_MAX_AGE_SECONDS = 63072000;

// Cloudflare Turnstile origin (ESP-002 Demand 2/3, BR6 / ADR-135). The widget
// loads its script and renders an iframe from this host and beacons the verify
// call to it — so it must be admitted on script-src, frame-src, and connect-src.
// This is the only authorized extension to the Demand-1/3 CSP.
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

/**
 * Resolve the Supabase host (no scheme) from NEXT_PUBLIC_SUPABASE_URL.
 * Falls back to the placeholder host and warns when the env var is missing or
 * not a valid URL, so the CSP always carries a Supabase origin (ADR-130 / A7).
 */
function resolveSupabaseHost(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) {
    console.warn(
      "[next.config] NEXT_PUBLIC_SUPABASE_URL is not set — CSP falls back to " +
        `${FALLBACK_SUPABASE_URL}. Set the env var so connect-src/img-src match the live Supabase host.`,
    );
    return new URL(FALLBACK_SUPABASE_URL).host;
  }
  try {
    return new URL(raw).host;
  } catch {
    console.warn(
      `[next.config] NEXT_PUBLIC_SUPABASE_URL ("${raw}") is not a valid URL — ` +
        `CSP falls back to ${FALLBACK_SUPABASE_URL}.`,
    );
    return new URL(FALLBACK_SUPABASE_URL).host;
  }
}

/**
 * Build the single-line enforced Content-Security-Policy (ADR-129/130).
 * Pragmatic by design: 'unsafe-inline' is permitted only on script-src/style-src
 * (Next App Router inline bootstrap requirement); every other directive is locked
 * down. No nonce, no strict-dynamic — keeps static/ISR rendering intact (BR2).
 */
function buildContentSecurityPolicy(): string {
  const isDev = process.env.NODE_ENV === "development";
  const supabaseHost = resolveSupabaseHost();
  const supabaseHttps = `https://${supabaseHost}`;
  const supabaseWss = `wss://${supabaseHost}`;

  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://va.vercel-scripts.com ${TURNSTILE_ORIGIN}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: ${supabaseHttps} https:`,
    "font-src 'self' data:",
    `connect-src 'self' ${supabaseHttps} ${supabaseWss} https://*.vercel-insights.com ${TURNSTILE_ORIGIN}`,
    `frame-src 'self' ${TURNSTILE_ORIGIN}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ];

  return directives.join("; ");
}

/** Baseline security response headers applied to every route (ESP-002 / ADR-131). */
function buildSecurityHeaders(): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
    {
      key: "Strict-Transport-Security",
      value: `max-age=${HSTS_MAX_AGE_SECONDS}; includeSubDomains; preload`,
    },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
  ];
}

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: buildSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;
