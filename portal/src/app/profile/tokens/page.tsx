import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Header from "@/components/HeaderServer";
import Footer from "@/components/Footer";
import { createClient } from "@/utils/supabase/server";
import { getMyCliTokens } from "./query";
import { getRequestLocale } from "@/utils/locale";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { TokensClient } from "./TokensClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getRequestLocale());
  return {
    title: dict.tokens.meta.title,
    description: dict.tokens.meta.description,
    robots: { index: false, follow: false },
  };
}

export default async function TokensPage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);
  const t = dict.tokens;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/profile/tokens");
  }

  const tokens = await getMyCliTokens(user.id);

  return (
    <div className="flex flex-col min-h-screen bg-brand-slate text-slate-100">
      <Header />

      <main className="flex-grow py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-10">
          <header className="border-b border-slate-800 pb-6">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
              {t.list.titlePrefix}{" "}
              <span className="text-brand-red">{t.list.titleHighlight}</span>
            </h1>
            <p className="text-slate-400 mt-1">{t.list.subtitle}</p>
          </header>

          <TokensClient tokens={tokens} dict={t} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
