import { describe, it, expect } from "vitest";
import { isMaintained, computeReadiness } from "@/lib/cra/readiness";

const NOW = new Date("2026-06-09T00:00:00.000Z");

describe("isMaintained", () => {
  it("is true for a release within 18 months", () => {
    expect(isMaintained("2026-01-01T00:00:00Z", NOW)).toBe(true);
    expect(isMaintained("2025-01-01T00:00:00Z", NOW)).toBe(true); // 17 months
  });

  it("is false for an older release", () => {
    expect(isMaintained("2024-06-01T00:00:00Z", NOW)).toBe(false); // 24 months
  });

  it("is false for a missing or invalid date", () => {
    expect(isMaintained(null, NOW)).toBe(false);
    expect(isMaintained(undefined, NOW)).toBe(false);
    expect(isMaintained("not-a-date", NOW)).toBe(false);
  });
});

describe("computeReadiness", () => {
  it("counts the met signals out of 3", () => {
    expect(
      computeReadiness({ sbom: true, securityPolicy: true, maintained: true }).met,
    ).toBe(3);
    expect(
      computeReadiness({ sbom: true, securityPolicy: false, maintained: true }).met,
    ).toBe(2);
    expect(
      computeReadiness({ sbom: false, securityPolicy: false, maintained: false }),
    ).toMatchObject({ met: 0, total: 3 });
  });

  it("derives the seal percentage and the complete flag", () => {
    expect(
      computeReadiness({ sbom: true, securityPolicy: true, maintained: true }),
    ).toMatchObject({ pct: 100, complete: true });
    expect(
      computeReadiness({ sbom: true, securityPolicy: false, maintained: false }),
    ).toMatchObject({ pct: 33, complete: false });
    expect(
      computeReadiness({ sbom: false, securityPolicy: false, maintained: false }),
    ).toMatchObject({ pct: 0, complete: false });
  });
});
