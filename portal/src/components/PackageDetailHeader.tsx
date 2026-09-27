import React from "react";
import { Trophy, ShieldCheck, AlertTriangle } from "lucide-react";
import type { PackageDetail, PackageVersion } from "@/app/[lang]/packages/[slug]/query";

function tierStyle(level: string | null | undefined): {
  label: string | null;
  badgeClass: string;
} {
  switch ((level ?? "").toLowerCase()) {
    case "gold":
      return {
        label: "Destaque Gold",
        badgeClass:
          "bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 shadow-md",
      };
    case "silver":
      return {
        label: "Destaque Silver",
        badgeClass:
          "bg-gradient-to-r from-slate-400 to-slate-200 text-slate-950 shadow-md",
      };
    case "bronze":
      return {
        label: "Destaque Bronze",
        badgeClass:
          "bg-gradient-to-r from-amber-800 to-amber-700 text-white shadow-md",
      };
    default:
      return { label: null, badgeClass: "" };
  }
}

type Props = {
  pkg: PackageDetail;
  latestVersion: PackageVersion | null;
  hasSbom?: boolean;
  deprecatedLabel?: string;
};

export default function PackageDetailHeader({
  pkg,
  latestVersion,
  hasSbom = false,
  deprecatedLabel = "Deprecated",
}: Props) {
  const tier = tierStyle(pkg.highlight_level);
  const isCommercial = (pkg.license_type ?? "").toLowerCase() === "commercial";

  return (
    <header className="border-b border-slate-800 bg-slate-950/40">
      {pkg.deprecated_message && (
        <div className="border-b border-amber-900/50 bg-amber-950/40">
          <div className="mx-auto flex max-w-7xl items-start gap-2 px-4 py-3 sm:px-6 lg:px-8">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="text-sm text-amber-200">
              <span className="font-bold uppercase tracking-wide">{deprecatedLabel}</span>
              {" — "}
              {pkg.deprecated_message}
            </p>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-white">
            {pkg.name}
          </h1>
          {latestVersion && (
            <span className="text-sm font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded">
              {latestVersion.version}
            </span>
          )}
          {tier.label && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${tier.badgeClass}`}
            >
              <Trophy className="h-3 w-3" />
              {tier.label}
            </span>
          )}
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isCommercial
                ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                : "bg-brand-blue/10 text-brand-blue border border-brand-blue/20"
            }`}
          >
            {isCommercial ? "Comercial" : "Open Source"}
          </span>
          {hasSbom && (
            <span
              title="This package ships a Software Bill of Materials — ready for the EU Cyber Resilience Act."
              className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              CRA-ready
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
