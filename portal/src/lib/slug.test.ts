import { describe, it, expect } from "vitest";
import {
  deriveSlug,
  isValidSlug,
  SLUG_MIN_LENGTH,
  SLUG_MAX_LENGTH,
} from "@/lib/slug";

describe("deriveSlug", () => {
  it("lowercases the input", () => {
    expect(deriveSlug("HELLO")).toBe("hello");
  });

  it("strips diacritics", () => {
    expect(deriveSlug("Açãô Test")).toBe("acao-test");
  });

  it("collapses runs of non-alphanumerics to a single hyphen", () => {
    expect(deriveSlug("foo   bar!!!baz")).toBe("foo-bar-baz");
  });

  it("trims leading and trailing hyphens", () => {
    expect(deriveSlug("  --Hello World--  ")).toBe("hello-world");
  });
});

describe("isValidSlug", () => {
  it(`rejects slugs below SLUG_MIN_LENGTH (${SLUG_MIN_LENGTH})`, () => {
    expect(isValidSlug("ab")).toBe(false);
  });

  it("accepts a slug exactly at SLUG_MIN_LENGTH", () => {
    expect(isValidSlug("a".repeat(SLUG_MIN_LENGTH))).toBe(true);
  });

  it(`rejects slugs above SLUG_MAX_LENGTH (${SLUG_MAX_LENGTH})`, () => {
    expect(isValidSlug("a".repeat(SLUG_MAX_LENGTH + 1))).toBe(false);
  });

  it("accepts a slug exactly at SLUG_MAX_LENGTH", () => {
    expect(isValidSlug("a".repeat(SLUG_MAX_LENGTH))).toBe(true);
  });

  it("rejects a leading hyphen", () => {
    expect(isValidSlug("-abc")).toBe(false);
  });

  it("rejects a trailing hyphen", () => {
    expect(isValidSlug("abc-")).toBe(false);
  });

  it("rejects double hyphens", () => {
    expect(isValidSlug("ab--cd")).toBe(false);
  });

  it("rejects invalid characters", () => {
    expect(isValidSlug("abc_def")).toBe(false);
    expect(isValidSlug("Abc")).toBe(false);
  });

  it("accepts a canonical slug", () => {
    expect(isValidSlug("my-package-name")).toBe(true);
  });
});
