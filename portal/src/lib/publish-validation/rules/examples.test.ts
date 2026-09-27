import { describe, it, expect } from "vitest";
import { examplesValidator } from "@/lib/publish-validation/rules/examples";
import { ctxReturning, ok, http, notGithub } from "./test-helpers";

describe("examplesValidator.run", () => {
  it("passes when an examples entry file is present", async () => {
    const r = await examplesValidator.run(ctxReturning([http, ok("# Examples")]));
    expect(r).toMatchObject({ key: "has_examples", outcome: "pass" });
  });
  it("fails when no examples are found", async () => {
    expect((await examplesValidator.run(ctxReturning([]))).outcome).toBe("fail");
  });
  it("warns a non-GitHub repository", async () => {
    expect((await examplesValidator.run(ctxReturning([notGithub]))).outcome).toBe("warn");
  });
});
