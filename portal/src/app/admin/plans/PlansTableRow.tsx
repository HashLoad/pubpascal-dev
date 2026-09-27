import Link from "next/link";
import { Pencil, Pause, Play } from "lucide-react";
import { togglePlanStatus, deletePlan } from "./actions";
import { ConfirmDeleteForm } from "../ConfirmDeleteForm";
import type { PlanRow } from "@/utils/queries/admin-plans-types";

const TIER_BADGE: Record<string, string> = {
  gold: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  silver: "bg-slate-400/10 text-slate-200 border-slate-400/30",
  bronze: "bg-orange-500/10 text-orange-300 border-orange-500/30",
};

const CYCLE_LABEL: Record<string, string> = {
  monthly: "Mensal",
  annual: "Anual",
};

function formatPrice(cents: number, currency: string): string {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function ToggleButton({ row }: { row: PlanRow }) {
  const Icon = row.is_active ? Pause : Play;
  const label = row.is_active ? "Desativar" : "Ativar";
  return (
    <form action={togglePlanStatus}>
      <input type="hidden" name="id" value={row.id} />
      <input type="hidden" name="current" value={String(row.is_active)} />
      <button
        type="submit"
        className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-brand-red/40 hover:text-white transition-colors"
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
    </form>
  );
}

function ActionsCell({ row }: { row: PlanRow }) {
  return (
    <td className="px-4 py-3 align-top text-right">
      <div className="inline-flex gap-2">
        <Link
          href={`/admin/plans/${row.id}/edit`}
          className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-brand-red/40 hover:text-white transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Link>
        <ToggleButton row={row} />
        <ConfirmDeleteForm
          action={deletePlan}
          id={row.id}
          message={`Excluir o plano "${row.tier} / ${row.billing_cycle}"? Esta ação é permanente.`}
        />
      </div>
    </td>
  );
}

export function PlansTableRow({ row }: { row: PlanRow }) {
  const tierBadge = TIER_BADGE[row.tier] ?? TIER_BADGE.bronze;
  const statusBadge = row.is_active
    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
    : "bg-slate-500/10 text-slate-300 border-slate-500/30";
  return (
    <tr className="text-slate-300 hover:bg-slate-900/40 transition-colors">
      <td className="px-4 py-3 align-top">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wider ${tierBadge}`}
        >
          {row.tier}
        </span>
      </td>
      <td className="px-4 py-3 align-top text-sm">{CYCLE_LABEL[row.billing_cycle] ?? row.billing_cycle}</td>
      <td className="px-4 py-3 align-top text-sm font-mono text-white">
        {formatPrice(row.price_cents, row.currency)}
      </td>
      <td className="px-4 py-3 align-top">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wider ${statusBadge}`}
        >
          {row.is_active ? "ativo" : "inativo"}
        </span>
      </td>
      <td className="px-4 py-3 align-top text-xs text-slate-400 font-mono">{row.sort_order}</td>
      <ActionsCell row={row} />
    </tr>
  );
}
