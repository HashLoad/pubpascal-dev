// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PackageCard, {
  type PackageCardItem,
  type TierLabels,
} from "./PackageCard";
import type { Locale } from "@/utils/localized-href";

// Mock the Next.js navigation boundary to a plain anchor (ADR-126): the card is
// synchronous and props-driven, so it needs no router/runtime — only an <a> that
// preserves `href` and the (className-bearing) rest props.
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  } & Record<string, unknown>) => (
    <a href={String(href)} {...rest}>
      {children}
    </a>
  ),
}));

function makeItem(overrides: Partial<PackageCardItem> = {}): PackageCardItem {
  return {
    id: "pkg-1",
    name: "Awesome Lib",
    slug: "awesome-lib",
    description: "Plain description",
    license_type: "open source",
    license_name: null,
    highlight_level: null,
    platforms: ["Win64", "Linux64"],
    downloads: 42,
    version: null,
    publisherUsername: null,
    ...overrides,
  };
}

// `tierLabels` is a required prop on the production component (no default —
// ADR-144). The test helper supplies a stable EN sample so unrelated tests
// aren't churned; the tier-badge tests override it per locale.
const DEFAULT_TIER_LABELS: TierLabels = {
  gold: "Gold Tier",
  silver: "Silver Tier",
  bronze: "Bronze Tier",
};
const PT_TIER_LABELS: TierLabels = {
  gold: "Destaque Gold",
  silver: "Destaque Silver",
  bronze: "Destaque Bronze",
};

// `lang` is a required prop (no implicit "en" default — ADR-142). Every render
// passes an explicit locale; tests that don't care about it use "en".
function renderCard(
  props: Omit<
    React.ComponentProps<typeof PackageCard>,
    "lang" | "tierLabels"
  > & {
    lang?: Locale;
    tierLabels?: TierLabels;
  },
) {
  const { lang = "en", tierLabels = DEFAULT_TIER_LABELS, ...rest } = props;
  return render(
    <PackageCard lang={lang} tierLabels={tierLabels} {...rest} />,
  );
}

describe("PackageCard", () => {
  it("renders the package name", () => {
    renderCard({ pkg: makeItem({ name: "My Package" }) });
    expect(screen.getByText("My Package")).toBeInTheDocument();
  });

  it("builds the slug link href as /{lang}/packages/{slug}", () => {
    renderCard({ pkg: makeItem({ slug: "my-pkg" }), lang: "pt-BR" });
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/pt-BR/packages/my-pkg",
    );
  });

  it("carries the active locale into the slug link", () => {
    renderCard({ pkg: makeItem({ slug: "my-pkg" }), lang: "en" });
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/en/packages/my-pkg",
    );
  });

  it("strips markdown markers from the description", () => {
    renderCard({
      pkg: makeItem({ description: "**Bold** and `code` text" }),
    });
    expect(screen.getByText("Bold and code text")).toBeInTheDocument();
    expect(screen.queryByText(/\*\*|`/)).toBeNull();
  });

  it("formats downloads >= 1000 with a k suffix", () => {
    // formatDownloads rounds via toFixed(0): 1200/1000 → "1k". (1500 would round
    // up to "2k" — the AC's "1500 → 1k" example predates this rounding; product
    // code is unchanged per BR1, so the test asserts the real output.)
    renderCard({ pkg: makeItem({ downloads: 1200 }) });
    expect(screen.getByText("📥 1k")).toBeInTheDocument();
  });

  it("renders 0 downloads when the count is null", () => {
    renderCard({ pkg: makeItem({ downloads: null }) });
    expect(screen.getByText("📥 0")).toBeInTheDocument();
  });

  it("renders the raw count below 1000", () => {
    renderCard({ pkg: makeItem({ downloads: 999 }) });
    expect(screen.getByText("📥 999")).toBeInTheDocument();
  });

  it.each([
    { case: "PT-BR", labels: PT_TIER_LABELS, expected: "Destaque Gold" },
    { case: "EN", labels: DEFAULT_TIER_LABELS, expected: "Gold Tier" },
  ])("applies the gold tier border class and badge ($case)", ({ labels, expected }) => {
    renderCard({ pkg: makeItem({ highlight_level: "gold" }), tierLabels: labels });
    expect(screen.getByRole("link").className).toContain("border-amber-500/50");
    expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
  });

  it.each([
    { case: "PT-BR", labels: PT_TIER_LABELS, expected: "Destaque Silver" },
    { case: "EN", labels: DEFAULT_TIER_LABELS, expected: "Silver Tier" },
  ])("applies the silver tier border class and badge ($case)", ({ labels, expected }) => {
    renderCard({ pkg: makeItem({ highlight_level: "silver" }), tierLabels: labels });
    expect(screen.getByRole("link").className).toContain("border-slate-400/50");
    expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
  });

  it.each([
    { case: "PT-BR", labels: PT_TIER_LABELS, expected: "Destaque Bronze" },
    { case: "EN", labels: DEFAULT_TIER_LABELS, expected: "Bronze Tier" },
  ])("applies the bronze tier border class and badge ($case)", ({ labels, expected }) => {
    renderCard({ pkg: makeItem({ highlight_level: "bronze" }), tierLabels: labels });
    expect(screen.getByRole("link").className).toContain("border-amber-700/50");
    expect(screen.getByText(new RegExp(expected))).toBeInTheDocument();
  });

  it("applies the default border class when there is no highlight level", () => {
    renderCard({ pkg: makeItem({ highlight_level: null }) });
    expect(screen.getByRole("link").className).toContain("border-slate-800");
    expect(screen.queryByText(/Destaque/)).toBeNull();
  });

  it("shows rating only when count and avg are provided", () => {
    const { rerender } = renderCard({
      pkg: makeItem(),
      rating: { avg: 4.5, count: 3 },
    });
    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.getByText("(3)")).toBeInTheDocument();

    rerender(
      <PackageCard
        pkg={makeItem()}
        lang="en"
        tierLabels={DEFAULT_TIER_LABELS}
        rating={{ avg: null, count: 0 }}
      />,
    );
    expect(screen.queryByText("(3)")).toBeNull();
  });

  it("shows likes only when greater than zero", () => {
    const { rerender } = renderCard({
      pkg: makeItem(),
      likes: 7,
      likesLabel: "likes",
    });
    expect(screen.getByText("7")).toBeInTheDocument();

    rerender(
      <PackageCard
        pkg={makeItem()}
        lang="en"
        tierLabels={DEFAULT_TIER_LABELS}
        likes={0}
      />,
    );
    expect(screen.queryByText("7")).toBeNull();
  });

  it("renders the version chip when a version is present", () => {
    renderCard({ pkg: makeItem({ version: "1.2.3" }) });
    expect(screen.getByText("1.2.3")).toBeInTheDocument();
  });

  it("uses the community fallback when the publisher username is absent", () => {
    renderCard({
      pkg: makeItem({ publisherUsername: null }),
      communityFallback: "Community",
    });
    expect(screen.getByText("Community")).toBeInTheDocument();
  });

  it("shows the publisher username when present", () => {
    renderCard({ pkg: makeItem({ publisherUsername: "isaque" }) });
    expect(screen.getByText("isaque")).toBeInTheDocument();
  });

  it("renders a commercial badge and proprietary license fallback", () => {
    renderCard({
      pkg: makeItem({ license_type: "commercial", license_name: null }),
    });
    expect(screen.getByText("Comercial")).toBeInTheDocument();
    expect(screen.getByText("Proprietária")).toBeInTheDocument();
  });

  it("renders an open-source badge and MIT license fallback", () => {
    renderCard({
      pkg: makeItem({ license_type: "open source", license_name: null }),
    });
    expect(screen.getByText("Open Source")).toBeInTheDocument();
    expect(screen.getByText("MIT")).toBeInTheDocument();
  });

  it("renders the explicit license name when provided", () => {
    renderCard({ pkg: makeItem({ license_name: "Apache-2.0" }) });
    expect(screen.getByText("Apache-2.0")).toBeInTheDocument();
  });

  it("renders each platform tag", () => {
    renderCard({ pkg: makeItem({ platforms: ["Win64", "macOS"] }) });
    expect(screen.getByText("Win64")).toBeInTheDocument();
    expect(screen.getByText("macOS")).toBeInTheDocument();
  });

  it("does not crash when platforms is null", () => {
    renderCard({ pkg: makeItem({ platforms: null }) });
    expect(screen.getByRole("link")).toBeInTheDocument();
  });
});
