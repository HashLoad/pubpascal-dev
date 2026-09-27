import React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildPackagesUrl, type ParsedSearchParams } from "@/app/[lang]/packages/searchParams";
import { getRequestLocale } from "@/utils/locale";

type Props = {
  filters: ParsedSearchParams;
  totalPages: number;
};

export default async function PaginationControls({ filters, totalPages }: Props) {
  if (totalPages <= 1) return null;

  const lang = await getRequestLocale();
  const { page } = filters;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const prevHref = buildPackagesUrl({ ...filters, page: page - 1, lang });
  const nextHref = buildPackagesUrl({ ...filters, page: page + 1, lang });

  const baseBtn =
    "inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors";
  const activeBtn =
    "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-500 hover:text-white";
  const disabledBtn =
    "border-slate-900 bg-slate-950/40 text-slate-600 cursor-not-allowed";

  return (
    <nav
      className="mt-10 flex items-center justify-between gap-4"
      aria-label="Paginação"
    >
      {hasPrev ? (
        <Link href={prevHref} className={`${baseBtn} ${activeBtn}`}>
          <ChevronLeft className="h-4 w-4" />
          <span>Anterior</span>
        </Link>
      ) : (
        <span className={`${baseBtn} ${disabledBtn}`} aria-disabled="true">
          <ChevronLeft className="h-4 w-4" />
          <span>Anterior</span>
        </span>
      )}

      <span className="text-xs font-mono text-slate-500">
        Página <span className="text-slate-300 font-semibold">{page}</span> de{" "}
        <span className="text-slate-300 font-semibold">{totalPages}</span>
      </span>

      {hasNext ? (
        <Link href={nextHref} className={`${baseBtn} ${activeBtn}`}>
          <span>Próxima</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={`${baseBtn} ${disabledBtn}`} aria-disabled="true">
          <span>Próxima</span>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}
