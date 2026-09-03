import { ShieldAlert } from "lucide-react";
import { ReviewsTableRow } from "./ReviewsTableRow";
import { getAdminReviews, getBannedReviewerIds } from "@/utils/queries/admin-reviews";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const rows = await getAdminReviews();
  const banned = await getBannedReviewerIds([...new Set(rows.map((r) => r.reviewer_id))]);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <header>
        <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Moderação de <span className="text-brand-red">Avaliações</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Oculte avaliações abusivas, exclua avaliações ou banir usuários de publicar. Avaliações
          ocultas somem da página pública mas permanecem no banco.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="mx-auto max-w-xl text-center py-16">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-brand-red mb-6">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h3 className="font-display text-2xl font-bold text-white mb-3">
            Nenhuma avaliação ainda
          </h3>
          <p className="text-slate-400 leading-relaxed">
            Quando usuários avaliarem pacotes, elas aparecerão aqui para moderação.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-md">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 border-b border-slate-850">
                <th className="px-4 py-3">Pacote</th>
                <th className="px-4 py-3">Autor</th>
                <th className="px-4 py-3">Nota</th>
                <th className="px-4 py-3">Comentário</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {rows.map((row) => (
                <ReviewsTableRow key={row.id} row={row} banned={banned.has(row.reviewer_id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
