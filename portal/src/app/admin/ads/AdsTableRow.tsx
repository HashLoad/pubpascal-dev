import Link from "next/link";
import { Pencil, Pause, Play } from "lucide-react";
import { toggleAdStatus, deleteAd } from "./actions";
import { ConfirmDeleteForm } from "../ConfirmDeleteForm";
import type { AdRow } from "@/utils/queries/admin-ads-types";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  active: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  paused: "bg-slate-500/10 text-slate-300 border-slate-500/30",
  expired: "bg-rose-500/10 text-rose-300 border-rose-500/30",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function ToggleButton({ row }: { row: AdRow }) {
  if (row.status !== "active" && row.status !== "paused") return null;
  const Icon = row.status === "active" ? Pause : Play;
  const label = row.status === "active" ? "Pausar" : "Ativar";
  return (
    <form action={toggleAdStatus}>
      <input type="hidden" name="id" value={row.id} />
      <input type="hidden" name="current" value={row.status} />
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

function ActionsCell({ row }: { row: AdRow }) {
  return (
    <td className="px-4 py-3 align-top text-right">
      <div className="inline-flex gap-2">
        <Link
          href={`/admin/ads/${row.id}/edit`}
          className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-brand-red/40 hover:text-white transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Link>
        <ToggleButton row={row} />
        <ConfirmDeleteForm
          action={deleteAd}
          id={row.id}
          message={`Excluir o anúncio "${row.title}"? Esta ação é permanente.`}
        />
      </div>
    </td>
  );
}

export function AdsTableRow({ row }: { row: AdRow }) {
  const badge = STATUS_BADGE[row.status] ?? STATUS_BADGE.pending;
  return (
    <tr className="text-slate-300 hover:bg-slate-900/40 transition-colors">
      <td className="px-4 py-3 align-top font-semibold text-white">{row.title}</td>
      <td className="px-4 py-3 align-top">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wider ${badge}`}
        >
          {row.status}
        </span>
      </td>
      <td className="px-4 py-3 align-top text-xs text-slate-500 font-mono whitespace-nowrap">
        {formatDate(row.start_date)}
      </td>
      <td className="px-4 py-3 align-top text-xs text-slate-500 font-mono whitespace-nowrap">
        {formatDate(row.end_date)}
      </td>
      <td className="px-4 py-3 align-top text-xs text-slate-400 font-mono">{row.impressions}</td>
      <td className="px-4 py-3 align-top text-xs text-slate-400 font-mono">{row.clicks}</td>
      <ActionsCell row={row} />
    </tr>
  );
}
