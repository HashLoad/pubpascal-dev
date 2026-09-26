import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Sparkles } from "lucide-react";
import Header from "@/components/HeaderServer";
import Footer from "@/components/Footer";
import { createClient } from "@/utils/supabase/server";
import { getActivePlans } from "@/utils/queries/sponsorship-plans";
import {
  PLAN_TIER_ORDER,
  TIER_LABEL,
  type PlanRow,
  type PlanTier,
} from "@/utils/queries/sponsorship-plans-types";
import { PlanCard } from "./PlanCard";
import { CheckoutButton } from "./CheckoutButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Planos de patrocínio — PubPascal-Dev",
  description: "Conheça os planos de destaque para pacotes no PubPascal-Dev.",
  robots: { index: false, follow: false },
};

function groupByTier(plans: PlanRow[]): Record<PlanTier, PlanRow[]> {
  const groups = { gold: [], silver: [], bronze: [] } as Record<PlanTier, PlanRow[]>;
  for (const plan of plans) {
    groups[plan.tier].push(plan);
  }
  return groups;
}

export default async function SponsorshipPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/sponsorship");
  }

  const plans = await getActivePlans();
  const groups = groupByTier(plans);

  return (
    <div className="flex flex-col min-h-screen bg-brand-slate text-slate-100">
      <Header />

      <main className="flex-grow py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-10">
          <header>
            <Link
              href="/dashboard"
              className="text-xs font-mono uppercase tracking-[0.15em] text-slate-500 hover:text-slate-300 transition-colors"
            >
              ← Meus pacotes
            </Link>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-white mt-2">
              Planos de <span className="text-brand-red">Patrocínio</span>
            </h1>
            <p className="mt-2 text-slate-400 leading-relaxed max-w-2xl">
              Destaque seus pacotes no portal. Escolha o nível e o ciclo de
              cobrança; nossa equipe finaliza a contratação com você.
            </p>
          </header>

          {plans.length === 0 ? (
            <div className="mx-auto max-w-xl text-center py-16">
              <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-brand-red mb-6">
                <Sparkles className="h-8 w-8" />
              </div>
              <h2 className="font-display text-2xl font-bold text-white mb-3">
                Nenhum plano disponível
              </h2>
              <p className="text-slate-400 leading-relaxed">
                Os planos de patrocínio ainda não foram publicados. Volte ao{" "}
                <Link href="/dashboard" className="font-mono text-brand-red hover:underline">
                  painel
                </Link>{" "}
                em breve.
              </p>
            </div>
          ) : (
            <div className="space-y-10">
              {PLAN_TIER_ORDER.map((tier) => {
                const tierPlans = groups[tier];
                if (tierPlans.length === 0) return null;
                return (
                  <section key={tier}>
                    <h2 className="font-display text-xl font-bold text-white mb-4">
                      Nível <span className="text-brand-red">{TIER_LABEL[tier]}</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
                      {tierPlans.map((plan) => (
                        <PlanCard key={plan.id} plan={plan}>
                          <CheckoutButton planId={plan.id} />
                        </PlanCard>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
