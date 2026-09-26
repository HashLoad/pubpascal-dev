// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PartnerCard, { type PartnerCardItem } from "./PartnerCard";

function makePartner(overrides: Partial<PartnerCardItem> = {}): PartnerCardItem {
  return {
    id: "partner-1",
    name: "Acme Corp",
    logo_url: null,
    website_url: "https://acme.example",
    description: "A short description",
    tier: null,
    ...overrides,
  };
}

describe("PartnerCard", () => {
  it("renders the partner name", () => {
    render(<PartnerCard partner={makePartner({ name: "Acme Corp" })} />);
    expect(screen.getAllByText("Acme Corp").length).toBeGreaterThan(0);
  });

  it("renders the website link href", () => {
    render(
      <PartnerCard partner={makePartner({ website_url: "https://site.example" })} />,
    );
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://site.example",
    );
  });

  it("renders the logo image when a logo_url is provided", () => {
    render(
      <PartnerCard
        partner={makePartner({ logo_url: "https://cdn.example/logo.png", name: "Logo Co" })}
      />,
    );
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://cdn.example/logo.png",
    );
  });

  it.each([
    ["platinum", "ring-slate-400"],
    ["gold", "ring-yellow-500"],
    ["silver", "ring-slate-500"],
    ["bronze", "ring-orange-600"],
  ])("applies the %s tier ring class", (tier, ringClass) => {
    render(<PartnerCard partner={makePartner({ tier })} />);
    const badge = screen.getByLabelText(`Tier: ${tier}`);
    expect(badge.className).toContain(ringClass);
  });

  it("capitalizes the tier label", () => {
    render(<PartnerCard partner={makePartner({ tier: "gold" })} />);
    expect(screen.getByText("Gold")).toBeInTheDocument();
  });

  it("renders an unknown tier badge with no ring class", () => {
    render(<PartnerCard partner={makePartner({ tier: "diamond" })} />);
    const badge = screen.getByLabelText("Tier: diamond");
    expect(badge.className).not.toContain("ring-");
  });

  it("does not render a tier badge when tier is null", () => {
    render(<PartnerCard partner={makePartner({ tier: null })} />);
    expect(screen.queryByLabelText(/Tier:/)).toBeNull();
  });

  it("renders a short description verbatim", () => {
    render(<PartnerCard partner={makePartner({ description: "Concise text" })} />);
    expect(screen.getByText("Concise text")).toBeInTheDocument();
  });

  it("truncates a description longer than 200 chars with an ellipsis", () => {
    const long = "x".repeat(250);
    render(<PartnerCard partner={makePartner({ description: long })} />);
    const node = screen.getByText(/x+…$/);
    expect(node.textContent).toMatch(/…$/);
    expect(node.textContent!.length).toBeLessThan(long.length);
    expect(node.textContent!.length).toBe(200);
  });

  it("does not crash and renders no description paragraph when description is null", () => {
    render(<PartnerCard partner={makePartner({ description: null })} />);
    expect(screen.getByRole("link")).toBeInTheDocument();
    expect(screen.queryByText(/x+…$/)).toBeNull();
  });
});
