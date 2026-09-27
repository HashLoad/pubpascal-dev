import { describe, it, expect } from "vitest";
import { formatCompact } from "@/lib/format";

// Each profile mirrors one original call site. Expected strings are
// cross-checked against the prior local-function output to prove byte-identical
// behavior (BR1/AC-11). Boundaries: 999, 1000, 999_999, 1_000_000 (+ 1500 and
// 2_000_000 to exercise rounding and the millions branch).

describe("formatCompact", () => {
  describe("defaults — PackageListRow.fmt / PackageMetaSidebar.formatNumber", () => {
    // { decimals: 1, millions: true, nullDisplay: "0" }
    it("returns nullDisplay '0' for null and undefined", () => {
      expect(formatCompact(null)).toBe("0");
      expect(formatCompact(undefined)).toBe("0");
    });

    it("keeps values below 1000 raw", () => {
      expect(formatCompact(0)).toBe("0");
      expect(formatCompact(42)).toBe("42");
      expect(formatCompact(999)).toBe("999");
    });

    it("uses a k suffix with one decimal from 1000", () => {
      expect(formatCompact(1000)).toBe("1.0k");
      expect(formatCompact(1500)).toBe("1.5k");
      expect(formatCompact(999_999)).toBe("1000.0k");
    });

    it("uses an M suffix with one decimal from 1_000_000", () => {
      expect(formatCompact(1_000_000)).toBe("1.0M");
      expect(formatCompact(2_000_000)).toBe("2.0M");
    });
  });

  describe("PackageCard.formatDownloads — { decimals: 0, millions: false }", () => {
    const opts = { decimals: 0, millions: false };

    it("returns '0' for null and undefined", () => {
      expect(formatCompact(null, opts)).toBe("0");
      expect(formatCompact(undefined, opts)).toBe("0");
    });

    it("keeps values below 1000 raw", () => {
      expect(formatCompact(999, opts)).toBe("999");
    });

    it("uses a k suffix with zero decimals and rounds", () => {
      expect(formatCompact(1000, opts)).toBe("1k");
      expect(formatCompact(1200, opts)).toBe("1k");
      expect(formatCompact(1500, opts)).toBe("2k");
      expect(formatCompact(999_999, opts)).toBe("1000k");
    });

    it("never switches to M when millions is disabled", () => {
      expect(formatCompact(1_000_000, opts)).toBe("1000k");
      expect(formatCompact(2_000_000, opts)).toBe("2000k");
    });
  });

  describe("ScoresPanel.formatNumber — { millions: false, nullDisplay: '—' }", () => {
    const opts = { millions: false, nullDisplay: "—" };

    it("returns the em dash for null and undefined", () => {
      expect(formatCompact(null, opts)).toBe("—");
      expect(formatCompact(undefined, opts)).toBe("—");
    });

    it("keeps values below 1000 raw", () => {
      expect(formatCompact(42, opts)).toBe("42");
      expect(formatCompact(999, opts)).toBe("999");
    });

    it("uses a k suffix with one decimal and never M", () => {
      expect(formatCompact(1000, opts)).toBe("1.0k");
      expect(formatCompact(2500, opts)).toBe("2.5k");
      expect(formatCompact(999_999, opts)).toBe("1000.0k");
      expect(formatCompact(1_000_000, opts)).toBe("1000.0k");
    });
  });

  describe("option boundaries", () => {
    it("respects an explicit decimals override on the M branch", () => {
      expect(formatCompact(1_500_000, { decimals: 2 })).toBe("1.50M");
    });

    it("treats exactly 1000 as the k threshold", () => {
      expect(formatCompact(999, { decimals: 0 })).toBe("999");
      expect(formatCompact(1000, { decimals: 0 })).toBe("1k");
    });
  });
});
