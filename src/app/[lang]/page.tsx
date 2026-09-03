import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/HeaderServer";
import Footer from "@/components/Footer";
import HomeSearch from "@/components/HomeSearch";
import PackageCard, { type PackageCardItem } from "@/components/PackageCard";
import PartnerCard, { type PartnerCardItem } from "@/components/PartnerCard";
import AdSlot from "@/components/AdSlot";
import { PlatformBadges, LanguageBadges } from "@/components/FilterBadges";
import GoldCarousel, { type GoldCarouselItem } from "@/components/GoldCarousel";
import AefosFold from "@/components/AefosFold";
import HomeAnnounce from "@/components/HomeAnnounce";
import { createClient } from "@/utils/supabase/server";
import { getPackageRatings, type RatingSummary } from "@/utils/queries/reviews";
import { getLikesForPackages, type LikeSummary } from "@/utils/queries/likes";
import { getPublisherNames } from "@/utils/queries/publisher-name";
import {
  Cpu,
  ShieldCheck,
  Layers,
  Flame,
  ArrowRight,
  Package,
  Handshake,
} from "lucide-react";
import { getDictionary, hasLocale, ogLocale } from "./dictionaries";

type PartnerItem = PartnerCardItem;

type LangPageProps = {
  params: Promise<{ lang: string }>;
};

export const revalidate = 60;

export async function generateMetadata({ params }: LangPageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: { absolute: dict.home.meta.title },
    description: dict.home.meta.description,
    alternates: {
      canonical: `/${lang}/`,
      languages: { "pt-BR": "/pt-BR/", en: "/en/" },
    },
    openGraph: {
      locale: ogLocale(lang),
      title: dict.home.meta.title,
      description: dict.home.meta.description,
    },
  };
}

const HIGHLIGHT_WEIGHT: Record<string, number> = {
  gold: 4,
  silver: 3,
  bronze: 2,
  none: 1,
};

export default async function Home({ params }: LangPageProps) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);

  let packagesList: PackageCardItem[] = [];
  let partnersList: PartnerItem[] = [];
  let goldPackages: GoldCarouselItem[] = [];
  let ratingsMap: Map<string, RatingSummary> = new Map();
  let likesMap: Map<string, LikeSummary> = new Map();

  try {
    const supabase = await createClient();

    const { data: dbPackages, error: pkgError } = await supabase
      .from("packages")
      .select(
        "id, name, slug, description, license_type, license_name, highlight_level, platforms, stars, downloads, publisher_id",
      )
      .eq("status", "active")
      .order("downloads", { ascending: false })
      .limit(10);

    const { data: dbPartners, error: partnerError } = await supabase
      .from("partners")
      .select("id, name, logo_url, website_url, description, tier")
      .eq("status", "active")
      .order("sort_order", { ascending: true });

    const { data: dbGold } = await supabase
      .from("packages")
      .select("id, slug, name, description, platforms, publisher_id")
      .eq("status", "active")
      .eq("highlight_level", "gold")
      .limit(20);

    if (pkgError || partnerError) {
      console.warn("Supabase queries failed:", pkgError || partnerError);
    }

    if (dbPackages && dbPackages.length > 0) {
      const featured = [...dbPackages]
        .sort((a, b) => {
          const wa = HIGHLIGHT_WEIGHT[(a.highlight_level ?? "").toLowerCase()] ?? 1;
          const wb = HIGHLIGHT_WEIGHT[(b.highlight_level ?? "").toLowerCase()] ?? 1;
          if (wa !== wb) return wb - wa;
          return (b.downloads ?? 0) - (a.downloads ?? 0);
        })
        .slice(0, 4);

      // Single batched profiles fetch for the featured set — resolves the real
      // publisher name (full_name || username); null when the publisher has none.
      const publisherNames = await getPublisherNames(
        featured.map((pkg) => pkg.publisher_id),
      );

      packagesList = featured.map((pkg) => ({
        id: pkg.id,
        slug: pkg.slug,
        name: pkg.name,
        description: pkg.description,
        license_type: pkg.license_type,
        license_name: pkg.license_name,
        highlight_level: pkg.highlight_level,
        platforms: pkg.platforms,
        downloads: pkg.downloads,
        publisherUsername: publisherNames.get(pkg.publisher_id) ?? null,
      }));
    }

    if (dbPartners && dbPartners.length > 0) {
      partnersList = dbPartners as PartnerItem[];
    }

    if (dbGold && dbGold.length > 0) {
      const goldPublisherNames = await getPublisherNames(dbGold.map((g) => g.publisher_id));
      goldPackages = dbGold.map((g) => ({
        id: g.id,
        slug: g.slug,
        name: g.name,
        description: g.description,
        platforms: g.platforms,
        publisherUsername: goldPublisherNames.get(g.publisher_id) ?? null,
      }));
    }

    if (packagesList.length > 0) {
      const ids = packagesList.map((p) => p.id);
      // Cards are count-only (read-only) — pass userId null to skip the likedByMe query (1 query).
      [ratingsMap, likesMap] = await Promise.all([
        getPackageRatings(ids),
        getLikesForPackages(ids, null),
      ]);
    }
  } catch (err) {
    console.warn("Failed to connect to database client.", err);
  }

  return (
    <div className="flex flex-col min-h-screen bg-brand-slate text-slate-100">
      <Header />

      <main className="flex-grow">
        <HomeAnnounce dict={dict.home.announce} />

        <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24 border-b border-slate-800">
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-red/10 border border-brand-red/30 px-3.5 py-1.5 text-xs font-semibold text-brand-red mb-6 animate-pulse">
              <Flame className="h-3.5 w-3.5" />
              <span>{dict.home.hero.badge}</span>
            </div>

            <h1 className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-6xl max-w-4xl mx-auto leading-tight">
              {dict.home.hero.titlePrefix}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-red to-red-400">
                {dict.home.hero.titleHighlight}
              </span>
            </h1>

            <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-sans leading-relaxed">
              {dict.home.hero.subtitle}
            </p>

            <HomeSearch
              placeholder={dict.search.placeholder}
              submitLabel={dict.search.submit}
            />

            <div className="mt-12">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
                {dict.home.hero.platformsLabel}
              </p>
              <PlatformBadges />
            </div>

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">
                {dict.home.hero.filtersLabel}
              </p>
              <LanguageBadges />
            </div>
          </div>
        </section>

        <AefosFold dict={dict.home.aefosFold} lang={lang} />

        {goldPackages.length > 0 && <GoldCarousel items={goldPackages} lang={lang} />}

        <section className="py-16 bg-slate-950/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-slate-700 transition-all group">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-brand-red/10 border border-brand-red/20 text-brand-red mb-4 group-hover:scale-105 transition-transform">
                  <Cpu className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-white mb-2">{dict.home.features.discovery.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {dict.home.features.discovery.body}
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-slate-700 transition-all group">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-brand-blue mb-4 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-white mb-2">{dict.home.features.quality.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {dict.home.features.quality.body}
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 hover:border-slate-700 transition-all group">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-4 group-hover:scale-105 transition-transform">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-white mb-2">{dict.home.features.commercial.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {dict.home.features.commercial.body}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10">
          <AdSlot placement="hero" />
        </section>

        <section className="py-20 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <h2 className="font-display text-3xl font-extrabold tracking-tight text-white">
                {dict.home.packages.heading}
              </h2>
              <p className="text-slate-400 mt-2">
                {dict.home.packages.subtitle}
              </p>
            </div>
            <Link
              href={`/${lang}/packages`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue hover:text-brand-blue-light hover:underline underline-offset-4 transition-all"
            >
              <span>{dict.home.packages.viewAll}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {packagesList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {packagesList.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  lang={lang}
                  tierLabels={dict.tiers.card}
                  rating={ratingsMap.get(pkg.id)}
                  likes={likesMap.get(pkg.id)?.count}
                  likesLabel={dict.likes.likesLabel}
                  communityFallback={dict.common.communityPublisher}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center max-w-2xl mx-auto">
              <Package className="h-10 w-10 text-brand-red mx-auto mb-4" />
              <h3 className="font-display text-xl font-bold text-white mb-2">
                {dict.home.packages.emptyTitle}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {dict.home.packages.emptyBody}
              </p>
            </div>
          )}
        </section>

        <section className="py-20 border-t border-slate-800 bg-slate-950/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="font-display text-3xl font-extrabold text-white tracking-tight">
                {dict.home.partners.heading}
              </h2>
              <p className="text-slate-400 mt-3 text-base">
                {dict.home.partners.subtitle}
              </p>
            </div>

            {partnersList.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {partnersList.slice(0, 3).map((partner) => (
                  <PartnerCard key={partner.id} partner={partner} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center max-w-2xl mx-auto">
                <Handshake className="h-10 w-10 text-brand-blue mx-auto mb-4" />
                <h3 className="font-display text-xl font-bold text-white mb-2">
                  {dict.home.partners.emptyTitle}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {dict.home.partners.emptyBody}
                </p>
              </div>
            )}

            <div className="mt-10 text-center">
              <Link
                href={`/${lang}/partners`}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue hover:text-brand-blue-light hover:underline underline-offset-4 transition-all"
              >
                <span>{dict.home.partners.viewAll}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24 border-t border-slate-800 bg-gradient-to-b from-brand-slate to-slate-950 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-red/5 rounded-full blur-3xl -z-10" />

          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="font-display text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
              {dict.home.cta.title}
            </h2>
            <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              {dict.home.cta.subtitle}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/publish"
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg bg-brand-red px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-brand-red/20 transition-all hover:bg-brand-red-dark hover:scale-[1.02]"
              >
                {dict.home.cta.publish}
              </Link>
              <Link
                href="/documentation"
                className="inline-flex w-full sm:w-auto items-center justify-center rounded-lg border border-slate-700 bg-slate-900/60 px-6 py-3.5 text-base font-bold text-slate-300 hover:border-slate-500 hover:text-white transition-all"
              >
                {dict.home.cta.docs}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
