import Link from "next/link";
import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Header from "@/components/HeaderServer";
import Footer from "@/components/Footer";
import { createClient } from "@/utils/supabase/server";
import { getMyPackageById } from "@/utils/queries/publisher-packages";
import { getCuratedTabContent } from "@/utils/queries/tab-content";
import { isUuid } from "@/utils/queries/admin-submissions";
import { getRequestLocale } from "@/utils/locale";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { PackageEditForm } from "../../../PackageEditForm";
import { deleteMyPackage, restoreMyPackage } from "../../../actions";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getRequestLocale());
  return {
    title: dict.dashboard.meta.editTitle,
    robots: { index: false, follow: false },
  };
}

type PageProps = { params: Promise<{ id: string }> };

export default async function EditMyPackagePage({ params }: PageProps) {
  const { id } = await params;

  const dict = await getDictionary(await getRequestLocale());

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/dashboard/packages/${id}/edit`);
  }

  if (!isUuid(id)) notFound();

  const pkg = await getMyPackageById(user.id, id);
  if (!pkg) notFound();

  // Curated tab content lives in the satellite table (ADR-035) — read separately
  // and merged in, keeping the getMyPackageById select unchanged. Fail-soft to null.
  const curated = await getCuratedTabContent(id);
  const editable = { ...pkg, example: curated.example, installing: curated.installing };

  return (
    <div className="flex flex-col min-h-screen bg-brand-slate text-slate-100">
      <Header />

      <main className="flex-grow py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-8">
          <header>
            <Link
              href="/dashboard"
              className="text-xs font-mono uppercase tracking-[0.15em] text-slate-500 hover:text-slate-300 transition-colors"
            >
              ← {dict.dashboard.edit.back}
            </Link>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white mt-2">
              {dict.dashboard.edit.headingPrefix}{" "}
              <span className="text-brand-red">{dict.dashboard.edit.headingHighlight}</span>
            </h1>
          </header>

          <PackageEditForm
            pkg={editable}
            dict={dict.dashboard}
            markdownLabels={dict.markdownEditor}
          />

          <section className="rounded-lg border border-rose-900/40 bg-rose-950/10 p-5">
            <h2 className="text-sm font-bold text-rose-300">{dict.dashboard.edit.dangerZone}</h2>
            {editable.status === "deleted" ? (
              <form action={restoreMyPackage} className="mt-2">
                <input type="hidden" name="id" value={editable.id} />
                <p className="mb-3 text-xs text-slate-400">{dict.dashboard.edit.restoreHelp}</p>
                <button
                  type="submit"
                  className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-300 hover:bg-green-500/15 transition-colors"
                >
                  {dict.dashboard.edit.restore}
                </button>
              </form>
            ) : (
              <form action={deleteMyPackage} className="mt-2">
                <input type="hidden" name="id" value={editable.id} />
                <p className="mb-3 text-xs text-slate-400">{dict.dashboard.edit.deleteHelp}</p>
                <button
                  type="submit"
                  className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-300 hover:bg-rose-500/15 transition-colors"
                >
                  {dict.dashboard.edit.delete}
                </button>
              </form>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
