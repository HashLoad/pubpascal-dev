// Per-surface rate-limit configuration (ESP-002, BR9 / ADR-132 / A5).
// Every window/limit value lives here as a named constant so the operator can
// tune a surface without touching any call site (AC-12). Pure data module — no
// runtime dependency on the Upstash client, so it stays cheap to unit-test.

// Sliding-window duration accepted by `@upstash/ratelimit`'s `slidingWindow`
// algorithm (e.g. "10 m", "1 h"). Mirrored locally to keep this module free of
// the Upstash runtime import; the value is validated against the library type
// at the construction site in `index.ts`.
export type Duration = `${number} ${"ms" | "s" | "m" | "h" | "d"}`;

// One named limiter per logical surface + identity dimension. `tokens-create`
// and `tokens-revoke` are distinct limiters (different windows) keyed on the
// same `tokens:user:<uid>` identity; the manifest route uses two dimensions
// (per-token and per-IP) so a single abusive IP cannot exhaust every token.
export type LimiterName =
  | "publish"
  | "tokens-create"
  | "tokens-revoke"
  | "manifest-token"
  | "manifest-ip"
  | "sbom-ip"
  | "partner-apply";

export type LimiterConfig = {
  /** Maximum allowed requests within the sliding window. */
  limit: number;
  /** Sliding-window length. */
  window: Duration;
};

// Default starting limits (A5) — sensible, not load-tested; the operator tunes
// them post-launch (A7) by editing only this table.
export const LIMITER_CONFIGS: Record<LimiterName, LimiterConfig> = {
  publish: { limit: 10, window: "10 m" },
  "tokens-create": { limit: 5, window: "1 h" },
  "tokens-revoke": { limit: 30, window: "1 h" },
  "manifest-token": { limit: 60, window: "1 m" },
  "manifest-ip": { limit: 120, window: "1 m" },
  "sbom-ip": { limit: 120, window: "1 m" },
  "partner-apply": { limit: 3, window: "1 h" },
};
