"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Trophy, ChevronLeft, ChevronRight } from "lucide-react";

export type GoldCarouselItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  platforms: string[] | null;
  publisherUsername: string | null;
};

export type GoldCarouselProps = {
  items: GoldCarouselItem[];
  lang: string;
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PLATFORM_ICONS: Record<string, string> = {
  Windows: "🪟", macOS: "🍎", Linux: "🐧", Android: "🤖", iOS: "📱", Web: "🌐",
};

export default function GoldCarousel({ items, lang }: GoldCarouselProps) {
  // Shuffle once per `items` change — different order every visit
  const cards = useMemo(() => shuffle(items), [items]);
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset to the first slide whenever the shuffled set changes.
  const [prevCards, setPrevCards] = useState(cards);
  if (prevCards !== cards) {
    setPrevCards(cards);
    setIdx(0);
  }

  const prev = useCallback(() => {
    setIdx((i) => (i - 1 + cards.length) % cards.length);
  }, [cards.length]);

  const next = useCallback(() => {
    setIdx((i) => (i + 1) % cards.length);
  }, [cards.length]);

  // Auto-advance every 5 s
  useEffect(() => {
    if (cards.length < 2) return;
    timerRef.current = setTimeout(next, 5000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [idx, cards.length, next]);

  if (cards.length === 0) return null;

  const card = cards[idx];

  return (
    <section className="relative py-10 overflow-hidden bg-gradient-to-b from-yellow-950/20 via-slate-950/60 to-slate-950/0 border-b border-yellow-500/10">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(234,179,8,0.07),transparent)]" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex items-center gap-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 px-3 py-1 text-xs font-bold text-yellow-400">
            <Trophy className="h-3 w-3" />
            <span>Destaque Gold</span>
          </div>
        </div>

        {/* Carousel */}
        <div className="relative flex items-center gap-4">
          {/* Prev button */}
          {cards.length > 1 && (
            <button
              onClick={prev}
              aria-label="Anterior"
              className="hidden sm:flex shrink-0 h-9 w-9 items-center justify-center rounded-full border border-yellow-500/20 bg-slate-950/80 text-yellow-400 hover:border-yellow-500/50 hover:bg-yellow-500/10 transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {/* Card */}
          <Link
            href={`/${lang}/packages/${card.slug}`}
            className="group flex-1 min-w-0 relative rounded-2xl border border-yellow-500/25 bg-gradient-to-br from-slate-900/90 to-slate-950/90 hover:border-yellow-500/50 hover:shadow-xl hover:shadow-yellow-500/5 transition-all p-6 md:p-8"
          >
            {/* Gold corner badge */}
            <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 px-2.5 py-1 text-[10px] font-bold text-yellow-400">
              <Trophy className="h-2.5 w-2.5" />
              GOLD
            </div>

            <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8 pr-20 md:pr-0">
              {/* Icon placeholder */}
              <div className="shrink-0 h-14 w-14 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-600/10 border border-yellow-500/20 flex items-center justify-center">
                <Trophy className="h-6 w-6 text-yellow-500" />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-xl md:text-2xl font-extrabold text-white group-hover:text-yellow-50 transition-colors truncate">
                  {card.name}
                </h3>
                {card.publisherUsername && (
                  <p className="text-xs text-slate-500 mt-0.5">by {card.publisherUsername}</p>
                )}
                {card.description && (
                  <p className="mt-3 text-sm text-slate-400 leading-relaxed line-clamp-2">
                    {card.description}
                  </p>
                )}
                {card.platforms && card.platforms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {card.platforms.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-800/60 border border-slate-700/60 px-2 py-0.5 text-[11px] text-slate-400"
                      >
                        <span>{PLATFORM_ICONS[p] ?? "•"}</span>
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Link>

          {/* Next button */}
          {cards.length > 1 && (
            <button
              onClick={next}
              aria-label="Próximo"
              className="hidden sm:flex shrink-0 h-9 w-9 items-center justify-center rounded-full border border-yellow-500/20 bg-slate-950/80 text-yellow-400 hover:border-yellow-500/50 hover:bg-yellow-500/10 transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Dot indicators */}
        {cards.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-5">
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Slide ${i + 1}`}
                className={`rounded-full transition-all ${
                  i === idx
                    ? "w-5 h-1.5 bg-yellow-500"
                    : "w-1.5 h-1.5 bg-slate-700 hover:bg-slate-500"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
