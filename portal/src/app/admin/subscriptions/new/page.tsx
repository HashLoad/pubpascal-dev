import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { SubscriptionNewForm } from "./SubscriptionNewForm";

export const dynamic = "force-dynamic";

export default async function NewSubscriptionPage() {
  const supabase = await createClient();

  const [{ data: packages }, { data: plans }, { data: partners }] = await Promise.all([
    supabase
      .from("packages")
      .select("id, name, slug")
      .eq("status", "active")
      .order("name"),
    supabase
      .from("plans")
      .select("id, tier, billing_cycle, price_cents")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("partners")
      .select("id, name")
      .eq("status", "active")
      .order("name"),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header>
        <Link
          href="/admin/subscriptions"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 mb-4 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar às subscriptions
        </Link>
        <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Novo <span className="text-brand-red">Destaque</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Associa um plano de destaque a um pacote ativo. A vigência começa agora e segue o ciclo do plano.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-md p-6">
        <SubscriptionNewForm
          packages={packages ?? []}
          plans={plans ?? []}
          partners={partners ?? []}
        />
      </div>
    </div>
  );
}
