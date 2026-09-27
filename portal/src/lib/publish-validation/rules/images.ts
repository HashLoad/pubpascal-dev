// has_images — examples section, 8 pts.
//
// Visual documentation: the README embeds at least one image (screenshot, logo,
// diagram, or badge). We fetch the README and scan its body — a found image
// passes; a README without images fails; no README fails. Errors warn.

import type { PublishValidationContext, ValidationRule } from "../types";
import { hasImageReference, probeFiles, rule } from "./shared";

const RULE_KEY = "has_images";

export const README_FOR_IMAGES = [
  "README.md",
  "readme.md",
  "README.markdown",
  "README",
] as const;

export function classifyImages(body: string): ValidationRule {
  return hasImageReference(body)
    ? rule(RULE_KEY, "pass", "image(s) in README")
    : rule(RULE_KEY, "fail", "no images in README");
}

export const imagesValidator = {
  key: RULE_KEY,
  run: (ctx: PublishValidationContext): Promise<ValidationRule> =>
    probeFiles(
      ctx,
      RULE_KEY,
      README_FOR_IMAGES,
      classifyImages,
      rule(RULE_KEY, "fail", "no README to inspect"),
    ),
};
