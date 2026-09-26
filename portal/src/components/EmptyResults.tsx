import React from "react";
import Link from "next/link";
import { PackageOpen, ArrowLeft } from "lucide-react";
import type { ParsedSearchParams } from "@/app/[lang]/packages/searchParams";
import { getRequestLocale } from "@/utils/locale";

export default async function EmptyResults({ filters }: { filters: ParsedSearchParams }) {
  const lang = await getRequestLocale();
  const echoes: string[] = [];
  if (filters.q.length > 0) echoes.push(`busca "${filters.q}"`);
  if (filters.platform) echoes.push(`plataforma ${filters.platform}`);
  if (filters.language) echoes.push(`IDE/dialeto ${filters.language}`);
  if (filters.category) echoes.push(`categoria ${filters.category}`);

  const summary = echoes.length > 0 ? echoes.join(" + ") : null;

  return (
    <div className="mx-auto max-w-xl text-center py-16">
      <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-brand-red mb-6">
        <PackageOpen className="h-8 w-8" />
      </div>
      <h2 className="font-display text-2xl font-bold text-white mb-3">
        Nenhum pacote encontrado
      </h2>
      <p className="text-slate-400 leading-relaxed">
        {summary
          ? `Não encontramos pacotes para ${summary}. Tente remover algum filtro ou voltar ao início.`
          : "Ainda não há pacotes ativos para listar. Volte em breve."}
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href={`/${lang}`}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-red-dark transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao início
        </Link>
        <Link
          href={`/${lang}/packages`}
          className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900/60 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
        >
          Limpar filtros
        </Link>
      </div>
    </div>
  );
}
