import { describe, it, expect } from "vitest";
import {
  changelogValidator,
  classifyChangelog,
} from "@/lib/publish-validation/rules/changelog";
import { ctxReturning, ok, http, notGithub } from "./test-helpers";

describe("classifyChangelog", () => {
  it("passes a non-empty changelog", () => {
    expect(classifyChangelog("# Changelog\n- v1").outcome).toBe("pass");
  });
  it("warns a present-but-empty changelog", () => {
    expect(classifyChangelog("  \n\n").outcome).toBe("warn");
  });
});

describe("changelogValidator.run", () => {
  it("passes the first present candidate", async () => {
    const r = await changelogValidator.run(ctxReturning([ok("# Changelog\n- v1")]));
    expect(r).toMatchObject({ key: "has_changelog", outcome: "pass" });
  });
  it("advances past 404s to a later candidate", async () => {
    const r = await changelogValidator.run(ctxReturning([http, http, ok("- v1")]));
    expect(r.outcome).toBe("pass");
  });
  it("fails when every candidate 404s", async () => {
    expect((await changelogValidator.run(ctxReturning([]))).outcome).toBe("fail");
  });
  it("warns a non-GitHub repository", async () => {
    expect((await changelogValidator.run(ctxReturning([notGithub]))).outcome).toBe("warn");
  });
});
