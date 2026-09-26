// has_installing — documentation section, 10 pts.
//
// A dedicated install guide OR a `boss.json` (the Delphi package manifest, which
// makes the package one-command installable) passes. Every candidate 404ing
// fails. Non-GitHub / fetch errors warn (via `probeFiles`).

import type { PublishValidationContext, ValidationRule } from "../types";
import { probeFiles, rule } from "./shared";

const RULE_KEY = "has_installing";

export const INSTALLING_CANDIDATES = [
  "INSTALL.md",
  "INSTALLING.md",
  "INSTALL",
  "docs/INSTALL.md",
  "doc/INSTALL.md",
  "boss.json",
] as const;

export const installingValidator = {
  key: RULE_KEY,
  run: (ctx: PublishValidationContext): Promise<ValidationRule> =>
    probeFiles(
      ctx,
      RULE_KEY,
      INSTALLING_CANDIDATES,
      () => rule(RULE_KEY, "pass", "install path present"),
      rule(RULE_KEY, "fail", "no install guide or boss.json"),
    ),
};
