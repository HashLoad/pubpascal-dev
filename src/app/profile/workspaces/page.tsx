import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FolderGit2, Plus, Lock, Globe } from "lucide-react";
import Header from "@/components/HeaderServer";
import Footer from "@/components/Footer";
import { createClient } from "@/utils/supabase/server";
import { getMyWorkspaces } from "./query";
import { getRequestLocale } from "@/utils/locale";
import { getDictionary } from "@/app/[lang]/dictionaries";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getRequestLocale());
  return {
    title: dict.workspaces.meta.title,
    description: dict.workspaces.meta.description,
    robots: { index: false, follow: false },
  };
}

const ctaClass =
  "inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-red/20 hover:bg-brand-red/90 transition-colors";

export default async function WorkspacesPage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);
  const w = dict.workspaces;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/profile/workspaces");
  }

  const rows = await getMyWorkspaces(user.id);
  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex flex-col min-h-screen bg-brand-slate text-slate-100">
      <Header />

      <main className="flex-grow py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-10">
          <header className="border-b border-slate-800 pb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
                {w.list.titlePrefix} <span className="text-brand-red">{w.list.titleHighlight}</span>
              </h1>
              <p className="text-slate-400 mt-1">{w.list.subtitle}</p>
            </div>
            <Link href="/profile/workspaces/new" className={`${ctaClass} shrink-0`}>
              <Plus className="h-4 w-4" />
              {w.list.createCta}
            </Link>
          </header>

          <section>
            {rows.length === 0 ? (
              <div className="mx-auto max-w-lg text-center py-12">
                <div className="mx-auto h-14 w-14 flex items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-brand-red mb-5">
                  <FolderGit2 className="h-7 w-7" />
                </div>
                <h2 className="font-display text-xl font-bold text-white mb-2">
                  {w.list.emptyTitle}
                </h2>
                <p className="text-slate-400 leading-relaxed mb-6">{w.list.emptyBody}</p>
                <Link href="/profile/workspaces/new" className={ctaClass}>
                  <Plus className="h-4 w-4" />
                  {w.list.createCta}
                </Link>
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rows.map((row) => (
                  <li key={row.id}>
                    <Link
                      href={`/profile/workspaces/${row.id}/edit`}
                      className="group flex h-full flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-5 hover:border-slate-700 hover:bg-slate-900 transition-colors"
                    >
                      <p className="font-semibold text-white truncate group-hover:text-brand-red transition-colors">
                        {row.name}
                      </p>
                      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          {row.visibility === "public" ? (
                            <Globe className="h-3 w-3" />
                          ) : (
                            <Lock className="h-3 w-3" />
                          )}
                          {row.visibility === "public" ? w.visibility.public : w.visibility.private}
                        </span>
                        <span>
                          {w.list.updatedLabel} {dateFmt.format(new Date(row.updated_at))}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
