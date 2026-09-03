import { describe, it, expect } from "vitest";
import { localizedHref, SUPPORTED_LOCALES } from "./localized-href";

describe("localizedHref", () => {
  it("prefixes a locale-relative path with the active locale (AC-02)", () => {
    expect(localizedHref("/packages", "pt-BR")).toBe("/pt-BR/packages");
    expect(localizedHref("/packages/foo", "en")).toBe("/en/packages/foo");
  });

  it("collapses '/' to /{locale} with no trailing slash (AC-03)", () => {
    expect(localizedHref("/", "pt-BR")).toBe("/pt-BR");
    expect(localizedHref("/", "en")).toBe("/en");
  });

  it("treats an empty path like the root", () => {
    expect(localizedHref("", "pt-BR")).toBe("/pt-BR");
  });

  it("preserves query string and hash in the path (AC-04)", () => {
    expect(localizedHref("/packages?platform=Win64", "en")).toBe(
      "/en/packages?platform=Win64",
    );
    expect(localizedHref("/packages#top", "pt-BR")).toBe("/pt-BR/packages#top");
  });

  it("normalizes a path without a leading slash", () => {
    expect(localizedHref("packages", "en")).toBe("/en/packages");
  });

  it("only prefixes — it does not detect or strip an already-present locale (passthrough guard, AC-12)", () => {
    // The helper assumes a locale-relative path. A caller that passes an
    // already-prefixed path double-prefixes; callers must pass relative paths.
    expect(localizedHref("/en/packages", "pt-BR")).toBe("/pt-BR/en/packages");
  });

  it("exposes the supported locale list", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en", "pt-BR"]);
  });
});
