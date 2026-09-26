import { describe, it, expect } from "vitest";
import {
  computePubPoints,
  RULE_ORDER,
  type ValidationReport,
  type RuleOutcome,
} from "@/utils/pubPoints";

const SECTION_KEYS = ["repository", "documentation", "conventions", "examples"];

function reportWith(outcomes: Record<string, RuleOutcome>): ValidationReport {
  return {
    rules: Object.entries(outcomes).map(([key, outcome]) => ({ key, outcome })),
  };
}

function allOutcomes(outcome: RuleOutcome): ValidationReport {
  const outcomes: Record<string, RuleOutcome> = {};
  for (const key of RULE_ORDER) outcomes[key] = outcome;
  return reportWith(outcomes);
}

function sumGranted(sections: { granted: number }[]): number {
  return sections.reduce((acc, s) => acc + s.granted, 0);
}

describe("computePubPoints", () => {
  it("yields a zeroed but complete result for null", () => {
    const points = computePubPoints(null);
    expect(points.total).toBe(0);
    expect(points.max).toBe(100);
    expect(points.verdict).toBeNull();
    expect(points.sections.map((s) => s.key)).toEqual(SECTION_KEYS);
    expect(points.sections.every((s) => s.granted === 0)).toBe(true);
  });

  it("does not throw on malformed input and stays zeroed", () => {
    for (const bad of ["garbage", 42, { rules: "nope" }, [], undefined]) {
      const points = computePubPoints(bad);
      expect(points.total).toBe(0);
      expect(points.sections).toHaveLength(SECTION_KEYS.length);
    }
  });

  it("scores an all-pass report at 100", () => {
    expect(computePubPoints(allOutcomes("pass")).total).toBe(100);
  });

  it("grants half weight (floored) for a warn", () => {
    // has_readme has max 15 → warn grants floor(15 / 2) = 7.
    const points = computePubPoints(reportWith({ has_readme: "warn" }));
    expect(points.total).toBe(7);
  });

  it("keeps total equal to the sum of section granted and clamped to 0..100", () => {
    for (const report of [
      computePubPoints(null),
      computePubPoints(allOutcomes("pass")),
      computePubPoints(allOutcomes("warn")),
      computePubPoints(reportWith({ has_readme: "warn", has_license: "pass" })),
    ]) {
      expect(report.total).toBe(sumGranted(report.sections));
      expect(report.total).toBeGreaterThanOrEqual(0);
      expect(report.total).toBeLessThanOrEqual(100);
    }
  });

  it("echoes a valid verdict and nulls an invalid one", () => {
    expect(computePubPoints({ verdict: "approved", rules: [] }).verdict).toBe(
      "approved",
    );
    expect(computePubPoints({ verdict: "rejected", rules: [] }).verdict).toBe(
      "rejected",
    );
    expect(
      computePubPoints({ verdict: "bogus", rules: [] }).verdict,
    ).toBeNull();
  });
});
