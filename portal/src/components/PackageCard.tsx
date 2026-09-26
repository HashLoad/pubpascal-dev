import React from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { stripMarkdown } from "@/lib/markdown";
import { formatCompact } from "@/lib/format";
import { localizedHref, type Locale } from "@/utils/localized-href";

export type PackageCardItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  license_type: string | null;
  license_name?: string | null;
  highlight_level: string | null;
  platforms: string[] | null;
  downloads: number | null;
  version?: string | null;
  publisherUsername?: string | null;
};

export type PackageRating = { avg: number | null; count: number };

export type TierLabels = { gold: string; silver: string; bronze: string };

function tierClasses(level: string | null | undefined): string {
  switch ((level ?? "").toLowerCase()) {
    case "gold":
      return "border-amber-500/50 shadow-lg shadow-amber-500/5";
    case "silver":
      return "border-slate-400/50 shadow-md shadow-slate-400/5";
    case "bronze":
      return "border-amber-700/50";
    default:
      return "border-slate-800 hover:border-slate-700";
  }
}

export default function PackageCard({
  pkg,
  lang,
  tierLabels,
  rating,
  likes,
  likesLabel,
  communityFallback = "Community",
}: {
  pkg: PackageCardItem;
  lang: Locale;
  tierLabels: TierLabels;
  rating?: PackageRating;
  likes?: number;
  likesLabel?: string;
  communityFallback?: string;
}) {
  const level = (pkg.highlight_level ?? "").toLowerCase();
  const isGold = level === "gold";
  const isSilver = level === "silver";
  const isBronze = level === "bronze";
  const isCommercial = (pkg.license_type ?? "").toLowerCase() === "commercial";
  const publisher = pkg.publisherUsername ?? communityFallback;

  return (
    <Link
      href={localizedHref(`/packages/${pkg.slug}`, lang)}
      className={`relative flex flex-col p-6 rounded-2xl border bg-slate-900/40 backdrop-blur-sm transition-all hover:bg-slate-900/60 hover:scale-[1.01] ${tierClasses(
        pkg.highlight_level,
      )}`}
    >
      {isGold && (
        <span className="absolute -top-3 right-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-950 shadow-md">
          ⭐ {tierLabels.gold}
        </span>
      )}
      {isSilver && (
        <span className="absolute -top-3 right-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-slate-400 to-slate-200 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-950 shadow-md">
          🥈 {tierLabels.silver}
        </span>
      )}
      {isBronze && (
        <span className="absolute -top-3 right-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-800 to-amber-700 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
          🥉 {tierLabels.bronze}
        </span>
      )}

      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-display text-xl font-bold text-white flex items-center gap-2">
            <span>{pkg.name}</span>
            {pkg.version && (
              <span className="text-xs font-mono font-normal text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded">
                {pkg.version}
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Por <span className="text-slate-300 font-medium">{publisher}</span>
          </p>
          {rating && rating.count > 0 && rating.avg !== null && (
            <p className="text-xs text-slate-400 mt-1">
              <span className="text-amber-400">★</span>{" "}
              {rating.avg.toFixed(1)}{" "}
              <span className="text-slate-500">({rating.count})</span>
            </p>
          )}
        </div>

        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isCommercial
              ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
              : "bg-brand-blue/10 text-brand-blue border border-brand-blue/20"
          }`}
        >
          {isCommercial ? "Comercial" : "Open Source"}
        </span>
      </div>

      <p className="text-sm text-slate-400 leading-relaxed mb-6 flex-grow">
        {stripMarkdown(pkg.description)}
      </p>

      <div className="border-t border-slate-800/60 pt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1.5">
          {pkg.platforms?.map((plat) => (
            <span
              key={plat}
              className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded"
            >
              {plat}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>📥 {formatCompact(pkg.downloads, { decimals: 0, millions: false })}</span>
          {likes !== undefined && likes > 0 && (
            <>
              <span className="text-slate-700">|</span>
              <span
                className="inline-flex items-center gap-1"
                title={likesLabel}
              >
                <Heart className="h-3 w-3 text-brand-red" />
                {likes}
              </span>
            </>
          )}
          <span className="text-slate-700">|</span>
          <span className="font-mono text-[10px] text-slate-500 bg-slate-800/40 px-1.5 py-0.5 rounded">
            {pkg.license_name || (isCommercial ? "Proprietária" : "MIT")}
          </span>
        </div>
      </div>
    </Link>
  );
}
