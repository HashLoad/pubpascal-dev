import { describe, it, expect } from "vitest";
import { installingValidator } from "@/lib/publish-validation/rules/installing";
import { ctxReturning, ok, http, notGithub, timeout } from "./test-helpers";

describe("installingValidator.run", () => {
  it("passes when an install guide (or boss.json) is present", async () => {
    const r = await installingValidator.run(ctxReturning([ok("## Install\nboss install ...")]));
    expect(r).toMatchObject({ key: "has_installing", outcome: "pass" });
  });
  it("advances past 404s to a later candidate (e.g. boss.json)", async () => {
    const r = await installingValidator.run(ctxReturning([http, http, ok("{}")]));
    expect(r.outcome).toBe("pass");
  });
  it("fails when nothing is found", async () => {
    expect((await installingValidator.run(ctxReturning([]))).outcome).toBe("fail");
  });
  it("warns on fetch errors", async () => {
    expect((await installingValidator.run(ctxReturning([timeout]))).outcome).toBe("warn");
    expect((await installingValidator.run(ctxReturning([notGithub]))).outcome).toBe("warn");
  });
});
