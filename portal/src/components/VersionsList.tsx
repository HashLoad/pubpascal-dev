import React from "react";
import { Download, Calendar, ShieldCheck } from "lucide-react";
import MarkdownView from "./MarkdownView";
import type { PackageVersion } from "@/app/[lang]/packages/[slug]/query";
import type { SbomFormat } from "@/utils/queries/package-sbom";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

// Human label for the SBOM format chip. The format names are proper nouns
// (CycloneDX / SPDX), not localizable strings.
function sbomFormatLabel(format: SbomFormat): string {
  return format === "cyclonedx" ? "CycloneDX" : "SPDX";
}

export default function VersionsList({
  versions,
  sbomByVersion = {},
  sbomDownloadUrls = {},
  yankedVersions = [],
}: {
  versions: PackageVersion[];
  sbomByVersion?: Record<string, SbomFormat>;
  // Per-version SBOM download URL — points straight at the repo's raw SBOM file.
  // A per-version SBOM affordance renders only for versions present here.
  sbomDownloadUrls?: Record<string, string>;
  yankedVersions?: string[];
}) {
  const yanked = new Set(yankedVersions);
  if (versions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-400">
        Nenhuma versão registrada ainda para este pacote.
      </div>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {versions.map((v) => (
        <li
          key={v.id}
          className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`font-mono text-base font-bold px-3 py-1 rounded border ${
                  yanked.has(v.version)
                    ? "text-amber-300/70 bg-amber-950/20 border-amber-900/40 line-through"
                    : "text-white bg-slate-950 border-slate-800"
                }`}
              >
                {v.version}
              </span>
              {yanked.has(v.version) && (
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Yanked
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(v.created_at)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {sbomByVersion[v.id] && sbomDownloadUrls[v.id] && (
                <a
                  href={sbomDownloadUrls[v.id]}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Software Bill of Materials (${sbomFormatLabel(sbomByVersion[v.id])}) — CRA-ready`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500/50 transition-colors"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  SBOM · {sbomFormatLabel(sbomByVersion[v.id])}
                </a>
              )}
              {v.download_url && (
                <a
                  href={v.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-blue/30 bg-brand-blue/10 px-3 py-1.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue/15 hover:border-brand-blue/50 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Baixar
                </a>
              )}
            </div>
          </div>
          {v.release_notes && v.release_notes.trim().length > 0 && (
            <details className="mt-3 group">
              <summary className="cursor-pointer text-xs font-semibold text-slate-400 hover:text-white transition-colors select-none">
                Notas da versão
              </summary>
              <div className="mt-3 pt-3 border-t border-slate-800">
                <MarkdownView source={v.release_notes} />
              </div>
            </details>
          )}
        </li>
      ))}
    </ol>
  );
}
