// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import VersionsList from "./VersionsList";
import type { PackageVersion } from "@/app/[lang]/packages/[slug]/query";

// MarkdownView pulls in marked/highlight.js/sanitize-html — irrelevant here and
// heavy. Stub it to a plain element so the test stays fast and focused.
vi.mock("./MarkdownView", () => ({
  default: ({ source }: { source: string }) => <div>{source}</div>,
}));

const versions: PackageVersion[] = [
  { id: "v-1", version: "1.0.0", release_notes: null, download_url: null, created_at: "2026-01-01" },
  { id: "v-2", version: "2.0.0+build", release_notes: null, download_url: null, created_at: "2026-02-01" },
];

describe("VersionsList — SBOM affordance", () => {
  it("renders an SBOM link only for versions that have one, pointing at the repo's raw SBOM URL", () => {
    render(
      <VersionsList
        versions={versions}
        sbomByVersion={{ "v-1": "cyclonedx" }}
        sbomDownloadUrls={{ "v-1": "https://raw.githubusercontent.com/me/pkg/main/sbom/sbom.cdx.json" }}
      />,
    );

    const link = screen.getByRole("link", { name: /SBOM/i });
    // href is the raw repo SBOM URL (live from the repo, no DB route).
    expect(link).toHaveAttribute(
      "href",
      "https://raw.githubusercontent.com/me/pkg/main/sbom/sbom.cdx.json",
    );
    expect(link).toHaveTextContent("CycloneDX");

    // Exactly one SBOM link — v-2 has no SBOM, so no second link.
    expect(screen.getAllByRole("link", { name: /SBOM/i })).toHaveLength(1);
  });

  it("renders the SPDX label and raw URL for an SPDX SBOM", () => {
    render(
      <VersionsList
        versions={versions}
        sbomByVersion={{ "v-2": "spdx" }}
        sbomDownloadUrls={{ "v-2": "https://raw.githubusercontent.com/me/pkg/main/sbom/sbom.spdx.json" }}
      />,
    );
    const link = screen.getByRole("link", { name: /SBOM/i });
    expect(link).toHaveAttribute(
      "href",
      "https://raw.githubusercontent.com/me/pkg/main/sbom/sbom.spdx.json",
    );
    expect(link).toHaveTextContent("SPDX");
  });

  it("renders no SBOM link when there is no download URL for the version", () => {
    render(<VersionsList versions={versions} sbomByVersion={{ "v-1": "cyclonedx" }} />);
    expect(screen.queryByRole("link", { name: /SBOM/i })).toBeNull();
  });

  it("renders no SBOM link when the map is empty", () => {
    render(<VersionsList versions={versions} sbomByVersion={{}} />);
    expect(screen.queryByRole("link", { name: /SBOM/i })).toBeNull();
  });
});
