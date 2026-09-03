import Link from "next/link";
import { Pencil, Pause, Play, ExternalLink } from "lucide-react";
import { togglePartnerStatus, deletePartner } from "./actions";
import { ConfirmDeleteForm } from "../ConfirmDeleteForm";
import type { PartnerRow } from "@/utils/queries/admin-partners-types";

const STATUS_BADGE: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  inactive: "bg-slate-500/10 text-slate-300 border-slate-500/30",
};

function ToggleButton({ row }: { row: PartnerRow }) {
  const Icon = row.status === "active" ? Pause : Play;
  const label = row.status === "active" ? "Desativar" : "Ativar";
  return (
    <form action={togglePartnerStatus}>
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

function ActionsCell({ row }: { row: PartnerRow }) {
  return (
    <td className="px-4 py-3 align-top text-right">
      <div className="inline-flex gap-2">
        <Link
          href={`/admin/partners/${row.id}/edit`}
          className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-brand-red/40 hover:text-white transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Link>
        <ToggleButton row={row} />
        <ConfirmDeleteForm
          action={deletePartner}
          id={row.id}
          message={`Excluir o parceiro "${row.name}"? Esta ação é permanente.`}
        />
      </div>
    </td>
  );
}

export function PartnersTableRow({ row }: { row: PartnerRow }) {
  const badge = STATUS_BADGE[row.status] ?? STATUS_BADGE.inactive;
  return (
    <tr className="text-slate-300 hover:bg-slate-900/40 transition-colors">
      <td className="px-4 py-3 align-top font-semibold text-white">{row.name}</td>
      <td className="px-4 py-3 align-top">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wider ${badge}`}
        >
          {row.status}
        </span>
      </td>
      <td className="px-4 py-3 align-top text-xs text-slate-400 font-mono">
        {row.sort_order}
      </td>
      <td className="px-4 py-3 align-top max-w-[28ch] truncate">
        <a
          href={row.website_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-brand-red transition-colors"
        >
          {row.website_url}
          <ExternalLink className="h-3 w-3" />
        </a>
      </td>
      <ActionsCell row={row} />
    </tr>
  );
}
