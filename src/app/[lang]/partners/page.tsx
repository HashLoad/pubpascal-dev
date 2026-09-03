import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Handshake } from "lucide-react";
import Header from "@/components/HeaderServer";
import Footer from "@/components/Footer";
import PartnerCard, { type PartnerCardItem } from "@/components/PartnerCard";
import { createClient } from "@/utils/supabase/server";
import { getDictionary, hasLocale, ogLocale } from "../dictionaries";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  return {
    title: dict.partners.meta.title,
    description: dict.partners.meta.description,
    alternates: {
      canonical: `/${lang}/partners`,
      languages: { "pt-BR": "/pt-BR/partners", en: "/en/partners" },
    },
    robots: { index: true, follow: true },
    openGraph: {
      title: dict.partners.meta.ogTitle,
      description: dict.partners.meta.description,
      type: "website",
      locale: ogLocale(lang),
    },
    twitter: {
      card: "summary_large_image",
      title: dict.partners.meta.ogTitle,
      description: dict.partners.meta.description,
    },
  };
}

type PartnerRow = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  description: string | null;
  tier: string | null;
};

async function loadActivePartners(): Promise<PartnerCardItem[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("partners")
      .select("id, name, logo_url, website_url, description, tier, sort_order, created_at")
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.warn("[partners] query failed", error);
      return [];
    }

    return ((data ?? []) as PartnerRow[])
      .filter((p): p is PartnerRow & { website_url: string } =>
        Boolean(p.website_url),
      )
      .map((p) => ({
        id: p.id,
        name: p.name,
        logo_url: p.logo_url,
        website_url: p.website_url,
        description: p.description,
        tier: p.tier,
      }));
  } catch (err) {
    console.warn("[partners] unexpected error", err);
    return [];
  }
}

export default async function PartnersPage({ params }: PageProps) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await getDictionary(lang);
  const partners = await loadActivePartners();

  return (
    <div className="flex flex-col min-h-screen bg-brand-slate text-slate-100">
      <Header />

      <main className="flex-grow">
        <section className="border-b border-slate-800 bg-slate-950/40 py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-blue/10 border border-brand-blue/30 px-3.5 py-1.5 text-xs font-semibold text-brand-blue mb-6">
                <Handshake className="h-3.5 w-3.5" />
                <span>{dict.partners.badge}</span>
              </div>
              <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-white">
                {dict.partners.heading}
              </h1>
              <p className="mt-4 text-lg text-slate-400 leading-relaxed">
                {dict.partners.subtitle}
              </p>
              <Link
                href={`/${lang}/partners/apply`}
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-red px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-red/20 hover:bg-brand-red-dark hover:scale-[1.02] transition-all"
              >
                <Handshake className="h-4 w-4" />
                {dict.partners.cta}
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          {partners.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {partners.map((partner) => (
                <PartnerCard key={partner.id} partner={partner} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center max-w-2xl mx-auto">
              <Handshake className="h-10 w-10 text-brand-blue mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold text-white mb-2">
                {dict.partners.emptyTitle}
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                {dict.partners.emptyBody}
              </p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
