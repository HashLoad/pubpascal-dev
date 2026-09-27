import { describe, it, expect } from "vitest";
import {
  pascalSourcesValidator,
  declaresPascal,
} from "@/lib/publish-validation/rules/pascal-sources";
import { ctxReturning, ok, notGithub } from "./test-helpers";

describe("declaresPascal", () => {
  it("recognizes Delphi / Lazarus (case-insensitive)", () => {
    expect(declaresPascal(["Delphi"])).toBe(true);
    expect(declaresPascal(["lazarus"])).toBe(true);
  });
  it("excludes C++ Builder", () => {
    expect(declaresPascal(["C++ Builder"])).toBe(false);
  });
});

describe("pascalSourcesValidator.run", () => {
  it("passes when the package declares a Pascal language", async () => {
    const r = await pascalSourcesValidator.run(
      ctxReturning([], { languages: ["Delphi"] }),
    );
    expect(r).toMatchObject({ key: "has_pascal_sources", outcome: "pass" });
  });
  it("passes on a boss.json when no Pascal language is declared", async () => {
    const r = await pascalSourcesValidator.run(
      ctxReturning([ok("{}")], { languages: [] }),
    );
    expect(r.outcome).toBe("pass");
  });
  it("warns (unverified) when neither signal is present", async () => {
    const r = await pascalSourcesValidator.run(ctxReturning([], { languages: [] }));
    expect(r.outcome).toBe("warn");
  });
  it("warns a non-GitHub repository", async () => {
    const r = await pascalSourcesValidator.run(
      ctxReturning([notGithub], { languages: [] }),
    );
    expect(r.outcome).toBe("warn");
  });
});
