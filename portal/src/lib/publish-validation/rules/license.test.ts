import { describe, it, expect } from "vitest";
import { licenseValidator } from "@/lib/publish-validation/rules/license";
import { ctxReturning, ok } from "./test-helpers";

describe("licenseValidator.run", () => {
  it("passes when a LICENSE file is present", async () => {
    const r = await licenseValidator.run(ctxReturning([ok("MIT License ...")]));
    expect(r).toMatchObject({ key: "has_license", outcome: "pass" });
  });
  it("warns when no LICENSE file but a license is declared", async () => {
    const r = await licenseValidator.run(ctxReturning([], { licenseName: "MIT" }));
    expect(r.outcome).toBe("warn");
  });
  it("fails when there is neither a file nor a declared license", async () => {
    const r = await licenseValidator.run(ctxReturning([], { licenseName: "" }));
    expect(r.outcome).toBe("fail");
  });
});
