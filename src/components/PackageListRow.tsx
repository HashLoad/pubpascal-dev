import React from "react";
import Link from "next/link";
import { Star, Award, Pencil, Heart } from "lucide-react";
import type { PackageRow } from "@/app/[lang]/packages/query";
import { stripMarkdown } from "@/lib/markdown";
import { formatCompact } from "@/lib/format";
import { computePubPoints } from "@/utils/pubPoints";
import { getRequestLocale } from "@/utils/locale";
import { localizedHref } from "@/utils/localized-href";
import { type TierLabels } from "./PackageCard";

export type StatusLabels = {
  active: string;
  pending: string;
  validating: string;
  rejected: string;
  commercial: string;
  edit: string;
  deprecated: string;
  deleted: string;
};

// Locale-agnostic color classes; the visible label comes from `statusLabels` (ADR-040).
const STATUS_BADGE_CLS: Record<string, string> = {
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  pending: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  validating: "bg-brand-blue/10 text-brand-blue border-brand-blue/20",
  rejected: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  deleted: "bg-slate-500/10 text-slate-400 border-slate-500/20 line-through",
};

// Publish-time README badge colors (ADR-045). Only pass/warn/fail surface; the
// visible label is the localized string passed in by the dashboard.
export type ReadmeBadge = { outcome: "pass" | "warn" | "fail"; label: string };
const README_BADGE_CLS: Record<ReadmeBadge["outcome"], string> = {
  pass: "bg-green-500/10 text-green-400 border-green-500/20",
  warn: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  fail: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

function Metric({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex min-w-[58px] flex-col items-center text-center">
      <span className="flex items-center gap-1 text-base font-extrabold leading-none text-white">
        {icon}
        {value}
      </span>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
    </div>
  );
}

export default async function PackageListRow({
  pkg,
  status,
  editHref,
  likes,
  likesLabel,
  statusLabels,
  tierLabels,
  readme,
}: {
  pkg: PackageRow;
  status?: string | null;
  editHref?: string;
  likes?: number;
  likesLabel?: string;
  statusLabels: StatusLabels;
  tierLabels: TierLabels;
  readme?: ReadmeBadge | null;
}) {
  const lang = await getRequestLocale();
  const isCommercial = (pkg.license_type ?? "").toLowerCase() === "commercial";
  const tier = (pkg.highlight_level ?? "").toLowerCase();
  const statusKey = status?.toLowerCase();
  const statusBadge =
    statusKey && STATUS_BADGE_CLS[statusKey]
      ? {
          cls: STATUS_BADGE_CLS[statusKey],
          label: statusLabels[statusKey as keyof StatusLabels] ?? statusKey,
        }
      : null;
  // Real Pub Points from the Esteira report when present; stored column is the fallback.
  const points = pkg.validation_report
    ? computePubPoints(pkg.validation_report).total
    : pkg.score ?? 0;

  return (
    <article className="flex flex-col gap-4 border-b border-slate-800 py-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={localizedHref(`/packages/${pkg.slug}`, lang)}
            className="font-display text-lg font-bold text-brand-blue hover:underline underline-offset-4"
          >
            {pkg.name}
          </Link>
          {tier === "gold" && (
            <span className="rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-950">
              ⭐ {tierLabels.gold}
            </span>
          )}
          {tier === "silver" && (
            <span className="rounded-full bg-gradient-to-r from-slate-400 to-slate-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-950">
              🥈 {tierLabels.silver}
            </span>
          )}
          {tier === "bronze" && (
            <span className="rounded-full bg-gradient-to-r from-amber-800 to-amber-700 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              🥉 {tierLabels.bronze}
            </span>
          )}
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              isCommercial
                ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                : "bg-brand-blue/10 text-brand-blue border border-brand-blue/20"
            }`}
          >
            {isCommercial ? statusLabels.commercial : "Open Source"}
          </span>
          {statusBadge && (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusBadge.cls}`}
            >
              {statusBadge.label}
            </span>
          )}
          {readme && (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${README_BADGE_CLS[readme.outcome]}`}
            >
              {readme.label}
            </span>
          )}
          {pkg.deprecated_message && (
            <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
              {statusLabels.deprecated}
            </span>
          )}
        </div>

        {pkg.description && (
          <p className="mt-1.5 line-clamp-2 max-w-3xl text-sm leading-relaxed text-slate-400">
            {stripMarkdown(pkg.description)}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {pkg.platforms?.map((p) => (
            <Link
              key={p}
              href={localizedHref(`/packages?platform=${encodeURIComponent(p)}`, lang)}
              className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >
              {p}
            </Link>
          ))}
          {pkg.languages?.map((l) => (
            <Link
              key={l}
              href={localizedHref(`/packages?language=${encodeURIComponent(l)}`, lang)}
              className="rounded bg-brand-blue/10 px-2 py-0.5 text-[10px] text-brand-blue hover:bg-brand-blue/20 transition-colors"
            >
              {l}
            </Link>
          ))}
          {pkg.categories?.map((c) => (
            <Link
              key={c}
              href={localizedHref(`/packages?category=${encodeURIComponent(c)}`, lang)}
              className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            >
              {c}
            </Link>
          ))}
          {pkg.license_name && (
            <span className="font-mono text-[10px] text-slate-500">
              {pkg.license_name}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-3 shrink-0 sm:pl-6">
        <div className="flex items-center gap-5 sm:gap-6">
          <Metric
            icon={<Star className="h-3.5 w-3.5 text-amber-400" />}
            value={formatCompact(pkg.stars)}
            label="Stars"
          />
          <Metric
            icon={<Award className="h-3.5 w-3.5 text-brand-blue" />}
            value={String(points)}
            label="Points"
          />
          {likes !== undefined && likesLabel && (
            <Metric
              icon={<Heart className="h-3.5 w-3.5 text-brand-red" />}
              value={formatCompact(likes)}
              label={likesLabel}
            />
          )}
        </div>
        {editHref && (
          <Link
            href={editHref}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-brand-red/40 hover:text-white transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            {statusLabels.edit}
          </Link>
        )}
      </div>
    </article>
  );
}
