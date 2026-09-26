// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PackageDetailHeader from "./PackageDetailHeader";
import type { PackageDetail } from "@/app/[lang]/packages/[slug]/query";

const pkg = {
  id: "p-1",
  publisher_id: "u-1",
  name: "Colligo",
  slug: "colligo",
  description: null,
  repository_url: "https://github.com/x/colligo",
  license_type: "open_source",
  license_name: "MIT",
  website_url: null,
  highlight_level: "none",
  platforms: null,
  languages: null,
  stars: 0,
  downloads: 0,
  score: 0,
  validation_report: null,
  created_at: null,
  updated_at: null,
} as unknown as PackageDetail;

describe("PackageDetailHeader — CRA-ready badge", () => {
  it("shows the CRA-ready badge when the package has an SBOM", () => {
    render(<PackageDetailHeader pkg={pkg} latestVersion={null} hasSbom />);
    expect(screen.getByText("CRA-ready")).toBeInTheDocument();
  });

  it("hides the badge when there is no SBOM", () => {
    render(<PackageDetailHeader pkg={pkg} latestVersion={null} hasSbom={false} />);
    expect(screen.queryByText("CRA-ready")).toBeNull();
  });

  it("defaults to no badge when hasSbom is omitted", () => {
    render(<PackageDetailHeader pkg={pkg} latestVersion={null} />);
    expect(screen.queryByText("CRA-ready")).toBeNull();
  });
});
