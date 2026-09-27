// Pub Points: render-time scoring derived from the Esteira `validation_report`.
// Single source of truth for the 0–100 score shown across the portal (Scores tab,
// detail sidebar, catalog list row). Pure + null/malformed-tolerant — no I/O.
// Scoring model locked by ADR-033 (Epic 9/9 — Demand 3/6).

export const RULE_ORDER = [
  "has_readme",
  "has_changelog",
  "has_examples",
  "has_installing",
  "has_images",
  "has_pascal_sources",
  "has_license",
  "repo_clonable",
] as const;

export type RuleKey = (typeof RULE_ORDER)[number];

export type RuleOutcome = "pass" | "fail" | "warn" | "not_supported";

export type ValidationVerdict =
  | "approved"
  | "approved_with_warnings"
  | "rejected"
  | "not_supported";

export type ValidationRule = {
  key: string;
  outcome: RuleOutcome;
  detail?: string;
};

export type ValidationReport = {
  verdict?: ValidationVerdict;
  rules?: ValidationRule[];
  // validate.mjs also emits schema_version / slug / repository_url / generated_at,
  // which the scoring model ignores.
};

export type SectionKey = "repository" | "documentation" | "conventions" | "examples";

export type PubPointsRule = {
  key: RuleKey;
  outcome: RuleOutcome;
  points: number;
  max: number;
};

export type PubPointsSection = {
  key: SectionKey;
  granted: number;
  max: number;
  rules: PubPointsRule[];
};

export type PubPoints = {
  total: number;
  max: 100;
  verdict: ValidationVerdict | null;
  sections: PubPointsSection[];
};

// Weight per rule, grouped by section. Sums to exactly 100. Locked by ADR-033.
const SECTION_MODEL: { key: SectionKey; rules: { key: RuleKey; max: number }[] }[] = [
  {
    key: "repository",
    rules: [
      { key: "repo_clonable", max: 15 },
      { key: "has_pascal_sources", max: 15 },
    ],
  },
  {
    key: "documentation",
    rules: [
      { key: "has_readme", max: 15 },
      { key: "has_changelog", max: 10 },
      { key: "has_installing", max: 10 },
    ],
  },
  {
    key: "conventions",
    rules: [{ key: "has_license", max: 15 }],
  },
  {
    key: "examples",
    rules: [
      { key: "has_examples", max: 12 },
      { key: "has_images", max: 8 },
    ],
  },
];

const VALID_VERDICTS: ValidationVerdict[] = [
  "approved",
  "approved_with_warnings",
  "rejected",
  "not_supported",
];

function normalizeOutcome(value: unknown): RuleOutcome {
  return value === "pass" || value === "warn" || value === "not_supported"
    ? value
    : "fail";
}

// pass → full weight; warn → half (floor); fail / not_supported / missing → 0.
function pointsForOutcome(outcome: RuleOutcome, max: number): number {
  if (outcome === "pass") return max;
  if (outcome === "warn") return Math.floor(max / 2);
  return 0;
}

function readOutcomes(report: unknown): Map<string, RuleOutcome> {
  const byKey = new Map<string, RuleOutcome>();
  if (!report || typeof report !== "object") return byKey;
  const rules = (report as { rules?: unknown }).rules;
  if (!Array.isArray(rules)) return byKey;
  for (const rule of rules) {
    if (
      rule &&
      typeof rule === "object" &&
      typeof (rule as { key?: unknown }).key === "string"
    ) {
      byKey.set(
        (rule as { key: string }).key,
        normalizeOutcome((rule as { outcome?: unknown }).outcome),
      );
    }
  }
  return byKey;
}

function readVerdict(report: unknown): ValidationVerdict | null {
  if (!report || typeof report !== "object") return null;
  const verdict = (report as { verdict?: unknown }).verdict;
  return VALID_VERDICTS.includes(verdict as ValidationVerdict)
    ? (verdict as ValidationVerdict)
    : null;
}

/**
 * Compute the 0–100 Pub Points from an Esteira `validation_report`.
 * Pure and tolerant: `null`/malformed input yields `total: 0` with every section
 * present and zero-granted (no throw). `total` always equals the sum of section `granted`.
 */
export function computePubPoints(report: unknown): PubPoints {
  const outcomes = readOutcomes(report);

  let total = 0;
  const sections: PubPointsSection[] = SECTION_MODEL.map((section) => {
    let granted = 0;
    let sectionMax = 0;
    const rules: PubPointsRule[] = section.rules.map((rule) => {
      const outcome = outcomes.get(rule.key) ?? "fail";
      const points = pointsForOutcome(outcome, rule.max);
      granted += points;
      sectionMax += rule.max;
      return { key: rule.key, outcome, points, max: rule.max };
    });
    total += granted;
    return { key: section.key, granted, max: sectionMax, rules };
  });

  return {
    total: Math.max(0, Math.min(100, total)),
    max: 100,
    verdict: readVerdict(report),
    sections,
  };
}
