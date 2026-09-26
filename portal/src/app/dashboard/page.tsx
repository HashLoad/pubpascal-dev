import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PlusCircle, Package, Sparkles } from "lucide-react";
import Header from "@/components/HeaderServer";
import Footer from "@/components/Footer";
import ProfileHeader from "@/components/ProfileHeader";
import AvatarUpload from "@/components/AvatarUpload";
import PackageListRow, { type ReadmeBadge } from "@/components/PackageListRow";
import { createClient } from "@/utils/supabase/server";
import { getMyPackages } from "@/utils/queries/publisher-packages";
import { getPublishValidationMap } from "@/utils/queries/publish-validation";
import { getReadmeOutcome } from "@/lib/publish-validation";
import { getRequestLocale } from "@/utils/locale";
import { getDictionary } from "@/app/[lang]/dictionaries";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getRequestLocale());
  return {
    title: dict.dashboard.meta.title,
    description: dict.dashboard.meta.description,
    robots: { index: false, follow: false },
  };
}

export default async function DashboardPage() {
  const locale = await getRequestLocale();
  const dict = await getDictionary(locale);
  const d = dict.dashboard;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const [{ data: profile }, rows] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, avatar_url, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    getMyPackages(user.id),
  ]);

  // Fail-soft batch read of publish-time validation reports → per-row README badge
  // (ADR-045, BR5). On a missing table / deferred migration this returns an empty
  // map and no badge renders.
  const validationMap = await getPublishValidationMap(rows.map((r) => r.id));

  function readmeBadge(packageId: string): ReadmeBadge | undefined {
    const outcome = getReadmeOutcome(validationMap.get(packageId));
    if (outcome !== "pass" && outcome !== "warn" && outcome !== "fail") {
      return undefined;
    }
    return { outcome, label: dict.publishValidation.badge[outcome] };
  }

  return (
    <div className="flex flex-col min-h-screen bg-brand-slate text-slate-100">
      <Header />

      <main className="flex-grow py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-10">
          <header className="flex flex-col gap-6 border-b border-slate-800 pb-8 lg:flex-row lg:items-center lg:justify-between">
            <ProfileHeader
              fullName={profile?.full_name ?? null}
              email={user.email ?? ""}
              avatarUrl={profile?.avatar_url ?? null}
              joinedAt={profile?.created_at ?? null}
              locale={locale}
              memberSince={dict.common.memberSince}
              avatarNode={
                <AvatarUpload
                  userId={user.id}
                  initialUrl={profile?.avatar_url ?? null}
                  fallback={(
                    (profile?.full_name?.trim() || user.email || "?").slice(0, 2)
                  ).toUpperCase()}
                  dict={dict.common.avatar}
                />
              }
            />
            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/sponsorship"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-brand-red/40 hover:text-white transition-colors"
              >
                <Sparkles className="h-4 w-4 text-brand-red" />
                {d.sponsorship}
              </Link>
              <Link
                href="/publish"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-red/20 hover:bg-brand-red/90 transition-colors"
              >
                <PlusCircle className="h-4 w-4" />
                {d.publish}
              </Link>
            </div>
          </header>

          <section>
            <h2 className="font-display text-xl font-bold text-white mb-4">
              {d.myPackagesPrefix} <span className="text-brand-red">{d.myPackagesHighlight}</span>
            </h2>

            {rows.length === 0 ? (
              <div className="mx-auto max-w-xl text-center py-16">
                <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-brand-red mb-6">
                  <Package className="h-8 w-8" />
                </div>
                <h3 className="font-display text-2xl font-bold text-white mb-3">
                  {d.emptyTitle}
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  {d.emptyBodyPrefix} <span className="font-mono text-brand-red">{d.emptyBodyHighlight}</span> {d.emptyBodySuffix}
                </p>
              </div>
            ) : (
              <div className="border-t border-slate-800">
                {rows.map((row) => (
                  <PackageListRow
                    key={row.id}
                    pkg={row}
                    status={row.status}
                    editHref={`/dashboard/packages/${row.id}/edit`}
                    statusLabels={dict.packageStatus}
                    tierLabels={dict.tiers.row}
                    readme={readmeBadge(row.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
