import Link from "next/link";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import {
  approveSubmission,
  rejectSubmission,
  setHighlightLevel,
} from "./actions";
import {
  HIGHLIGHT_LEVELS,
  type SubmissionRow,
  extractEsteiraVerdict,
} from "@/utils/queries/admin-submissions";

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  validating: "bg-brand-blue/10 text-brand-blue border-brand-blue/30",
  active: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  rejected: "bg-rose-500/10 text-rose-300 border-rose-500/30",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function PackageCell({ row }: { row: SubmissionRow }) {
  return (
    <td className="px-4 py-3 align-top">
      <Link
        href={`/packages/${row.slug}`}
        className="inline-flex items-center gap-1.5 font-semibold text-white hover:text-brand-red transition-colors"
      >
        {row.name}
        <ExternalLink className="h-3 w-3 text-slate-500" />
      </Link>
      <p className="text-xs font-mono text-slate-500 mt-0.5">{row.slug}</p>
    </td>
  );
}

function HighlightCell({ row }: { row: SubmissionRow }) {
  return (
    <td className="px-4 py-3 align-top">
      <form action={setHighlightLevel} className="inline-flex">
        <input type="hidden" name="id" value={row.id} />
        <select
          name="level"
          defaultValue={row.highlight_level}
          aria-label={`Nível de destaque de ${row.name}`}
          className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-xs font-mono text-slate-200 hover:border-slate-700 focus:border-brand-red focus:outline-none"
        >
          {HIGHLIGHT_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="ml-2 rounded-md border border-slate-800 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:border-brand-red/40 hover:text-white transition-colors"
        >
          Salvar
        </button>
      </form>
    </td>
  );
}

function ActionsCell({ row }: { row: SubmissionRow }) {
  return (
    <td className="px-4 py-3 align-top text-right">
      <div className="inline-flex gap-2">
        <form action={approveSubmission}>
          <input type="hidden" name="id" value={row.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Aprovar
          </button>
        </form>
        <form action={rejectSubmission}>
          <input type="hidden" name="id" value={row.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" />
            Rejeitar
          </button>
        </form>
      </div>
    </td>
  );
}

export function SubmissionTableRow({ row }: { row: SubmissionRow }) {
  const verdict = extractEsteiraVerdict(row.validation_report);
  const badge = STATUS_BADGE[row.status] ?? STATUS_BADGE.pending;
  return (
    <tr className="text-slate-300 hover:bg-slate-900/40 transition-colors">
      <PackageCell row={row} />
      <td className="px-4 py-3 align-top text-slate-400">
        {row.publisher_username ?? "—"}
      </td>
      <td className="px-4 py-3 align-top">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-mono uppercase tracking-wider ${badge}`}
        >
          {row.status}
        </span>
      </td>
      <HighlightCell row={row} />
      <td className="px-4 py-3 align-top max-w-[16ch] text-xs text-slate-400 truncate">
        {verdict ?? "—"}
      </td>
      <td className="px-4 py-3 align-top text-xs text-slate-500 font-mono whitespace-nowrap">
        {formatDate(row.created_at)}
      </td>
      <ActionsCell row={row} />
    </tr>
  );
}
