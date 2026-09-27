import Link from "next/link";
import { Sparkles, Plus } from "lucide-react";
import { PlansTableRow } from "./PlansTableRow";
import { getAllPlans } from "@/utils/queries/admin-plans";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const rows = await getAllPlans();

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Planos de <span className="text-brand-red">Destaque</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Defina tiers de patrocínio, ciclos de cobrança e preços. Base para o checkout futuro.
          </p>
        </div>
        <Link
          href="/admin/plans/new"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-red/20 hover:bg-brand-red/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo plano
        </Link>
      </header>

      {rows.length === 0 ? (
        <div className="mx-auto max-w-xl text-center py-16">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-brand-red mb-6">
            <Sparkles className="h-8 w-8" />
          </div>
          <h3 className="font-display text-2xl font-bold text-white mb-3">
            Nenhum plano cadastrado
          </h3>
          <p className="text-slate-400 leading-relaxed">
            Use <span className="font-mono text-brand-red">Novo plano</span> para criar o primeiro tier de patrocínio.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 border-b border-slate-850">
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Ciclo</th>
                <th className="px-4 py-3">Preço</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ordem</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {rows.map((row) => (
                <PlansTableRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
