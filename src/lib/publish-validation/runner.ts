// Publish-time validation runner (ESP-002, ADR-042).
//
// Pure + injectable: runs the supplied validators (defaults to the registry),
// collects their `ValidationRule` results, and aggregates a verdict with the SAME
// semantics as `scripts/esteira/validate.mjs` (`fail` → `rejected`; else any
// `warn` → `approved_with_warnings`; else `approved`). Stamps `schema_version: 1`
// + `generated_at`. With an empty registry the result is `approved` + `rules: []`.
//
// No Supabase, no `server-only`, no `src/app/**` import — keeps the runner
// unit-testable with synthetic validators.

import { PUBLISH_VALIDATORS } from "./registry";
import type {
  PublishValidationContext,
  PublishValidationReport,
  PublishValidator,
  ValidationRule,
  ValidationVerdict,
} from "./types";

// Mirrors `aggregateVerdict` in validate.mjs (minus the repo_clonable
// `not_supported` short-circuit, which is rule-specific and has no registered
// rule this demand). Empty rules → `approved`.
function aggregateVerdict(rules: ValidationRule[]): ValidationVerdict {
  if (rules.some((r) => r.outcome === "fail")) return "rejected";
  if (rules.some((r) => r.outcome === "warn")) return "approved_with_warnings";
  return "approved";
}

export async function runPublishValidation(
  ctx: PublishValidationContext,
  validators: PublishValidator[] = PUBLISH_VALIDATORS,
): Promise<PublishValidationReport> {
  const rules: ValidationRule[] = [];
  for (const validator of validators) {
    rules.push(await validator.run(ctx));
  }

  return {
    schema_version: 1,
    verdict: aggregateVerdict(rules),
    rules,
    generated_at: new Date().toISOString(),
  };
}
