import { describe, it, expect } from "vitest";
// Only the pure URL helpers are imported and exercised — never a `fetch*`
// export (AC-07 / BR3). Importing the module evaluates the `cache(...)`
// wrappers but fires no request.
import { isGithubRepo, repoTreeUrl } from "@/app/[lang]/packages/[slug]/github";

describe("isGithubRepo", () => {
  it("is true for a canonical GitHub URL", () => {
    expect(isGithubRepo("https://github.com/o/r")).toBe(true);
  });

  it("is true for a .git suffix", () => {
    expect(isGithubRepo("https://github.com/o/r.git")).toBe(true);
  });

  it("is true with a trailing slash", () => {
    expect(isGithubRepo("https://github.com/o/r/")).toBe(true);
  });

  it("is false for null, undefined and empty input", () => {
    expect(isGithubRepo(null)).toBe(false);
    expect(isGithubRepo(undefined)).toBe(false);
    expect(isGithubRepo("")).toBe(false);
  });

  it("is false for a non-GitHub URL", () => {
    expect(isGithubRepo("https://gitlab.com/o/r")).toBe(false);
  });
});

describe("repoTreeUrl", () => {
  it("builds a tree URL at HEAD for a GitHub URL", () => {
    expect(repoTreeUrl("https://github.com/owner/repo", "src/lib")).toBe(
      "https://github.com/owner/repo/tree/HEAD/src/lib",
    );
  });

  it("echoes the input unchanged for a non-GitHub URL", () => {
    expect(repoTreeUrl("https://gitlab.com/o/r", "src")).toBe(
      "https://gitlab.com/o/r",
    );
  });
});
