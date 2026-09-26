import { describe, it, expect } from "vitest";
import {
  countNonBlankLines,
  classifyFetch,
  getReadmeOutcome,
  readmeValidator,
  README_MIN_NON_BLANK_LINES,
} from "@/lib/publish-validation/rules/readme";
import type {
  FetchResult,
  PublishValidationContext,
  PublishValidationReport,
} from "@/lib/publish-validation/types";

function body(lines: number): string {
  return Array.from({ length: lines }, (_, i) => `line ${i}`).join("\n");
}

// A deterministic context whose injected fetch replays a queue of results — no
// network (BR2). The README rule reads only `fetchRepoFile`; the other context
// fields are filler.
function ctxReturning(results: FetchResult[]): PublishValidationContext {
  const queue = [...results];
  return {
    packageId: "p",
    repositoryUrl: "https://github.com/o/r",
    name: "n",
    slug: "s",
    licenseType: "MIT",
    licenseName: "MIT",
    platforms: [],
    languages: [],
    fetchRepoFile: async () => queue.shift() ?? { ok: false, reason: "http" },
  };
}

function report(rules: PublishValidationReport["rules"]): PublishValidationReport {
  return {
    schema_version: 1,
    verdict: "approved",
    rules,
    generated_at: "2026-06-02T00:00:00.000Z",
  };
}

describe("countNonBlankLines", () => {
  it("counts non-blank lines split on \\n", () => {
    expect(countNonBlankLines("a\nb\nc")).toBe(3);
  });

  it("ignores blank and whitespace-only lines across \\n and \\r\\n", () => {
    expect(countNonBlankLines("a\n\nb")).toBe(2);
    expect(countNonBlankLines("a\r\n  \r\nb")).toBe(2);
  });

  it("returns 0 for empty or all-whitespace input", () => {
    expect(countNonBlankLines("")).toBe(0);
    expect(countNonBlankLines("   \n\t\n")).toBe(0);
  });
});

describe("classifyFetch", () => {
  it(`passes ok body with >= ${README_MIN_NON_BLANK_LINES} non-blank lines`, () => {
    const decision = classifyFetch({ ok: true, body: body(README_MIN_NON_BLANK_LINES) });
    expect(decision.advance).toBe(false);
    expect(decision.advance === false && decision.rule.outcome).toBe("pass");
  });

  it("fails ok body below the minimum", () => {
    const decision = classifyFetch({ ok: true, body: body(README_MIN_NON_BLANK_LINES - 1) });
    expect(decision.advance).toBe(false);
    expect(decision.advance === false && decision.rule.outcome).toBe("fail");
  });

  it("passes a too-large body", () => {
    const decision = classifyFetch({ ok: false, reason: "too-large" });
    expect(decision.advance).toBe(false);
    expect(decision.advance === false && decision.rule.outcome).toBe("pass");
  });

  it("warns for a not-github repository", () => {
    const decision = classifyFetch({ ok: false, reason: "not-github" });
    expect(decision.advance).toBe(false);
    expect(decision.advance === false && decision.rule.outcome).toBe("warn");
  });

  it("warns for timeout and unknown fetch errors", () => {
    for (const reason of ["timeout", "unknown"] as const) {
      const decision = classifyFetch({ ok: false, reason });
      expect(decision.advance).toBe(false);
      expect(decision.advance === false && decision.rule.outcome).toBe("warn");
    }
  });

  it("advances on a per-file http error", () => {
    const decision = classifyFetch({ ok: false, reason: "http" });
    expect(decision.advance).toBe(true);
  });
});

describe("getReadmeOutcome", () => {
  it("returns the has_readme outcome from a report", () => {
    expect(getReadmeOutcome(report([{ key: "has_readme", outcome: "pass" }]))).toBe(
      "pass",
    );
  });

  it("returns null for null and undefined", () => {
    expect(getReadmeOutcome(null)).toBeNull();
    expect(getReadmeOutcome(undefined)).toBeNull();
  });

  it("returns null when the report has no rules array", () => {
    const noRules = {
      schema_version: 1,
      verdict: "approved",
      generated_at: "2026-06-02T00:00:00.000Z",
    } as unknown as PublishValidationReport;
    expect(getReadmeOutcome(noRules)).toBeNull();
  });

  it("returns null when has_readme is missing", () => {
    expect(getReadmeOutcome(report([{ key: "has_license", outcome: "pass" }]))).toBeNull();
  });
});

describe("readmeValidator.run", () => {
  it("returns the decisive rule from the first candidate", async () => {
    const ctx = ctxReturning([{ ok: true, body: body(README_MIN_NON_BLANK_LINES) }]);
    const result = await readmeValidator.run(ctx);
    expect(result.key).toBe("has_readme");
    expect(result.outcome).toBe("pass");
  });

  it("advances past per-file 404s to a later decisive candidate", async () => {
    const ctx = ctxReturning([
      { ok: false, reason: "http" },
      { ok: false, reason: "http" },
      { ok: true, body: body(README_MIN_NON_BLANK_LINES) },
    ]);
    const result = await readmeValidator.run(ctx);
    expect(result.outcome).toBe("pass");
  });

  it("fails with no README found when every candidate 404s", async () => {
    const ctx = ctxReturning([]); // every fetch falls back to { ok:false, reason:"http" }
    const result = await readmeValidator.run(ctx);
    expect(result.outcome).toBe("fail");
    expect(result.detail).toBe("no README found");
  });
});
