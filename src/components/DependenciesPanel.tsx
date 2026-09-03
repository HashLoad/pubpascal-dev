import Link from "next/link";
import { Boxes, ArrowUpRight } from "lucide-react";

export type ResolvedDependency = {
  key: string; // "owner/repo"
  version: string; // declared version/range (may be empty = unpinned)
  slug: string | null; // catalog slug when the dep is a published package
  name: string | null; // catalog name when published
};

export type DependenciesLabels = {
  heading: string;
  source: string; // e.g. "Declared in pubpascal.json"
  anyVersion: string; // shown when the version is empty (unpinned)
  notPublished: string; // tooltip when the dep isn't on the portal
};

export default function DependenciesPanel({
  deps,
  lang,
  dict,
}: {
  deps: ResolvedDependency[];
  lang: string;
  dict: DependenciesLabels;
}) {
  if (deps.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Boxes className="h-4 w-4 text-brand-blue" />
        <h3 className="font-display text-sm font-bold text-white">{dict.heading}</h3>
        <span className="ml-auto text-xs text-slate-500">{deps.length}</span>
      </div>
      <p className="text-[11px] text-slate-500 mb-3">{dict.source}</p>

      <ul className="flex flex-col gap-1.5">
        {deps.map((d) => {
          const versionLabel = d.version.trim() || dict.anyVersion;
          return (
            <li key={d.key}>
              {d.slug ? (
                <Link
                  href={`/${lang}/packages/${d.slug}`}
                  className="group flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 hover:border-brand-blue/50 transition-colors"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200 group-hover:text-white">
                    {d.name ?? d.key}
                  </span>
                  <span className="font-mono text-[11px] text-brand-blue">{versionLabel}</span>
                </Link>
              ) : (
                <a
                  href={`https://github.com/${d.key}`}
                  target="_blank"
                  rel="noreferrer"
                  title={dict.notPublished}
                  className="group flex items-center gap-2 rounded-lg border border-slate-800/60 px-3 py-2 hover:border-slate-600 transition-colors"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-400 group-hover:text-slate-200">
                    {d.key}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500">{versionLabel}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
