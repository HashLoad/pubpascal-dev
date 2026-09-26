import React from "react";
import { ArrowRight } from "lucide-react";

export type PartnerCardItem = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string;
  description: string | null;
  tier: string | null;
};

const TIER_STYLES: Record<string, string> = {
  platinum: "text-slate-200 ring-1 ring-slate-400",
  gold: "text-yellow-400 ring-1 ring-yellow-500",
  silver: "text-slate-300 ring-1 ring-slate-500",
  bronze: "text-orange-400 ring-1 ring-orange-600",
};

function tierBadgeStyle(tier: string): string {
  return TIER_STYLES[tier] ?? "";
}

const DESCRIPTION_MAX_CHARS = 200;

function truncate(text: string | null, max: number): string {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export default function PartnerCard({ partner }: { partner: PartnerCardItem }) {
  const description = truncate(partner.description, DESCRIPTION_MAX_CHARS);

  return (
    <a
      href={partner.website_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col p-6 rounded-2xl border border-slate-800 bg-slate-900/30 hover:bg-slate-900/60 hover:border-slate-700 hover:scale-[1.02] active:scale-[0.99] transition-all group"
    >
      <div className="h-14 w-full flex items-center justify-center rounded-xl bg-slate-950/40 border border-slate-800/80 mb-5 relative overflow-hidden group-hover:border-brand-red/30 transition-colors">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />

        {partner.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={partner.logo_url}
            alt={partner.name}
            loading="lazy"
            className="h-8 max-w-[80%] object-contain"
          />
        ) : (
          <span className="font-display text-lg font-bold text-white tracking-wide group-hover:text-brand-red transition-colors">
            {partner.name}
          </span>
        )}
      </div>
      <h3 className="font-display text-base font-bold text-white mb-2">
        {partner.name}
      </h3>
      {partner.tier && (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-950/60 mb-2 ${tierBadgeStyle(partner.tier)}`}
          aria-label={`Tier: ${partner.tier}`}
        >
          {partner.tier.charAt(0).toUpperCase() + partner.tier.slice(1)}
        </span>
      )}
      {description && (
        <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
      )}
      <span className="text-[10px] font-semibold text-brand-blue group-hover:text-brand-blue-light mt-4 flex items-center gap-1.5 transition-colors">
        Visitar website
        <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
      </span>
    </a>
  );
}
