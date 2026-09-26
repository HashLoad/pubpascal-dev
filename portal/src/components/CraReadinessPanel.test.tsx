// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CraReadinessPanel from "./CraReadinessPanel";
import { computeReadiness } from "@/lib/cra/readiness";

const dict = {
  heading: "CRA-readiness",
  metOf: "{met} of {total} signals",
  complete: "Fully CRA-ready",
  explainer: "Trust signals for the EU CRA.",
  sbom: "Software Bill of Materials",
  securityPolicy: "Security policy",
  maintained: "Actively maintained",
};

describe("CraReadinessPanel", () => {
  it("renders the signal rows and the met/total summary", () => {
    const readiness = computeReadiness({
      sbom: true,
      securityPolicy: false,
      maintained: true,
    });
    render(<CraReadinessPanel readiness={readiness} dict={dict} />);
    expect(screen.getByText("CRA-readiness")).toBeInTheDocument();
    expect(screen.getByText("2 of 3 signals")).toBeInTheDocument();
    expect(screen.getByText("Software Bill of Materials")).toBeInTheDocument();
    expect(screen.getByText("Security policy")).toBeInTheDocument();
    expect(screen.getByText("Actively maintained")).toBeInTheDocument();
  });

  it("shows 0% and 0 of 3 when no signal is met", () => {
    const readiness = computeReadiness({
      sbom: false,
      securityPolicy: false,
      maintained: false,
    });
    render(<CraReadinessPanel readiness={readiness} dict={dict} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("0 of 3 signals")).toBeInTheDocument();
  });

  it("shows 100% and the complete seal label when all signals are met", () => {
    const readiness = computeReadiness({
      sbom: true,
      securityPolicy: true,
      maintained: true,
    });
    render(<CraReadinessPanel readiness={readiness} dict={dict} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.getByText("Fully CRA-ready")).toBeInTheDocument();
  });
});
