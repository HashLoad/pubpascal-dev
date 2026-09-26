// @vitest-environment jsdom
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { computePubPoints, type ValidationReport } from "@/utils/pubPoints";
import ScoresPanel, { type ScoresLabels } from "./ScoresPanel";

// `pkg` is typed from the component's own prop type so the synthetic fixture
// never imports the server-only `query.ts` (AC-12). Only the fields ScoresPanel
// reads are supplied; the cast is sound because PackageDetail is assignable to
// the partial.
type PanelPkg = React.ComponentProps<typeof ScoresPanel>["pkg"];

const LABELS: ScoresLabels = {
  breakdownTitle: "Breakdown",
  cards: { score: "Score", stars: "Stars", downloads: "Downloads", highlight: "Highlight" },
  tiers: { gold: "Gold", silver: "Silver", bronze: "Bronze", none: "None" },
  sections: {},
  rules: {},
  outcomes: {},
  grantedOfMax: "{granted}/{max}",
  pointsLabel: "pts",
  notValidated: "Not validated yet",
  notSupported: "Not supported",
};

// A report exercising every RuleOutcome so each outcome icon path renders once.
const ALL_OUTCOMES_REPORT: ValidationReport = {
  rules: [
    { key: "repo_clonable", outcome: "pass" },
    { key: "has_pascal_sources", outcome: "warn" },
    { key: "has_readme", outcome: "fail" },
    { key: "has_changelog", outcome: "not_supported" },
    { key: "has_installing", outcome: "pass" },
    { key: "has_license", outcome: "warn" },
    { key: "has_examples", outcome: "fail" },
    { key: "has_images", outcome: "not_supported" },
  ],
};

function makePkg(overrides: Partial<PanelPkg> = {}): PanelPkg {
  return {
    highlight_level: "gold",
    stars: 1200,
    downloads: 2500,
    validation_report: ALL_OUTCOMES_REPORT,
    ...overrides,
  } as PanelPkg;
}

describe("ScoresPanel", () => {
  it("renders the total score out of 100 from computePubPoints", () => {
    const total = computePubPoints(ALL_OUTCOMES_REPORT).total;
    render(<ScoresPanel pkg={makePkg()} labels={LABELS} />);
    expect(screen.getByText(`${total}/100`)).toBeInTheDocument();
  });

  it.each([
    ["gold", "Gold", "text-amber-300"],
    ["silver", "Silver", "text-slate-200"],
    ["bronze", "Bronze", "text-amber-300"],
    ["none", "None", "text-slate-400"],
  ])(
    "renders the %s tier label and class",
    (level, label, className) => {
      const { container } = render(
        <ScoresPanel
          pkg={makePkg({ highlight_level: level as PanelPkg["highlight_level"] })}
          labels={LABELS}
        />,
      );
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(container.querySelector(`.${CSS.escape(className)}`)).not.toBeNull();
    },
  );

  it("formats null numbers as an em dash", () => {
    render(<ScoresPanel pkg={makePkg({ stars: null })} labels={LABELS} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("formats numbers >= 1000 with a k suffix", () => {
    render(<ScoresPanel pkg={makePkg({ downloads: 2500 })} labels={LABELS} />);
    expect(screen.getByText("2.5k")).toBeInTheDocument();
  });

  it("renders the raw number below 1000", () => {
    render(<ScoresPanel pkg={makePkg({ stars: 42 })} labels={LABELS} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders one icon path per rule outcome", () => {
    const { container } = render(
      <ScoresPanel pkg={makePkg()} labels={LABELS} />,
    );
    expect(container.querySelector(".text-green-400")).not.toBeNull(); // pass
    expect(container.querySelector(".text-amber-400")).not.toBeNull(); // warn
    expect(container.querySelector(".text-rose-400")).not.toBeNull(); // fail
    expect(container.querySelector(".text-slate-500")).not.toBeNull(); // not_supported
  });

  it("renders the breakdown title when the report has rules", () => {
    render(<ScoresPanel pkg={makePkg()} labels={LABELS} />);
    expect(screen.getByText("Breakdown")).toBeInTheDocument();
  });

  it("shows the not-validated message when the report is null", () => {
    render(<ScoresPanel pkg={makePkg({ validation_report: null })} labels={LABELS} />);
    expect(screen.getByText("Not validated yet")).toBeInTheDocument();
    expect(screen.queryByText("Breakdown")).toBeNull();
  });

  it("shows the not-supported message when the verdict is not_supported", () => {
    render(
      <ScoresPanel
        pkg={makePkg({ validation_report: { verdict: "not_supported", rules: [] } })}
        labels={LABELS}
      />,
    );
    expect(screen.getByText("Not supported")).toBeInTheDocument();
    expect(screen.queryByText("Breakdown")).toBeNull();
  });
});
