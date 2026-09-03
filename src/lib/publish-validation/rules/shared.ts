// Shared primitives for file-presence validation rules (ADR-042 pattern).
//
// The README gate (`readme.ts`) is the reference rule and stays self-contained
// (its 10-non-blank-line threshold is bespoke). Every OTHER rule is a
// "probe candidate files → classify" check, so the common loop + the non-ok
// `FetchResult` mapping live here once instead of being copy-pasted seven times.
//
// Pure + decoupled: imports only the local type contract — no `src/app/**`, no
// Supabase, no network. Each rule injects its `fetchRepoFile` via the context.

import type {
  PublishValidationContext,
  RuleOutcome,
  ValidationRule,
} from "../types";

export function rule(
  key: string,
  outcome: RuleOutcome,
  detail: string,
): ValidationRule {
  return { key, outcome, detail };
}

// Non-empty after trimming, split on \n and \r\n alike.
export function countNonBlankLines(body: string): number {
  let count = 0;
  for (const line of body.split(/\r?\n/)) {
    if (line.trim().length > 0) count += 1;
  }
  return count;
}

// Probe `candidates` in order through the injected fetch. A found body is handed
// to `onFound` (the rule's content classifier). The generic non-ok reasons map
// uniformly — matching the README gate: too-large → present, non-GitHub / fetch
// error → unverified (warn), per-file 404 → try the next candidate. When every
// candidate 404s, returns `absent` (the rule's "definitively missing" verdict).
export async function probeFiles(
  ctx: PublishValidationContext,
  key: string,
  candidates: readonly string[],
  onFound: (body: string) => ValidationRule,
  absent: ValidationRule,
): Promise<ValidationRule> {
  for (const candidate of candidates) {
    const result = await ctx.fetchRepoFile(candidate);
    if (result.ok) return onFound(result.body);
    switch (result.reason) {
      case "too-large":
        return rule(key, "pass", "present (large file)");
      case "not-github":
        return rule(key, "warn", "unverified (non-GitHub repository)");
      case "timeout":
      case "unknown":
        return rule(key, "warn", "unverified (fetch error)");
      case "http":
        break; // per-file 404 — advance to the next candidate
    }
  }
  return absent;
}

// True when the markdown body embeds at least one image (`![alt](url)` or <img>).
export function hasImageReference(body: string): boolean {
  return /!\[[^\]]*\]\([^)]+\)/.test(body) || /<img\b/i.test(body);
}
