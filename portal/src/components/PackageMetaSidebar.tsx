import React from "react";
import Link from "next/link";
import { ExternalLink, GitBranch, Globe, Star, GitFork, Award, Heart, HeartHandshake } from "lucide-react";
import type { PackageDetail } from "@/app/[lang]/packages/[slug]/query";
import { computePubPoints } from "@/utils/pubPoints";
import { getRequestLocale } from "@/utils/locale";
import { localizedHref } from "@/utils/localized-href";
import { formatCompact } from "@/lib/format";

type Props = {
  pkg: PackageDetail;
  liveStars: number | null;
  liveForks: number | null;
  licenseName: string | null;
  publisherUsername: string | null;
  pointsLabel: string;
  likesCount: number;
  likesLabel: string;
  communityFallback?: string;
  sponsorLabel?: string;
};

function Stat({
  icon,
  value,
  label,
  sub,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  sub?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-1 text-brand-blue">{icon}</div>
      <span className="text-lg font-extrabold text-white leading-none">
        {value}
        {sub && <span className="text-xs font-medium text-slate-500">{sub}</span>}
      </span>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-800 pt-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default async function PackageMetaSidebar({
  pkg,
  liveStars,
  liveForks,
  licenseName,
  publisherUsername,
  pointsLabel,
  likesCount,
  likesLabel,
  communityFallback = "Community",
  sponsorLabel = "Sponsor",
}: Props) {
  const lang = await getRequestLocale();
  const stars = liveStars ?? pkg.stars;
  const license = licenseName ?? pkg.license_name;
  // Real Pub Points from the Esteira report when present; stored column is the fallback.
  const points = pkg.validation_report
    ? computePubPoints(pkg.validation_report).total
    : pkg.score ?? 0;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 lg:sticky lg:top-20 flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        {pkg.repository_url ? (
          <a
            href={pkg.repository_url}
            target="_blank"
            rel="noopener noreferrer"
            title="Dar estrela no GitHub"
            className="rounded-lg p-1 transition-colors hover:bg-slate-800/60"
          >
            <Stat
              icon={<Star className="h-4 w-4 text-amber-400" />}
              value={formatCompact(stars)}
              label="★ no GitHub"
            />
          </a>
        ) : (
          <Stat
            icon={<Star className="h-4 w-4 text-amber-400" />}
            value={formatCompact(stars)}
            label="Stars"
          />
        )}
        <Stat
          icon={<GitFork className="h-4 w-4" />}
          value={formatCompact(liveForks)}
          label="Forks"
        />
        <Stat
          icon={<Award className="h-4 w-4" />}
          value={String(points)}
          sub="/100"
          label={pointsLabel}
        />
        <Stat
          icon={<Heart className="h-4 w-4 text-brand-red" />}
          value={formatCompact(likesCount)}
          label={likesLabel}
        />
      </div>

      {/* Links */}
      {(pkg.repository_url || pkg.website_url || pkg.funding_url) && (
        <Section title="Links">
          <div className="flex flex-col gap-2">
            {pkg.repository_url && (
              <a
                href={pkg.repository_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-brand-blue hover:text-brand-blue-light"
              >
                <GitBranch className="h-4 w-4" />
                <span>Repositório</span>
                <ExternalLink className="h-3 w-3 text-slate-500" />
              </a>
            )}
            {pkg.website_url && (
              <a
                href={pkg.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-brand-blue hover:text-brand-blue-light"
              >
                <Globe className="h-4 w-4" />
                <span>Website</span>
                <ExternalLink className="h-3 w-3 text-slate-500" />
              </a>
            )}
            {pkg.funding_url && (
              <a
                href={pkg.funding_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-pink-400 hover:text-pink-300"
              >
                <HeartHandshake className="h-4 w-4" />
                <span>{sponsorLabel}</span>
                <ExternalLink className="h-3 w-3 text-slate-500" />
              </a>
            )}
          </div>
        </Section>
      )}

      {/* License */}
      {license && (
        <Section title="Licença">
          <span className="font-mono text-sm text-slate-200">{license}</span>
        </Section>
      )}

      {/* Publisher */}
      <Section title="Publicador">
        <span className="text-sm text-slate-200">
          {publisherUsername ?? communityFallback}
        </span>
      </Section>

      {/* Platforms */}
      {pkg.platforms && pkg.platforms.length > 0 && (
        <Section title="Plataformas">
          <div className="flex flex-wrap gap-1.5">
            {pkg.platforms.map((p) => (
              <Link
                key={p}
                href={localizedHref(`/packages?platform=${encodeURIComponent(p)}`, lang)}
                className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                {p}
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* Languages / IDE */}
      {pkg.languages && pkg.languages.length > 0 && (
        <Section title="IDE / Dialeto">
          <div className="flex flex-wrap gap-1.5">
            {pkg.languages.map((l) => (
              <Link
                key={l}
                href={localizedHref(`/packages?language=${encodeURIComponent(l)}`, lang)}
                className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                {l}
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
