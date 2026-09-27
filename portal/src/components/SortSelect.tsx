"use client";

import { useRouter } from "next/navigation";
import {
  buildPackagesUrl,
  SORT_ALLOWLIST,
  type ParsedSearchParams,
  type SortKey,
} from "@/app/[lang]/packages/searchParams";

type Props = {
  filters: ParsedSearchParams;
  lang: string;
  labels: { label: string } & Record<SortKey, string>;
};

// Catalog sort. Changing the order resets to page 1 and preserves every other
// filter (q / platform / language) via the shared `buildPackagesUrl`.
export default function SortSelect({ filters, lang, labels }: Props) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-xs text-slate-400">
      <span className="font-mono uppercase tracking-wide">{labels.label}</span>
      <select
        aria-label={labels.label}
        value={filters.sort}
        onChange={(e) =>
          router.push(
            buildPackagesUrl({
              ...filters,
              sort: e.target.value as SortKey,
              page: 1,
              lang,
            }),
          )
        }
        className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-200 transition-colors hover:border-slate-500 focus:border-brand-blue focus:outline-none"
      >
        {SORT_ALLOWLIST.map((s) => (
          <option key={s} value={s}>
            {labels[s]}
          </option>
        ))}
      </select>
    </label>
  );
}
