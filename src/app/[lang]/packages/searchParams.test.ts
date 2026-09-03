import { describe, it, expect } from "vitest";
import {
  parseSearchParams,
  escapeIlikePattern,
  buildPackagesUrl,
  DEFAULT_SORT,
} from "@/app/[lang]/packages/searchParams";

describe("parseSearchParams", () => {
  it("clamps page to >= 1 for non-numeric, zero and negative input", () => {
    expect(parseSearchParams({ page: "abc" }).page).toBe(1);
    expect(parseSearchParams({ page: "0" }).page).toBe(1);
    expect(parseSearchParams({ page: "-5" }).page).toBe(1);
  });

  it("keeps a valid page number", () => {
    expect(parseSearchParams({ page: "3" }).page).toBe(3);
  });

  it("trims q", () => {
    expect(parseSearchParams({ q: "  hello  " }).q).toBe("hello");
  });

  it("maps out-of-allowlist platform, language and category to null", () => {
    expect(parseSearchParams({ platform: "Solaris" }).platform).toBeNull();
    expect(parseSearchParams({ language: "Rust" }).language).toBeNull();
    expect(parseSearchParams({ category: "Blockchain" }).category).toBeNull();
  });

  it("keeps allowlisted platform, language and category", () => {
    expect(parseSearchParams({ platform: "Windows" }).platform).toBe("Windows");
    expect(parseSearchParams({ language: "Delphi" }).language).toBe("Delphi");
    expect(parseSearchParams({ category: "ORM" }).category).toBe("ORM");
  });

  it("picks the first element of an array-valued param", () => {
    expect(parseSearchParams({ q: ["first", "second"] }).q).toBe("first");
  });

  it("parses a valid sort and falls back to the default otherwise", () => {
    expect(parseSearchParams({ sort: "newest" }).sort).toBe("newest");
    expect(parseSearchParams({ sort: "stars" }).sort).toBe("stars");
    expect(parseSearchParams({ sort: "downloads" }).sort).toBe(DEFAULT_SORT);
    expect(parseSearchParams({}).sort).toBe(DEFAULT_SORT);
  });
});

describe("escapeIlikePattern", () => {
  it("escapes backslash, percent and underscore", () => {
    expect(escapeIlikePattern("a\\b%c_d")).toBe("a\\\\b\\%c\\_d");
  });
});

describe("buildPackagesUrl", () => {
  it("returns /packages when no params are set", () => {
    expect(buildPackagesUrl({})).toBe("/packages");
  });

  it("omits page=1 (the default)", () => {
    expect(buildPackagesUrl({ page: 1 })).toBe("/packages");
  });

  it("omits an empty q", () => {
    expect(buildPackagesUrl({ q: "", page: 1 })).toBe("/packages");
  });

  it("emits a single set param", () => {
    expect(buildPackagesUrl({ q: "foo" })).toBe("/packages?q=foo");
  });

  it("emits all set params in order", () => {
    expect(
      buildPackagesUrl({
        q: "x",
        platform: "Windows",
        language: "Delphi",
        category: "ORM",
        page: 2,
      }),
    ).toBe("/packages?q=x&platform=Windows&language=Delphi&category=ORM&page=2");
  });

  it("omits the default sort but emits a non-default one", () => {
    expect(buildPackagesUrl({ sort: DEFAULT_SORT })).toBe("/packages");
    expect(buildPackagesUrl({ sort: "stars", lang: "en" })).toBe(
      "/en/packages?sort=stars",
    );
  });
});
