// has_license — conventions section, 15 pts.
//
// A LICENSE file in the repo is the convention and passes outright. If there is
// no file but the publisher DECLARED a license at publish (a required field),
// that is a partial signal → warn. Neither → fail.

import type { PublishValidationContext, ValidationRule } from "../types";
import { probeFiles, rule } from "./shared";

const RULE_KEY = "has_license";

export const LICENSE_CANDIDATES = [
  "LICENSE",
  "LICENSE.md",
  "LICENSE.txt",
  "LICENSE.markdown",
  "LICENCE",
  "COPYING",
] as const;

export const licenseValidator = {
  key: RULE_KEY,
  run: (ctx: PublishValidationContext): Promise<ValidationRule> => {
    const declared = (ctx.licenseName ?? "").trim().length > 0;
    return probeFiles(
      ctx,
      RULE_KEY,
      LICENSE_CANDIDATES,
      () => rule(RULE_KEY, "pass", "LICENSE file present"),
      declared
        ? rule(RULE_KEY, "warn", `declared (${ctx.licenseName}) but no LICENSE file`)
        : rule(RULE_KEY, "fail", "no license"),
    );
  },
};
