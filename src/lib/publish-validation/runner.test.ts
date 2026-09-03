import { describe, it, expect } from "vitest";
import { runPublishValidation } from "@/lib/publish-validation/runner";
import type {
  PublishValidationContext,
  PublishValidator,
  RuleOutcome,
} from "@/lib/publish-validation/types";

// Stub context — fetchRepoFile is never invoked by the synthetic validators
// below, and resolves deterministically without any network access (BR2/BR3).
const ctx: PublishValidationContext = {
  packageId: "pkg-1",
  repositoryUrl: "https://github.com/o/r",
  name: "Pkg",
  slug: "pkg",
  licenseType: "open",
  licenseName: "MIT",
  platforms: ["Windows"],
  languages: ["Delphi"],
  fetchRepoFile: async () => ({ ok: false, reason: "unknown" }),
};

function validator(key: string, outcome: RuleOutcome): PublishValidator {
  return { key, run: async () => ({ key, outcome }) };
}

describe("runPublishValidation", () => {
  it("returns approved with empty rules for no validators", async () => {
    const report = await runPublishValidation(ctx, []);
    expect(report.verdict).toBe("approved");
    expect(report.rules).toEqual([]);
    expect(report.schema_version).toBe(1);
    expect(typeof report.generated_at).toBe("string");
  });

  it("rejects when any validator fails", async () => {
    const report = await runPublishValidation(ctx, [
      validator("a", "pass"),
      validator("b", "fail"),
      validator("c", "warn"),
    ]);
    expect(report.verdict).toBe("rejected");
  });

  it("approves with warnings when a warn but no fail is present", async () => {
    const report = await runPublishValidation(ctx, [
      validator("a", "pass"),
      validator("b", "warn"),
    ]);
    expect(report.verdict).toBe("approved_with_warnings");
  });

  it("approves when every validator passes", async () => {
    const report = await runPublishValidation(ctx, [
      validator("a", "pass"),
      validator("b", "pass"),
    ]);
    expect(report.verdict).toBe("approved");
  });

  it("preserves validator order in the rules array", async () => {
    const report = await runPublishValidation(ctx, [
      validator("a", "pass"),
      validator("b", "pass"),
      validator("c", "pass"),
    ]);
    expect(report.rules.map((r) => r.key)).toEqual(["a", "b", "c"]);
  });
});
