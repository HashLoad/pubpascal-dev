// has_pascal_sources — repository section, 15 pts.
//
// Raw file fetch cannot enumerate sources, so the primary signal is the package's
// DECLARED language (Delphi / Lazarus / Object Pascal — captured at publish).
// Failing that, a `boss.json` (a Delphi package manifest) is a strong repo-side
// proxy. When neither is present we cannot disprove it via raw fetch → warn
// (unverified), never a hard fail.

import type { PublishValidationContext, ValidationRule } from "../types";
import { probeFiles, rule } from "./shared";

const RULE_KEY = "has_pascal_sources";

// Pascal-family languages (C++ Builder is C++, so it is intentionally excluded).
export const PASCAL_LANGUAGES = [
  "delphi",
  "lazarus",
  "object pascal",
  "pascal",
  "free pascal",
  "fpc",
] as const;

export function declaresPascal(languages: string[]): boolean {
  return languages.some((l) =>
    (PASCAL_LANGUAGES as readonly string[]).includes(l.trim().toLowerCase()),
  );
}

export const pascalSourcesValidator = {
  key: RULE_KEY,
  run: (ctx: PublishValidationContext): Promise<ValidationRule> => {
    if (declaresPascal(ctx.languages)) {
      return Promise.resolve(
        rule(RULE_KEY, "pass", `declares ${ctx.languages.join(", ")}`),
      );
    }
    return probeFiles(
      ctx,
      RULE_KEY,
      ["boss.json"],
      () => rule(RULE_KEY, "pass", "boss.json present"),
      rule(RULE_KEY, "warn", "unverified (cannot enumerate sources)"),
    );
  },
};
