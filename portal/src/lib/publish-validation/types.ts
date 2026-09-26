// Publish-time validation framework — type contract (ESP-002, ADR-042).
//
// Reuses the canonical validation shape from `@/utils/pubPoints` (single source of
// truth for verdict/outcome/rule unions — never redeclared here). Adds the
// publish-time-only context + validator interface and the persisted report shape.
//
// This module is pure and decoupled: it must NOT import any `src/app/**` route
// file. The repo-fetch capability is injected via `PublishValidationContext`
// (the call site wires `fetchGithubRaw`), keeping the framework unit-testable.

import type {
  RuleOutcome,
  ValidationVerdict,
  ValidationRule,
  ValidationReport,
} from "@/utils/pubPoints";

// Re-export the canonical types so consumers of the framework import them from one
// place. No verdict/outcome union is redeclared.
export type {
  RuleOutcome,
  ValidationVerdict,
  ValidationRule,
  ValidationReport,
};

// Structural mirror of `FetchResult` in
// `src/app/[lang]/packages/[slug]/github.ts`. Declared locally (not imported) so
// the lib stays free of any route-file dependency (ADR-042 / AC9).
export type FetchResult =
  | { ok: true; body: string }
  | {
      ok: false;
      reason: "timeout" | "http" | "too-large" | "not-github" | "unknown";
    };

// Everything a validator may inspect about the package being published, plus the
// injected capability to read a file from its repository. A future rule (README
// gate, Demand 2/2) calls `fetchRepoFile("README.md")`.
export type PublishValidationContext = {
  packageId: string;
  repositoryUrl: string;
  name: string;
  slug: string;
  licenseType: string;
  licenseName: string;
  platforms: string[];
  languages: string[];
  fetchRepoFile: (filename: string) => Promise<FetchResult>;
};

// A single pluggable rule. Registering a new rule is appending one of these to
// `PUBLISH_VALIDATORS` in `registry.ts` — the publish call site never changes.
export type PublishValidator = {
  key: string;
  run: (ctx: PublishValidationContext) => Promise<ValidationRule>;
};

// Persisted shape written to `package_publish_validation.report`. Aligned with the
// Esteira `validation_report` (`schema_version` + `generated_at` stamped by the
// runner; `verdict` + `rules` always present).
export type PublishValidationReport = Required<
  Pick<ValidationReport, "verdict" | "rules">
> & {
  schema_version: 1;
  generated_at: string;
};
