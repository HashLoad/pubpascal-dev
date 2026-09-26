// Shared test fixtures for the rule suites (not a test file itself).
// A deterministic context whose injected fetch replays a queue of results — no
// network. Once drained it returns a per-file 404, so "every candidate 404s" is
// the natural exhaustion case. Any context field is overridable.

import type { FetchResult, PublishValidationContext } from "../types";

export function ctxReturning(
  results: FetchResult[],
  overrides: Partial<PublishValidationContext> = {},
): PublishValidationContext {
  const queue = [...results];
  return {
    packageId: "p",
    repositoryUrl: "https://github.com/o/r",
    name: "n",
    slug: "s",
    licenseType: "open_source",
    licenseName: "MIT",
    platforms: [],
    languages: [],
    fetchRepoFile: async () => queue.shift() ?? { ok: false, reason: "http" },
    ...overrides,
  };
}

export const ok = (body: string): FetchResult => ({ ok: true, body });
export const http: FetchResult = { ok: false, reason: "http" };
export const notGithub: FetchResult = { ok: false, reason: "not-github" };
export const timeout: FetchResult = { ok: false, reason: "timeout" };
export const tooLarge: FetchResult = { ok: false, reason: "too-large" };
