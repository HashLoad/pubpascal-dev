import { describe, it, expect } from "vitest";
import {
  imagesValidator,
  classifyImages,
} from "@/lib/publish-validation/rules/images";
import { ctxReturning, ok, notGithub } from "./test-helpers";

describe("classifyImages", () => {
  it("passes markdown image syntax", () => {
    expect(classifyImages("see ![logo](docs/logo.png)").outcome).toBe("pass");
  });
  it("passes an <img> tag", () => {
    expect(classifyImages('<img src="x.png" />').outcome).toBe("pass");
  });
  it("fails a README without images", () => {
    expect(classifyImages("# Title\njust text").outcome).toBe("fail");
  });
});

describe("imagesValidator.run", () => {
  it("passes when the README embeds an image", async () => {
    const r = await imagesValidator.run(ctxReturning([ok("![](a.png)")]));
    expect(r).toMatchObject({ key: "has_images", outcome: "pass" });
  });
  it("fails a README with no images", async () => {
    expect((await imagesValidator.run(ctxReturning([ok("text only")]))).outcome).toBe("fail");
  });
  it("fails when there is no README to inspect", async () => {
    expect((await imagesValidator.run(ctxReturning([]))).outcome).toBe("fail");
  });
  it("warns a non-GitHub repository", async () => {
    expect((await imagesValidator.run(ctxReturning([notGithub]))).outcome).toBe("warn");
  });
});
