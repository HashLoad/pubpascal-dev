import React from "react";
import {
  Trophy,
  Star,
  Download,
  Gauge,
  Check,
  AlertTriangle,
  X,
  MinusCircle,
} from "lucide-react";
import type { PackageDetail } from "@/app/[lang]/packages/[slug]/query";
import { computePubPoints, type RuleOutcome } from "@/utils/pubPoints";
import { formatCompact } from "@/lib/format";

export type ScoresLabels = {
  breakdownTitle: string;
  cards: { score: string; stars: string; downloads: string; highlight: string };
  tiers: { gold: string; silver: string; bronze: string; none: string };
  sections: Record<string, string>;
  rules: Record<string, string>;
  outcomes: Record<string, string>;
  grantedOfMax: string;
  pointsLabel: string;
  notValidated: string;
  notSupported: string;
};

function fillGrantedMax(tpl: string, granted: number, max: number): string {
  return tpl.replace("{granted}", String(granted)).replace("{max}", String(max));
}

function tierMeta(
  level: string | null | undefined,
  labels: ScoresLabels,
): { label: string; className: string } {
  switch ((level ?? "").toLowerCase()) {
    case "gold":
      return {
        label: labels.tiers.gold,
        className: "from-amber-500/20 to-yellow-600/10 border-amber-500/40 text-amber-300",
      };
    case "silver":
      return {
        label: labels.tiers.silver,
        className: "from-slate-400/20 to-slate-200/10 border-slate-400/40 text-slate-200",
      };
    case "bronze":
      return {
        label: labels.tiers.bronze,
        className: "from-amber-800/20 to-amber-700/10 border-amber-700/40 text-amber-300",
      };
    default:
      return {
        label: labels.tiers.none,
        className: "from-slate-900 to-slate-950 border-slate-800 text-slate-400",
      };
  }
}

const OUTCOME_STYLE: Record<
  RuleOutcome,
  { icon: typeof Check; className: string }
> = {
  pass: { icon: Check, className: "text-green-400" },
  warn: { icon: AlertTriangle, className: "text-amber-400" },
  fail: { icon: X, className: "text-rose-400" },
  not_supported: { icon: MinusCircle, className: "text-slate-500" },
};

export default function ScoresPanel({
  pkg,
  labels,
}: {
  pkg: PackageDetail;
  labels: ScoresLabels;
}) {
  const report = pkg.validation_report;
  const points = computePubPoints(report);
  const tier = tierMeta(pkg.highlight_level, labels);

  const cards = [
    {
      key: "score",
      label: labels.cards.score,
      value: `${points.total}/100`,
      icon: Gauge,
      accent: "text-brand-blue",
    },
    {
      key: "stars",
      label: labels.cards.stars,
      value: formatCompact(pkg.stars, { millions: false, nullDisplay: "—" }),
      icon: Star,
      accent: "text-amber-400",
    },
    {
      key: "downloads",
      label: labels.cards.downloads,
      value: formatCompact(pkg.downloads, { millions: false, nullDisplay: "—" }),
      icon: Download,
      accent: "text-brand-blue",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.key}
              className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5"
            >
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
                <Icon className={`h-4 w-4 ${c.accent}`} />
                <span>{c.label}</span>
              </div>
              <div className="font-display text-2xl font-extrabold text-white">
                {c.value}
              </div>
            </div>
          );
        })}
        <div className={`rounded-2xl border bg-gradient-to-br p-5 ${tier.className}`}>
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-widest opacity-80">
            <Trophy className="h-4 w-4" />
            <span>{labels.cards.highlight}</span>
          </div>
          <div className="font-display text-2xl font-extrabold">{tier.label}</div>
        </div>
      </div>

      {report === null ? (
        <p className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-6 text-center text-sm text-slate-500">
          {labels.notValidated}
        </p>
      ) : points.verdict === "not_supported" ? (
        <p className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 p-6 text-center text-sm text-slate-500">
          {labels.notSupported}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          <h3 className="font-display text-lg font-bold text-white">
            {labels.breakdownTitle}
          </h3>
          {points.sections.map((section) => (
            <div
              key={section.key}
              className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-slate-200">
                  {labels.sections[section.key] ?? section.key}
                </h4>
                <span className="font-mono text-xs font-semibold text-brand-blue">
                  {fillGrantedMax(labels.grantedOfMax, section.granted, section.max)}
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {section.rules.map((rule) => {
                  const style = OUTCOME_STYLE[rule.outcome];
                  const OutcomeIcon = style.icon;
                  return (
                    <li
                      key={rule.key}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <OutcomeIcon className={`h-4 w-4 shrink-0 ${style.className}`} />
                        <span className="truncate text-slate-300">
                          {labels.rules[rule.key] ?? rule.key}
                        </span>
                        <span
                          className={`shrink-0 text-[11px] font-semibold uppercase tracking-wider ${style.className}`}
                        >
                          {labels.outcomes[rule.outcome] ?? rule.outcome}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-xs text-slate-500">
                        {fillGrantedMax(labels.grantedOfMax, rule.points, rule.max)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
