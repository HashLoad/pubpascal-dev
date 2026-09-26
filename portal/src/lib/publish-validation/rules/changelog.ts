// has_changelog — documentation section, 10 pts (pubPoints SECTION_MODEL).
//
// Probes the usual changelog filenames. A non-empty file passes; an empty one
// warns; every candidate 404ing fails. Non-GitHub / fetch errors warn (handled
// by `probeFiles`). Pure decision logic; only the injected fetch is sequenced.

import type { PublishValidationContext, ValidationRule } from "../types";
import { countNonBlankLines, probeFiles, rule } from "./shared";

const RULE_KEY = "has_changelog";

export const CHANGELOG_CANDIDATES = [
  "CHANGELOG.md",
  "CHANGELOG",
  "CHANGELOG.markdown",
  "CHANGES.md",
  "HISTORY.md",
  "docs/CHANGELOG.md",
] as const;

export function classifyChangelog(body: string): ValidationRule {
  const lines = countNonBlankLines(body);
  return lines > 0
    ? rule(RULE_KEY, "pass", `${lines} non-blank lines`)
    : rule(RULE_KEY, "warn", "present but empty");
}

export const changelogValidator = {
  key: RULE_KEY,
  run: (ctx: PublishValidationContext): Promise<ValidationRule> =>
    probeFiles(
      ctx,
      RULE_KEY,
      CHANGELOG_CANDIDATES,
      classifyChangelog,
      rule(RULE_KEY, "fail", "no changelog found"),
    ),
};
