import { describe, it, expect } from "vitest";
import { stripMarkdown } from "@/lib/markdown";

describe("stripMarkdown", () => {
  it("returns empty string for null, undefined and empty input", () => {
    expect(stripMarkdown(null)).toBe("");
    expect(stripMarkdown(undefined)).toBe("");
    expect(stripMarkdown("")).toBe("");
  });

  it("removes fenced code blocks", () => {
    expect(stripMarkdown("before\n```\ncode\n```\nafter")).toBe("before after");
  });

  it("unwraps inline code", () => {
    expect(stripMarkdown("use `npm test` now")).toBe("use npm test now");
  });

  it("removes images", () => {
    expect(stripMarkdown("see ![alt](x.png) here")).toBe("see here");
  });

  it("reduces a link to its label", () => {
    expect(stripMarkdown("[label](https://example.com)")).toBe("label");
  });

  it("removes heading markers", () => {
    expect(stripMarkdown("# Title")).toBe("Title");
    expect(stripMarkdown("### Sub")).toBe("Sub");
  });

  it("removes blockquote markers", () => {
    expect(stripMarkdown("> quote")).toBe("quote");
  });

  it("removes bullet markers", () => {
    expect(stripMarkdown("- item")).toBe("item");
    expect(stripMarkdown("* item")).toBe("item");
    expect(stripMarkdown("+ item")).toBe("item");
  });

  it("strips bold, italic and strikethrough markers", () => {
    expect(stripMarkdown("**bold**")).toBe("bold");
    expect(stripMarkdown("_italic_")).toBe("italic");
    expect(stripMarkdown("~~strike~~")).toBe("strike");
  });

  it("collapses whitespace runs and trims", () => {
    expect(stripMarkdown("  a    b  ")).toBe("a b");
  });
});
