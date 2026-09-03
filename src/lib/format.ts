// Single parameterized compact-number formatter (ADR-146). Replaces four
// near-duplicate local helpers (`PackageCard.formatDownloads`,
// `PackageListRow.fmt`, `ScoresPanel.formatNumber`,
// `PackageMetaSidebar.formatNumber`) that diverged in decimals, millions
// support, and null display. Each call site passes the options needed to
// reproduce its exact prior output (BR1) — no harmonization. Client-safe: no
// `server-only` import (renders in client/sync components).

export type FormatCompactOptions = {
  decimals?: number;
  millions?: boolean;
  nullDisplay?: string;
};

export function formatCompact(
  value: number | null | undefined,
  opts?: FormatCompactOptions,
): string {
  const { decimals = 1, millions = true, nullDisplay = "0" } = opts ?? {};
  if (value === null || value === undefined) return nullDisplay;
  if (millions && value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(decimals)}M`;
  }
  if (value >= 1_000) return `${(value / 1_000).toFixed(decimals)}k`;
  return String(value);
}
