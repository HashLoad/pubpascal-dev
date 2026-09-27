import React from "react";
import { Flame, ArrowRight } from "lucide-react";

// Slim top-of-home announcement bar — the "chamada com destaque" for Aefos AI.
// It only adds a strip above the hero (the search hero stays untouched) and
// links out to the Aefos AI repo (its public home). Copy comes from home.announce.
export type HomeAnnounceDict = {
  tag: string;
  text: string;
  cta: string;
};

export default function HomeAnnounce({ dict }: { dict: HomeAnnounceDict }) {
  return (
    <a
      href="https://github.com/ModernDelphiWorks/Aefos"
      target="_blank"
      rel="noopener noreferrer"
      className="group block border-b border-brand-blue/25 bg-gradient-to-r from-brand-red/10 via-slate-950/40 to-brand-blue/10 transition-colors hover:via-slate-900/40"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-2.5 text-sm sm:px-6 lg:px-8">
        <span className="rounded bg-brand-red px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          {dict.tag}
        </span>
        <span className="flex items-center gap-1.5">
          <Flame className="h-3.5 w-3.5 flex-none text-brand-red" aria-hidden />
          <span className="font-medium text-white">{dict.text}</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-brand-blue px-3 py-1 text-xs font-semibold text-white transition group-hover:bg-brand-blue-light">
          {dict.cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
    </a>
  );
}
