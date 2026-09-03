// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SbomCompliancePanel from "./SbomCompliancePanel";
import type { PackageSbomMeta } from "@/utils/queries/package-sbom";

const dict = {
  heading: "Software Bill of Materials",
  craBadge: "CRA-ready",
  explainer: "EU CRA explainer.",
  format: "Format",
  attestedBy: "Attested by",
  published: "Published",
  download: "Download SBOM",
  downloadsLabel: "Downloads",
};

function meta(overrides: Partial<PackageSbomMeta> = {}): PackageSbomMeta {
  return {
    format: "cyclonedx",
    spec_version: "1.5",
    author: "PubPascal CLI",
    created_at: "2026-06-09T12:00:00.000Z",
    updated_at: null,
    ...overrides,
  };
}

describe("SbomCompliancePanel", () => {
  it("surfaces the format with its spec version", () => {
    render(<SbomCompliancePanel sbom={meta()} dict={dict} locale="en" />);
    expect(screen.getByText("CycloneDX 1.5")).toBeInTheDocument();
    expect(screen.getByText("CRA-ready")).toBeInTheDocument();
    expect(screen.getByText("EU CRA explainer.")).toBeInTheDocument();
  });

  it("shows the attesting author/tool when present", () => {
    render(<SbomCompliancePanel sbom={meta()} dict={dict} locale="en" />);
    expect(screen.getByText("Attested by")).toBeInTheDocument();
    expect(screen.getByText("PubPascal CLI")).toBeInTheDocument();
  });

  it("omits the author and published rows when their data is absent", () => {
    render(
      <SbomCompliancePanel
        sbom={meta({ author: null, created_at: null })}
        dict={dict}
        locale="en"
      />,
    );
    expect(screen.queryByText("Attested by")).toBeNull();
    expect(screen.queryByText("Published")).toBeNull();
  });

  it("falls back to the bare format name when no spec version", () => {
    render(
      <SbomCompliancePanel
        sbom={meta({ format: "spdx", spec_version: null })}
        dict={dict}
        locale="en"
      />,
    );
    expect(screen.getByText("SPDX")).toBeInTheDocument();
  });

  it("renders a download link to the SBOM route when a href is given", () => {
    render(
      <SbomCompliancePanel
        sbom={meta()}
        dict={dict}
        locale="en"
        downloadHref="/api/packages/janus/2.20.2/sbom"
      />,
    );
    const link = screen.getByRole("link", { name: /Download SBOM/i });
    expect(link).toHaveAttribute("href", "/api/packages/janus/2.20.2/sbom");
  });

  it("omits the download link when no href is given", () => {
    render(<SbomCompliancePanel sbom={meta()} dict={dict} locale="en" />);
    expect(screen.queryByRole("link", { name: /Download SBOM/i })).toBeNull();
  });

  it("shows the download count when it is positive", () => {
    render(<SbomCompliancePanel sbom={meta()} dict={dict} locale="en" downloads={42} />);
    expect(screen.getByText("Downloads")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("hides the download count when zero or absent", () => {
    const { rerender } = render(
      <SbomCompliancePanel sbom={meta()} dict={dict} locale="en" downloads={0} />,
    );
    expect(screen.queryByText("Downloads")).toBeNull();
    rerender(<SbomCompliancePanel sbom={meta()} dict={dict} locale="en" />);
    expect(screen.queryByText("Downloads")).toBeNull();
  });
});
