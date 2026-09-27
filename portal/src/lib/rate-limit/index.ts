// Durable per-key rate limiter (ESP-002 / ADR-132 / ADR-135).
//
// Backed by Upstash Redis (Vercel Marketplace) via `@upstash/ratelimit`
// sliding-window over `@upstash/redis` — the only supported store (BR1; Vercel
// KV is discontinued). The Redis client and limiter set are built LAZILY from
// the env vars so a missing config never throws at import time.
//
// FAIL-OPEN (BR3): any failure path — env absent, Redis unreachable, malformed
// response — resolves `{ ok: true }` and logs a warning. The limiter NEVER
// throws and NEVER blocks legitimate traffic on an infra hiccup; availability
// is prioritized over strict enforcement when the store is down.
//
// This module is a network seam (like `github.ts`): the live Upstash calls are
// excluded from coverage thresholds (A8). The pure key-builder (`./keys`) and
// the fail-open branch are unit-tested with injected stubs / absent env.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { LIMITER_CONFIGS, type LimiterName } from "./limits";

export type { LimiterName } from "./limits";
export * from "./keys";

export type RateLimitResult = {
  /** True when the request is within the window (always true on fail-open). */
  ok: boolean;
  /** Configured limit for the window (0 when the limiter is disabled). */
  limit: number;
  /** Remaining requests in the current window (0 when disabled). */
  remaining: number;
  /** Unix-ms timestamp when the window resets (0 when disabled). */
  reset: number;
};

// Allow verdict returned on every fail-open path. No counters available, so the
// numeric fields are zeroed — callers key off `ok` only.
const ALLOW: RateLimitResult = { ok: true, limit: 0, remaining: 0, reset: 0 };

// Lazily-built limiter set. `undefined` = not yet attempted; `null` = env
// absent (limiter disabled, fail-open); otherwise the per-surface limiters.
let limiterSet: Record<LimiterName, Ratelimit> | null | undefined;

function buildLimiterSet(): Record<LimiterName, Ratelimit> | null {
  if (limiterSet !== undefined) return limiterSet;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN absent — " +
        "rate limiting disabled (fail-open). Set both to enable enforcement.",
    );
    limiterSet = null;
    return null;
  }

  const redis = new Redis({ url, token });
  const built = {} as Record<LimiterName, Ratelimit>;
  for (const name of Object.keys(LIMITER_CONFIGS) as LimiterName[]) {
    const { limit, window } = LIMITER_CONFIGS[name];
    built[name] = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, window),
      prefix: `pdv-rl:${name}`,
      analytics: false,
    });
  }
  limiterSet = built;
  return built;
}

/**
 * Check the named limiter for `key`. Returns a structured verdict; resolves
 * `{ ok: true }` (fail-open) whenever the store is unconfigured or errors.
 */
export async function checkRateLimit(
  name: LimiterName,
  key: string,
): Promise<RateLimitResult> {
  try {
    const limiters = buildLimiterSet();
    if (!limiters) return ALLOW; // env absent → disabled, fail-open

    const { success, limit, remaining, reset } = await limiters[name].limit(key);
    return { ok: success, limit, remaining, reset };
  } catch (err) {
    console.warn(`[rate-limit] limiter "${name}" failed — failing open.`, err);
    return ALLOW;
  }
}
