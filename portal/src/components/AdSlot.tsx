import React from "react";
import {
  getActiveAdsByPlacement,
  incrementAdImpression,
  type Placement,
} from "@/utils/ads";

type Props = {
  placement: Placement;
};

const PLACEMENT_LAYOUTS: Record<
  Placement,
  {
    container: string;
    imageWrapper: string;
    imageWidth: number;
    imageHeight: number;
    loading: "eager" | "lazy";
    target: "_blank" | "_self";
    descriptionMaxChars: number;
  }
> = {
  hero: {
    container:
      "relative flex flex-col sm:flex-row items-stretch gap-5 rounded-2xl border border-brand-blue/30 bg-slate-950/60 backdrop-blur-sm p-5 hover:border-brand-blue/60 hover:bg-slate-950/80 transition-colors",
    imageWrapper:
      "flex-shrink-0 w-full sm:w-48 h-32 sm:h-24 overflow-hidden rounded-lg bg-slate-900",
    imageWidth: 480,
    imageHeight: 120,
    loading: "eager",
    target: "_self",
    descriptionMaxChars: 120,
  },
  sidebar: {
    container:
      "relative flex flex-col gap-3 rounded-2xl border border-brand-blue/30 bg-slate-950/60 backdrop-blur-sm p-5 hover:border-brand-blue/60 hover:bg-slate-950/80 transition-colors",
    imageWrapper:
      "w-full h-32 overflow-hidden rounded-lg bg-slate-900",
    imageWidth: 280,
    imageHeight: 200,
    loading: "lazy",
    target: "_blank",
    descriptionMaxChars: 100,
  },
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

export default async function AdSlot({ placement }: Props) {
  const ad = await getActiveAdsByPlacement(placement);
  if (!ad) return null;

  void incrementAdImpression(ad.id);

  const layout = PLACEMENT_LAYOUTS[placement];
  const href = `/api/ads/click/${ad.id}?to=${encodeURIComponent(ad.target_url)}`;

  return (
    <a
      href={href}
      rel="sponsored noopener"
      target={layout.target}
      className={layout.container}
      aria-label={`Anúncio: ${ad.title}`}
    >
      <span
        aria-label="Conteúdo patrocinado"
        className="absolute top-3 right-3 inline-flex items-center rounded-full bg-slate-900/90 border border-brand-blue/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-blue"
      >
        Anúncio
      </span>

      <div className={layout.imageWrapper}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ad.banner_url}
          alt={ad.title}
          width={layout.imageWidth}
          height={layout.imageHeight}
          loading={layout.loading}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex flex-col justify-center min-w-0 flex-1 pr-16">
        <h3 className="font-display text-base sm:text-lg font-bold text-white leading-tight">
          {ad.title}
        </h3>
        {ad.description && (
          <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">
            {truncate(ad.description, layout.descriptionMaxChars)}
          </p>
        )}
      </div>
    </a>
  );
}
