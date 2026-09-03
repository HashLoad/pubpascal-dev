import React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { buildPackagesUrl, type ParsedSearchParams } from "@/app/[lang]/packages/searchParams";
import { getRequestLocale } from "@/utils/locale";

type Chip = {
  key: string;
  label: string;
  removeHref: string;
};

function buildChips(filters: ParsedSearchParams, lang: string): Chip[] {
  const chips: Chip[] = [];

  if (filters.q.length > 0) {
    chips.push({
      key: "q",
      label: `Busca: "${filters.q}"`,
      removeHref: buildPackagesUrl({ ...filters, q: "", page: 1, lang }),
    });
  }

  if (filters.platform) {
    chips.push({
      key: "platform",
      label: `Plataforma: ${filters.platform}`,
      removeHref: buildPackagesUrl({ ...filters, platform: null, page: 1, lang }),
    });
  }

  if (filters.language) {
    chips.push({
      key: "language",
      label: `IDE/Dialeto: ${filters.language}`,
      removeHref: buildPackagesUrl({ ...filters, language: null, page: 1, lang }),
    });
  }

  if (filters.category) {
    chips.push({
      key: "category",
      label: `Categoria: ${filters.category}`,
      removeHref: buildPackagesUrl({ ...filters, category: null, page: 1, lang }),
    });
  }

  return chips;
}

export default async function ActiveFilterChips({ filters }: { filters: ParsedSearchParams }) {
  const lang = await getRequestLocale();
  const chips = buildChips(filters, lang);
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
        Filtros ativos:
      </span>
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.removeHref}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-red/10 border border-brand-red/30 px-3 py-1 text-xs font-medium text-brand-red hover:bg-brand-red/15 hover:border-brand-red/50 transition-colors"
        >
          <span>{chip.label}</span>
          <X className="h-3 w-3" />
        </Link>
      ))}
      <Link
        href={`/${lang}/packages`}
        className="text-xs font-semibold text-slate-400 hover:text-white underline underline-offset-4 ml-1"
      >
        Limpar tudo
      </Link>
    </div>
  );
}
