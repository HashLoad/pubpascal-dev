import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Header from "@/components/HeaderServer";
import Footer from "@/components/Footer";
import HomeSearch from "@/components/HomeSearch";
import PackageListRow from "@/components/PackageListRow";
import ActiveFilterChips from "@/components/ActiveFilterChips";
import SortSelect from "@/components/SortSelect";
import PaginationControls from "@/components/PaginationControls";
import EmptyResults from "@/components/EmptyResults";
import AdSlot from "@/components/AdSlot";
import { fetchPackages } from "./query";
import { getLikesForPackages, type LikeSummary } from "@/utils/queries/likes";
import { parseSearchParams, type RawSearchParams } from "./searchParams";
import { getDictionary, hasLocale, ogLocale } from "../dictionaries";

type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  const filters = parseSearchParams(await searchParams);

  const fragments: string[] = [];
  if (filters.q.length > 0) fragments.push(`"${filters.q}"`);
  if (filters.language) fragments.push(filters.language);
  if (filters.platform) fragments.push(filters.platform);

  const baseTitle =
    fragments.length > 0
      ? `${dict.packages.meta.titleFilteredPrefix} ${fragments.join(" ")}`
      : dict.packages.meta.title;

  const description =
    fragments.length > 0
      ? `${dict.packages.meta.descriptionFilteredPrefix} ${fragments.join(", ")}.`
      : dict.packages.meta.description;

  const result = await fetchPackages(filters);
  const indexable = result.totalCount > 0 && !result.error;

  return {
    title: baseTitle,
    description,
    alternates: {
      canonical: `/${lang}/packages`,
      languages: { "pt-BR": "/pt-BR/packages", en: "/en/packages" },
    },
    openGraph: { locale: ogLocale(lang) },
    robots: {
      index: indexable,
      follow: true,
    },
  };
}

export default async function PackagesPage({ params, searchParams }: PageProps) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const filters = parseSearchParams(await searchParams);
  const result = await fetchPackages(filters);

  // Rows show like counts read-only — pass userId null to skip the likedByMe query (1 query, AC 7).
  const likesMap: Map<string, LikeSummary> =
    result.rows.length > 0
      ? await getLikesForPackages(result.rows.map((r) => r.id), null)
      : new Map();

  const showEmpty = result.rows.length === 0;
  const resultsLabel =
    result.totalCount === 1
      ? dict.packages.resultsFoundSingular
      : dict.packages.resultsFoundPlural;

  return (
    <div className="flex flex-col min-h-screen bg-brand-slate text-slate-100">
      <Header />

      <main className="flex-grow">
        <section className="border-b border-slate-800 pt-14 pb-10 bg-slate-950/40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              {dict.packages.heading}
            </h1>
            <p className="mt-2 text-slate-400 max-w-2xl">
              {dict.packages.subtitle}
            </p>
            <HomeSearch
              initialValue={filters.q}
              placeholder={dict.search.placeholder}
              submitLabel={dict.search.submit}
            />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10">
          <AdSlot placement="hero" />
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <ActiveFilterChips filters={filters} />
            {!showEmpty && (
              <div className="flex items-center gap-4 md:justify-end">
                <SortSelect filters={filters} lang={lang} labels={dict.packages.sort} />
                <p className="text-xs font-mono text-slate-500">
                  <span className="text-slate-300 font-semibold">{result.totalCount}</span>{" "}
                  {resultsLabel}
                </p>
              </div>
            )}
          </div>

          {showEmpty ? (
            <EmptyResults filters={filters} />
          ) : (
            <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-8">
              <div>
                <div className="border-t border-slate-800">
                  {result.rows.map((row) => (
                    <PackageListRow
                      key={row.id}
                      pkg={row}
                      likes={likesMap.get(row.id)?.count ?? 0}
                      likesLabel={dict.likes.likesLabel}
                      statusLabels={dict.packageStatus}
                      tierLabels={dict.tiers.row}
                    />
                  ))}
                </div>
                <PaginationControls filters={filters} totalPages={result.totalPages} />
              </div>
              <aside className="mt-8 lg:mt-0">
                <AdSlot placement="sidebar" />
              </aside>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
