import Link from "next/link";
import { Inbox } from "lucide-react";
import { SubmissionTableRow } from "./SubmissionTableRow";
import {
  SUBMISSION_STATUSES,
  type SubmissionStatusFilter,
  listSubmissions,
} from "@/utils/queries/admin-submissions";

export const dynamic = "force-dynamic";

const CHIP_LABELS: Record<SubmissionStatusFilter, string> = {
  pending: "Pendentes",
  validating: "Validando",
  rejected: "Rejeitados",
  all: "Todos",
};

function parseStatus(raw: string | string[] | undefined): SubmissionStatusFilter {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value && (SUBMISSION_STATUSES as readonly string[]).includes(value)) {
    return value as SubmissionStatusFilter;
  }
  return "pending";
}

type PageProps = {
  searchParams: Promise<{ status?: string | string[] }>;
};

export default async function AdminSubmissionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const rows = await listSubmissions({ status });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header>
        <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Submissões <span className="text-brand-red">Pendentes</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Aprove, rejeite e ajuste o nível comercial dos pacotes em moderação.
        </p>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Filtro de status">
        {SUBMISSION_STATUSES.map((s) => {
          const active = s === status;
          return (
            <Link
              key={s}
              href={s === "pending" ? "/admin/submissions" : `/admin/submissions?status=${s}`}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider transition-colors ${
                active
                  ? "border-brand-red/40 bg-brand-red/10 text-brand-red"
                  : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              {CHIP_LABELS[s]}
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <div className="mx-auto max-w-xl text-center py-16">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-brand-red mb-6">
            <Inbox className="h-8 w-8" />
          </div>
          <h3 className="font-display text-2xl font-bold text-white mb-3">
            Nada na fila
          </h3>
          <p className="text-slate-400 leading-relaxed">
            Não há pacotes em <span className="font-mono text-brand-red">{status}</span> no momento.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 border-b border-slate-850">
                <th className="px-4 py-3">Pacote</th>
                <th className="px-4 py-3">Publisher</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Destaque</th>
                <th className="px-4 py-3">Esteira</th>
                <th className="px-4 py-3">Criado em</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {rows.map((row) => (
                <SubmissionTableRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
