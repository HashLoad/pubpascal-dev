// CRA-readiness — the trust signal beyond a bare "has SBOM" badge.
//
// The EU Cyber Resilience Act expects more than a component inventory: a
// vulnerability-handling / security-disclosure process and an actively
// maintained product receiving security updates. This composes the signals the
// portal can verify today; the vulnerability-scan signal (the CLI's OSV `pkg
// scan`) joins once its results are stored. Pure + deterministic — the I/O
// (GitHub probe, SBOM lookup) happens at the call site and is passed in.

export type CraSignals = {
  // A published Software Bill of Materials (CRA technical documentation).
  sbom: boolean;
  // A SECURITY.md — a vulnerability-disclosure policy + contact (CRA CVD).
  securityPolicy: boolean;
  // A recent release — a proxy for "actively maintained / receives updates".
  maintained: boolean;
};

export type CraReadiness = {
  signals: CraSignals;
  met: number;
  total: number;
  // The seal score, 0–100 — `met / total` as a percentage toward full compliance.
  pct: number;
  complete: boolean;
};

// The three locations GitHub officially recognizes for a security policy
// (root, .github/, docs/). Probed in parallel at the call site, so a repo
// without one costs a single round-trip's latency, not three.
export const SECURITY_POLICY_CANDIDATES = [
  "SECURITY.md",
  ".github/SECURITY.md",
  "docs/SECURITY.md",
] as const;

// A release within this window counts as "actively maintained".
export const MAINTAINED_MONTHS = 18;

// True when the latest release is within MAINTAINED_MONTHS of `now`. A missing
// date is treated as not-maintained (we cannot confirm an update cadence).
export function isMaintained(
  latestReleaseDate: string | null | undefined,
  now: Date,
): boolean {
  if (!latestReleaseDate) return false;
  const released = new Date(latestReleaseDate);
  if (Number.isNaN(released.getTime())) return false;
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - MAINTAINED_MONTHS);
  return released >= cutoff;
}

export function computeReadiness(signals: CraSignals): CraReadiness {
  const met = Number(signals.sbom) + Number(signals.securityPolicy) + Number(signals.maintained);
  const total = 3;
  return {
    signals,
    met,
    total,
    pct: Math.round((met / total) * 100),
    complete: met === total,
  };
}
