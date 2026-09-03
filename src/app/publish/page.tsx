import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Header from "@/components/HeaderServer";
import Footer from "@/components/Footer";
import PackageSubmitForm from "@/components/PackageSubmitForm";
import { createClient } from "@/utils/supabase/server";
import { getRequestLocale } from "@/utils/locale";
import { getDictionary } from "@/app/[lang]/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);
  return {
    title: dict.publish.meta.title,
    description: dict.publish.meta.description,
    robots: { index: false, follow: false },
  };
}

export default async function PublishPage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/publish");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="flex flex-col min-h-screen bg-brand-slate text-slate-100">
      <Header />

      <main className="flex-grow py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <header className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              {dict.publish.heading}
            </h1>
            <p className="mt-3 text-slate-400 leading-relaxed">
              {dict.publish.intro}
            </p>
          </header>

          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 sm:p-8 shadow-2xl">
            <PackageSubmitForm
              defaultDisplayName={profile?.full_name ?? ""}
              dict={dict.publish}
              markdownLabels={dict.markdownEditor}
              validationDict={dict.publishValidation}
            />
          </section>

          <p className="mt-6 text-xs text-slate-500 leading-relaxed">
            {dict.publish.disclaimer}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
