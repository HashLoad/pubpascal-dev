import { EyeOff, Eye, Ban, ShieldCheck } from "lucide-react";
import { ConfirmDeleteForm } from "../ConfirmDeleteForm";
import {
  flagReviewAction,
  unflagReviewAction,
  deleteReviewAction,
  banUserAction,
  unbanUserAction,
} from "./actions";
import type { AdminReviewRow } from "@/utils/queries/admin-reviews";

const ACTION_BTN =
  "inline-flex items-center gap-1 rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-brand-red/40 hover:text-white transition-colors";

function FlagToggle({ row }: { row: AdminReviewRow }) {
  const action = row.is_flagged ? unflagReviewAction : flagReviewAction;
  const Icon = row.is_flagged ? Eye : EyeOff;
  const label = row.is_flagged ? "Exibir" : "Ocultar";
  return (
    <form action={action}>
      <input type="hidden" name="id" value={row.id} />
      <button type="submit" className={ACTION_BTN}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
    </form>
  );
}

function BanToggle({ row, banned }: { row: AdminReviewRow; banned: boolean }) {
  const action = banned ? unbanUserAction : banUserAction;
  const Icon = banned ? ShieldCheck : Ban;
  const label = banned ? "Desbanir" : "Banir";
  return (
    <form action={action}>
      <input type="hidden" name="userId" value={row.reviewer_id} />
      <button type="submit" className={ACTION_BTN}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </button>
    </form>
  );
}

export function ReviewsTableRow({ row, banned }: { row: AdminReviewRow; banned: boolean }) {
  const flaggedBadge = row.is_flagged
    ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
    : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
  return (
    <tr className="text-slate-300 hover:bg-slate-900/40 transition-colors align-top">
      <td className="px-4 py-3 text-sm font-mono text-white">{row.package_slug ?? "—"}</td>
      <td className="px-4 py-3 text-xs">
        {row.reviewer_username ?? row.reviewer_id.slice(0, 8)}
        {banned && (
          <span className="ml-2 text-[10px] font-mono uppercase text-rose-400">banido</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm font-mono text-amber-400">★ {row.rating}</td>
      <td className="px-4 py-3 text-xs text-slate-400 max-w-xs">
        {row.body ? `${row.body.slice(0, 80)}${row.body.length > 80 ? "…" : ""}` : "—"}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wider ${flaggedBadge}`}
        >
          {row.is_flagged ? "oculta" : "visível"}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-slate-500 font-mono">
        {new Date(row.created_at).toLocaleDateString("pt-BR")}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex gap-2">
          <FlagToggle row={row} />
          <BanToggle row={row} banned={banned} />
          <ConfirmDeleteForm
            action={deleteReviewAction}
            id={row.id}
            message="Excluir esta avaliação permanentemente? Esta ação não pode ser desfeita."
          />
        </div>
      </td>
    </tr>
  );
}
