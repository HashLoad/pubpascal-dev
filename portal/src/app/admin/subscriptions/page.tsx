import Link from "next/link";
import { CreditCard, Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { SubscriptionRow, type SubscriptionListRow } from "./SubscriptionRow";

export const dynamic = "force-dynamic";

const TIER_ORDER: Record<string, number> = { gold: 0, silver: 1, bronze: 2 };

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select(`
      id,
      status,
      sponsorship_ends_at,
      created_at,
      provider,
      package_id,
      publisher_id,
      packages ( name, slug ),
      plans ( tier, billing_cycle ),
      profiles ( username, full_name ),
      partners ( name )
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.warn("[admin/subscriptions] query failed", error);
  }

  const rows: SubscriptionListRow[] = (data ?? []).map((row) => {
    const pkg = row.packages as unknown as { name: string; slug: string } | null;
    const plan = row.plans as unknown as { tier: string; billing_cycle: string } | null;
    const profile = row.profiles as unknown as { username: string | null; full_name: string | null } | null;
    const sponsor = row.partners as unknown as { name: string } | null;

    return {
      id: row.id,
      status: row.status,
      sponsorship_ends_at: row.sponsorship_ends_at ?? null,
      created_at: row.created_at,
      provider: row.provider,
      package_name: pkg?.name ?? "(sem pacote)",
      package_slug: pkg?.slug ?? "—",
      plan_tier: plan?.tier ?? "—",
      plan_cycle: plan?.billing_cycle ?? "—",
      publisher_name: profile?.full_name ?? profile?.username ?? "—",
      sponsor_name: sponsor?.name ?? null,
    };
  });

  // Sort: active first, then by tier rank
  rows.sort((a, b) => {
    const statusRank = (s: string) => s === "active" ? 0 : s === "grace" ? 1 : s === "cancelled" ? 2 : 3;
    const sr = statusRank(a.status) - statusRank(b.status);
    if (sr !== 0) return sr;
    return (TIER_ORDER[a.plan_tier] ?? 9) - (TIER_ORDER[b.plan_tier] ?? 9);
  });

  const active = rows.filter((r) => r.status === "active").length;
  const grace  = rows.filter((r) => r.status === "grace").length;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Destaques <span className="text-brand-red">Ativos</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Gerencie qual pacote está em qual nível de destaque. Cancele planos ou ative novos manualmente.
          </p>
          <div className="flex gap-4 mt-3 text-xs font-mono text-slate-500">
            <span className="text-emerald-400">{active} ativos</span>
            {grace > 0 && <span className="text-amber-400">{grace} em grace</span>}
            <span>{rows.length} total</span>
          </div>
        </div>
        <Link
          href="/admin/subscriptions/new"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-red/20 hover:bg-brand-red/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo destaque
        </Link>
      </header>

      {rows.length === 0 ? (
        <div className="mx-auto max-w-xl text-center py-16">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-brand-red mb-6">
            <CreditCard className="h-8 w-8" />
          </div>
          <h3 className="font-display text-2xl font-bold text-white mb-3">
            Nenhuma subscription encontrada
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Use <span className="font-mono text-brand-red">Novo destaque</span> para associar um plano a um pacote.
          </p>
          <Link
            href="/admin/subscriptions/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-red/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Novo destaque
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 border-b border-slate-800">
                <th className="px-4 py-3">Pacote</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Publisher / Sponsor</th>
                <th className="px-4 py-3">Expira</th>
                <th className="px-4 py-3">Criado</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rows.map((row) => (
                <SubscriptionRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
