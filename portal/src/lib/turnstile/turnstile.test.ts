// Turnstile verify unit suite (ESP-002, AC-07). Node env (no DOM). The live
// siteverify call is a network seam (A8) — `fetch` is injected so the pure
// response-parsing + degradation logic is tested without a network round-trip.
import { describe, it, expect, vi, afterEach } from "vitest";

// `server-only` is a Next.js bundler marker with no Node entry point; stub it so
// the module is importable under the node test runner (it still guards the real
// build, where Next resolves the package).
vi.mock("server-only", () => ({}));

import { verifyTurnstile } from "./index";

// Build a `fetch`-typed stub returning a JSON siteverify body.
function fetchReturning(body: unknown): typeof fetch {
  return vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        headers: { "content-type": "application/json" },
      }),
  ) as unknown as typeof fetch;
}

describe("verifyTurnstile (AC-07)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("short-circuits on a missing token without calling fetch", async () => {
    const mock = vi.fn();
    const res = await verifyTurnstile("", "1.2.3.4", mock as unknown as typeof fetch);

    expect(res).toEqual({ ok: false, reason: "missing-token" });
    expect(mock).not.toHaveBeenCalled();
  });

  it("returns ok:true on a success siteverify response", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    const f = fetchReturning({ success: true });

    const res = await verifyTurnstile("token", "1.2.3.4", f);

    expect(res).toEqual({ ok: true });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("returns rejected with error codes on a failure response", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    const f = fetchReturning({
      success: false,
      "error-codes": ["invalid-input-response"],
    });

    const res = await verifyTurnstile("token", null, f);

    expect(res).toEqual({
      ok: false,
      reason: "rejected",
      errorCodes: ["invalid-input-response"],
    });
  });

  it("returns verify-error when the request throws", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const f = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    const res = await verifyTurnstile("token", null, f);

    expect(res).toEqual({ ok: false, reason: "verify-error" });
  });

  it("allows in non-production when the secret is absent (dev degradation)", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("NODE_ENV", "development");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const mock = vi.fn();

    const res = await verifyTurnstile("token", null, mock as unknown as typeof fetch);

    expect(res).toEqual({ ok: true });
    expect(mock).not.toHaveBeenCalled();
  });

  it("rejects in production when the secret is absent (no silent pass)", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const res = await verifyTurnstile(
      "token",
      null,
      vi.fn() as unknown as typeof fetch,
    );

    expect(res).toEqual({ ok: false, reason: "missing-secret" });
  });
});
