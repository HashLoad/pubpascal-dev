import { describe, it, expect } from "vitest";
import { repoClonableValidator } from "@/lib/publish-validation/rules/repo-clonable";
import { ctxReturning, ok, http, notGithub, timeout, tooLarge } from "./test-helpers";

describe("repoClonableValidator.run", () => {
  it("passes when any probe file is reachable", async () => {
    const r = await repoClonableValidator.run(ctxReturning([ok("# Readme")]));
    expect(r).toMatchObject({ key: "repo_clonable", outcome: "pass" });
  });
  it("passes on a too-large file (host responded with content)", async () => {
    expect((await repoClonableValidator.run(ctxReturning([tooLarge]))).outcome).toBe("pass");
  });
  it("warns when every probe 404s (cannot confirm)", async () => {
    expect((await repoClonableValidator.run(ctxReturning([http, http]))).outcome).toBe("warn");
  });
  it("warns a non-GitHub host and fetch errors", async () => {
    expect((await repoClonableValidator.run(ctxReturning([notGithub]))).outcome).toBe("warn");
    expect((await repoClonableValidator.run(ctxReturning([timeout]))).outcome).toBe("warn");
  });
});
