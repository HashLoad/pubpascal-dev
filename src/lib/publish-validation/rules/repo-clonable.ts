// repo_clonable — repository section, 15 pts.
//
// A reachable, public repository: if ANY conventional file fetches successfully
// the repo is online and clonable → pass. A raw 404 on every probe cannot
// distinguish "repo missing" from "repo present but lacks these files", and a
// non-GitHub host cannot be checked this way — both warn rather than hard-fail.

import type { PublishValidationContext, ValidationRule } from "../types";
import { probeFiles, rule } from "./shared";

const RULE_KEY = "repo_clonable";

export const PROBE_CANDIDATES = [
  "README.md",
  "readme.md",
  "boss.json",
  "LICENSE",
  ".gitignore",
] as const;

export const repoClonableValidator = {
  key: RULE_KEY,
  run: (ctx: PublishValidationContext): Promise<ValidationRule> =>
    probeFiles(
      ctx,
      RULE_KEY,
      PROBE_CANDIDATES,
      () => rule(RULE_KEY, "pass", "repository reachable"),
      rule(RULE_KEY, "warn", "unverified (no probe file reachable)"),
    ),
};
