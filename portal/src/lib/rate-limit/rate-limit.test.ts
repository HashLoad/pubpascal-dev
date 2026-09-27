// Rate-limit unit suite (ESP-002, AC-02 / AC-03). Node env (no DOM). Covers the
// pure key-builder (determinism + namespacing) and the fail-open contract of
// `checkRateLimit` (env absent → allow; store throws → allow). The live Upstash
// client is a network seam (A8) — mocked here, excluded from coverage thresholds.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  publishUserKey,
  tokensUserKey,
  manifestTokenKey,
  manifestIpKey,
  sbomIpKey,
  partnerApplyIpKey,
  clientIpFromForwardedFor,
  UNKNOWN_IP,
} from "./keys";

describe("rate-limit key-builder (AC-03)", () => {
  it("produces namespaced keys distinct per surface", () => {
    expect(publishUserKey("u1")).toBe("publish:user:u1");
    expect(tokensUserKey("u1")).toBe("tokens:user:u1");
    expect(manifestTokenKey("h1")).toBe("manifest:token:h1");
    expect(manifestIpKey("1.2.3.4")).toBe("manifest:ip:1.2.3.4");
    expect(sbomIpKey("1.2.3.4")).toBe("sbom:ip:1.2.3.4");
    expect(partnerApplyIpKey("1.2.3.4")).toBe("partner-apply:ip:1.2.3.4");
  });

  it("is deterministic for the same input", () => {
    expect(publishUserKey("u1")).toBe(publishUserKey("u1"));
    expect(manifestIpKey("9.9.9.9")).toBe(manifestIpKey("9.9.9.9"));
  });

  it("keys distinct identities and surfaces apart", () => {
    expect(publishUserKey("a")).not.toBe(publishUserKey("b"));
    expect(publishUserKey("u1")).not.toBe(tokensUserKey("u1"));
    expect(manifestTokenKey("x")).not.toBe(manifestIpKey("x"));
    expect(sbomIpKey("x")).not.toBe(manifestIpKey("x"));
  });
});

describe("clientIpFromForwardedFor", () => {
  it("returns the trimmed left-most hop", () => {
    expect(clientIpFromForwardedFor("1.1.1.1, 2.2.2.2")).toBe("1.1.1.1");
    expect(clientIpFromForwardedFor(" 9.9.9.9 ")).toBe("9.9.9.9");
  });

  it("falls back to UNKNOWN_IP when absent or empty", () => {
    expect(clientIpFromForwardedFor(null)).toBe(UNKNOWN_IP);
    expect(clientIpFromForwardedFor(undefined)).toBe(UNKNOWN_IP);
    expect(clientIpFromForwardedFor("")).toBe(UNKNOWN_IP);
    expect(clientIpFromForwardedFor("   ")).toBe(UNKNOWN_IP);
  });
});

describe("checkRateLimit fail-open (AC-02)", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.doUnmock("@upstash/redis");
    vi.doUnmock("@upstash/ratelimit");
  });

  it("resolves ok:true and warns when the Upstash env is absent", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { checkRateLimit } = await import("./index");
    const res = await checkRateLimit("publish", "publish:user:u1");

    expect(res.ok).toBe(true);
    expect(warn).toHaveBeenCalled();
  });

  it("resolves ok:true (never throws) when the limiter store errors", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    vi.spyOn(console, "warn").mockImplementation(() => {});

    vi.doMock("@upstash/redis", () => ({ Redis: class {} }));
    vi.doMock("@upstash/ratelimit", () => ({
      Ratelimit: class {
        static slidingWindow() {
          return {};
        }
        limit() {
          throw new Error("redis unreachable");
        }
      },
    }));

    const { checkRateLimit } = await import("./index");
    const res = await checkRateLimit("publish", "publish:user:u1");

    expect(res.ok).toBe(true);
  });
});
