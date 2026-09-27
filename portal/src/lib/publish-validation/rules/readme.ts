// README gate — the first concrete publish-time validation rule (ESP-002, ADR-044).
//
// Probes an ordered list of candidate README filenames through the injected
// `ctx.fetchRepoFile` (the call site wires `fetchGithubRaw`), counts non-blank
// lines, and maps the result to pass / warn / fail. Pure + deterministic decision
// logic — `run` only sequences the injected fetch; classification lives in
// side-effect-free helpers (`countNonBlankLines`, `classifyFetch`).
//
// Decoupled per ADR-042: imports nothing from `src/app/**`, no Supabase, no
// `server-only`. Only the local type contract from `../types`.

import type {
  FetchResult,
  PublishValidationContext,
  PublishValidationReport,
  PublishValidator,
  RuleOutcome,
  ValidationRule,
} from "../types";

// Canonical rule key (matches `pubPoints.RULE_ORDER` and the dictionary labels, BR6).
const RULE_KEY = "has_readme";

// A README must have at least this many non-blank lines to pass (BR2). Tunable in
// one place — not env/config (ESP "Assumptions").
export const README_MIN_NON_BLANK_LINES = 10;

// Candidate filenames probed in order (case-sensitive — `raw.githubusercontent.com`
// is case-sensitive). Probing stops on the first decisive result (BR7).
export const README_CANDIDATES = [
  "README.md",
  "readme.md",
  "README.markdown",
  "README.MD",
  "README",
  "README.txt",
  "Readme.md",
] as const;

// Pure: count lines that are non-empty after trimming. `\r\n` and `\n` both split.
export function countNonBlankLines(body: string): number {
  let count = 0;
  for (const line of body.split(/\r?\n/)) {
    if (line.trim().length > 0) count += 1;
  }
  return count;
}

function rule(outcome: RuleOutcome, detail: string): ValidationRule {
  return { key: RULE_KEY, outcome, detail };
}

// Decision over a single fetch result. `advance` → the candidate was a per-file
// 404 (`http`); try the next one. Anything else is terminal.
type Classification =
  | { advance: true }
  | { advance: false; rule: ValidationRule };

// Pure classification of one `FetchResult` (BR2/BR3/BR7).
export function classifyFetch(result: FetchResult): Classification {
  if (result.ok) {
    const lines = countNonBlankLines(result.body);
    if (lines >= README_MIN_NON_BLANK_LINES) {
      return { advance: false, rule: rule("pass", `${lines} non-blank lines`) };
    }
    return {
      advance: false,
      rule: rule("fail", `below minimum (${lines} lines)`),
    };
  }

  switch (result.reason) {
    case "too-large":
      // >200 KB README is substantial → treat as present (BR3).
      return { advance: false, rule: rule("pass", "README present (large)") };
    case "not-github":
      return {
        advance: false,
        rule: rule("warn", "unverified (non-GitHub repository)"),
      };
    case "timeout":
    case "unknown":
      return { advance: false, rule: rule("warn", "unverified (fetch error)") };
    case "http":
      // Per-file 404 (or other non-2xx) — advance to the next candidate.
      return { advance: true };
  }
}

export const readmeValidator: PublishValidator = {
  key: RULE_KEY,
  async run(ctx: PublishValidationContext): Promise<ValidationRule> {
    for (const candidate of README_CANDIDATES) {
      const result = await ctx.fetchRepoFile(candidate);
      const decision = classifyFetch(result);
      if (!decision.advance) return decision.rule;
    }
    // Every candidate returned `http` (all 404) → no README found (BR2).
    return rule("fail", "no README found");
  },
};

// Pure accessor: extract the `has_readme` outcome from a persisted report.
// Returns null when no report / no such rule (used by the surfacing layer).
export function getReadmeOutcome(
  report: PublishValidationReport | null | undefined,
): RuleOutcome | null {
  if (!report || !Array.isArray(report.rules)) return null;
  const found = report.rules.find((r) => r.key === RULE_KEY);
  return found ? found.outcome : null;
}
