// Publish-time validator registry (ESP-002, ADR-042, BR3).
//
// THIS IS THE SINGLE PLACE TO REGISTER A NEW RULE. Append a `PublishValidator`
// here and the runner picks it up automatically — the publish call site
// (`submitPackage`) is closed for modification when rules are added.
//
// Order mirrors `pubPoints.RULE_ORDER` for a stable report; the runner stamps
// each result and the Pub Points model weights them by section.

import type { PublishValidator } from "./types";
import { readmeValidator } from "./rules/readme";
import { changelogValidator } from "./rules/changelog";
import { examplesValidator } from "./rules/examples";
import { installingValidator } from "./rules/installing";
import { imagesValidator } from "./rules/images";
import { pascalSourcesValidator } from "./rules/pascal-sources";
import { licenseValidator } from "./rules/license";
import { repoClonableValidator } from "./rules/repo-clonable";

export const PUBLISH_VALIDATORS: PublishValidator[] = [
  readmeValidator,
  changelogValidator,
  examplesValidator,
  installingValidator,
  imagesValidator,
  pascalSourcesValidator,
  licenseValidator,
  repoClonableValidator,
];
