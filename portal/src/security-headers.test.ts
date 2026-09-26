// Header-contract test for ESP-002 (Epic 2/4 — Demand 1/3). Node env (no DOM),
// no new dependency — runs under the existing Vitest harness (ADR-120/123/124).
// Asserts AC-01..AC-10 against the next.config.ts `headers()` return shape; a
// live served-response check (AC-13) is out of this test's reach (operator-deferred).
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import nextConfig from "../next.config";

const SUPABASE_URL = "https://test-project.supabase.co";
const SUPABASE_HOST = "test-project.supabase.co";
const SOURCE = "/(.*)";

async function getHeaderMap(): Promise<Record<string, string>> {
  const headersFn = nextConfig.headers;
  if (!headersFn) throw new Error("next.config.ts does not define headers()");
  const rules = await headersFn();
  const rule = rules.find((r) => r.source === SOURCE);
  if (!rule) throw new Error(`no header rule for source ${SOURCE}`);
  return Object.fromEntries(rule.headers.map((h) => [h.key, h.value]));
}

describe("next.config security headers (ESP-002)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", SUPABASE_URL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("AC-01 exposes async headers() with a rule for source '/(.*)'", async () => {
    const headersFn = nextConfig.headers;
    if (!headersFn) throw new Error("headers() missing");
    const rules = await headersFn();
    expect(rules.some((r) => r.source === SOURCE)).toBe(true);
  });

  it("AC-02 CSP carries the locked-down directives", async () => {
    const csp = (await getHeaderMap())["Content-Security-Policy"];
    for (const directive of [
      "default-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ]) {
      expect(csp).toContain(directive);
    }
  });

  it("AC-03 script-src/style-src use 'unsafe-inline'; no nonce, no strict-dynamic", async () => {
    const csp = (await getHeaderMap())["Content-Security-Policy"];
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain("nonce-");
    expect(csp).not.toContain("strict-dynamic");
  });

  it("AC-04 connect-src includes self + Supabase https/wss + Vercel insights", async () => {
    const csp = (await getHeaderMap())["Content-Security-Policy"];
    expect(csp).toContain(
      `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://*.vercel-insights.com`,
    );
  });

  it("AC-05 img-src includes self/data/blob + Supabase + https:; font-src self", async () => {
    const csp = (await getHeaderMap())["Content-Security-Policy"];
    expect(csp).toContain(
      `img-src 'self' data: blob: https://${SUPABASE_HOST} https:`,
    );
    expect(csp).toContain("font-src 'self'");
  });

  it("AC-06..AC-10 static security headers carry exact values", async () => {
    const headers = await getHeaderMap();
    expect(headers["Strict-Transport-Security"]).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toBe(
      "camera=(), microphone=(), geolocation=(), browsing-topics=()",
    );
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("AC-09 Permissions-Policy grants no wildcard", async () => {
    const permissionsPolicy = (await getHeaderMap())["Permissions-Policy"];
    expect(permissionsPolicy).not.toContain("*");
  });

  it("A7 falls back to a placeholder Supabase origin when the env var is absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const csp = (await getHeaderMap())["Content-Security-Policy"];
    expect(csp).toContain("https://placeholder.supabase.co");
    expect(warn).toHaveBeenCalled();
  });

  it("A7 falls back to a placeholder Supabase origin when the env var is malformed", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "not a valid url");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const csp = (await getHeaderMap())["Content-Security-Policy"];
    expect(csp).toContain("https://placeholder.supabase.co");
    expect(warn).toHaveBeenCalled();
  });

  it("AC-03 adds 'unsafe-eval' to script-src only in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const devCsp = (await getHeaderMap())["Content-Security-Policy"];
    expect(devCsp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");

    vi.stubEnv("NODE_ENV", "production");
    const prodCsp = (await getHeaderMap())["Content-Security-Policy"];
    expect(prodCsp).not.toContain("'unsafe-eval'");
  });
});
