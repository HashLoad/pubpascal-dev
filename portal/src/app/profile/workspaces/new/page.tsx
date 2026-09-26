import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Header from "@/components/HeaderServer";
import Footer from "@/components/Footer";
import { createClient } from "@/utils/supabase/server";
import { getRequestLocale } from "@/utils/locale";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { getActivePackagesForSelect } from "../query";
import { WorkspaceCreateForm } from "../WorkspaceCreateForm";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getRequestLocale());
  return {
    title: dict.workspaces.create.metaTitle,
    robots: { index: false, follow: false },
  };
}

export default async function NewWorkspacePage() {
  const dict = await getDictionary(await getRequestLocale());
  const w = dict.workspaces;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/profile/workspaces/new");
  }

  const packages = await getActivePackagesForSelect(user.id);

  return (
    <div className="flex flex-col min-h-screen bg-brand-slate text-slate-100">
      <Header />

      <main className="flex-grow py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-8">
          <header>
            <Link
              href="/profile/workspaces"
              className="text-xs font-mono uppercase tracking-[0.15em] text-slate-500 hover:text-slate-300 transition-colors"
            >
              ← {w.create.back}
            </Link>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white mt-2">
              {w.create.headingPrefix}{" "}
              <span className="text-brand-red">{w.create.headingHighlight}</span>
            </h1>
            <p className="text-slate-400 mt-1">{w.create.subtitle}</p>
          </header>

          <WorkspaceCreateForm dict={w} packages={packages} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
