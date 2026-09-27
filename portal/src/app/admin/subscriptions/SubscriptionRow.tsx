"use client";

import { cancelSubscription } from "./actions";

const TIER_BADGE: Record<string, string> = {
  gold:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  silver: "bg-slate-400/10 text-slate-300 border-slate-400/30",
  bronze: "bg-amber-700/10 text-amber-500 border-amber-600/30",
};

const TIER_LABEL: Record<string, string> = {
  gold: "Gold", silver: "Prata", bronze: "Bronze",
};

const STATUS_BADGE: Record<string, string> = {
  active:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-slate-500/10 text-slate-400 border-slate-500/30",
  grace:     "bg-amber-500/10 text-amber-400 border-amber-500/30",
  expired:   "bg-red-500/10 text-red-400 border-red-500/30",
  draft:     "bg-slate-700/10 text-slate-500 border-slate-700/30",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Ativo", cancelled: "Cancelado", grace: "Grace",
  expired: "Expirado", draft: "Rascunho",
};

export type SubscriptionListRow = {
  id: string;
  status: string;
  sponsorship_ends_at: string | null;
  created_at: string;
  provider: string;
  package_name: string;
  package_slug: string;
  plan_tier: string;
  plan_cycle: string;
  publisher_name: string;
  sponsor_name: string | null;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function SubscriptionRow({ row }: { row: SubscriptionListRow }) {
  const tierCls = TIER_BADGE[row.plan_tier] ?? "bg-slate-800 text-slate-400 border-slate-700";
  const statusCls = STATUS_BADGE[row.status] ?? "bg-slate-800 text-slate-400 border-slate-700";
  const canCancel = row.status === "active" || row.status === "grace";

  return (
    <tr className="hover:bg-slate-900/30 transition-colors">
      {/* Package */}
      <td className="px-4 py-3">
        <p className="font-semibold text-white text-sm">{row.package_name}</p>
        <p className="text-xs text-slate-500 font-mono">{row.package_slug}</p>
      </td>

      {/* Tier */}
      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tierCls}`}>
          {TIER_LABEL[row.plan_tier] ?? row.plan_tier}
          <span className="text-[10px] opacity-60">/ {row.plan_cycle === "annual" ? "anual" : "mensal"}</span>
        </span>
      </td>

      {/* Status */}
      <td className="px-4 py-3">
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusCls}`}>
          {STATUS_LABEL[row.status] ?? row.status}
        </span>
      </td>

      {/* Publisher / Sponsor */}
      <td className="px-4 py-3">
        <p className="text-sm text-slate-300 truncate max-w-[140px]">{row.publisher_name}</p>
        {row.sponsor_name && (
          <p className="text-xs text-brand-blue truncate max-w-[140px]">via {row.sponsor_name}</p>
        )}
      </td>

      {/* Expiry */}
      <td className="px-4 py-3 text-sm text-slate-400 tabular-nums">
        {fmtDate(row.sponsorship_ends_at)}
      </td>

      {/* Created */}
      <td className="px-4 py-3 text-xs text-slate-500 tabular-nums">
        {fmtDate(row.created_at)}
        {row.provider === "manual" && (
          <span className="ml-1 text-[10px] text-slate-600">(manual)</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-3 text-right">
        {canCancel ? (
          <form action={cancelSubscription}>
            <input type="hidden" name="id" value={row.id} />
            <button
              type="submit"
              className="text-xs text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-500/40 rounded-lg px-3 py-1.5 transition-all"
            >
              Cancelar
            </button>
          </form>
        ) : (
          <span className="text-xs text-slate-700">—</span>
        )}
      </td>
    </tr>
  );
}
