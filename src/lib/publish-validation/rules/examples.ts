// has_examples — examples section, 12 pts.
//
// Raw file fetch cannot list a directory, so we probe the conventional entry
// files of an examples/samples/demo area. Any hit passes; all-404 fails.

import type { PublishValidationContext, ValidationRule } from "../types";
import { probeFiles, rule } from "./shared";

const RULE_KEY = "has_examples";

export const EXAMPLE_CANDIDATES = [
  "EXAMPLE.md",
  "EXAMPLES.md",
  "examples/README.md",
  "Examples/README.md",
  "samples/README.md",
  "Samples/README.md",
  "demo/README.md",
  "demos/README.md",
  "docs/examples.md",
] as const;

export const examplesValidator = {
  key: RULE_KEY,
  run: (ctx: PublishValidationContext): Promise<ValidationRule> =>
    probeFiles(
      ctx,
      RULE_KEY,
      EXAMPLE_CANDIDATES,
      () => rule(RULE_KEY, "pass", "examples present"),
      rule(RULE_KEY, "fail", "no examples found"),
    ),
};
