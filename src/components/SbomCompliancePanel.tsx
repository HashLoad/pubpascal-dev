import { ShieldCheck, Download } from "lucide-react";
import type { PackageSbomMeta } from "@/utils/queries/package-sbom";

export type SbomComplianceDict = {
  heading: string;
  craBadge: string;
  explainer: string;
  format: string;
  attestedBy: string;
  published: string;
  download: string;
  downloadsLabel: string;
};

// Turns the bare "CRA-ready" badge into the told story: surfaces the SBOM the
// PubPascal CLI published (format + spec version, the attesting author/tool, the
// date) and a one-line explainer of why it matters for the EU Cyber Resilience
// Act. Rendered only when the package actually ships an SBOM (sbom !== null).
export default function SbomCompliancePanel({
  sbom,
  dict,
  locale,
  downloadHref,
  downloads,
}: {
  sbom: PackageSbomMeta;
  dict: SbomComplianceDict;
  locale: string;
  downloadHref?: string;
  downloads?: number;
}) {
  // Proper nouns — not localizable.
  const formatName = sbom.format === "cyclonedx" ? "CycloneDX" : "SPDX";
  const formatLine = sbom.spec_version
    ? `${formatName} ${sbom.spec_version}`
    : formatName;

  const publishedLabel =
    sbom.created_at &&
    new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(sbom.created_at));

  return (
    <section className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-4">
      <div className="mb-2 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
        <h3 className="text-sm font-bold text-white">{dict.heading}</h3>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
          {dict.craBadge}
        </span>
      </div>

      <p className="mb-3 text-xs leading-relaxed text-slate-400">
        {dict.explainer}
      </p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
        <dt className="text-slate-500">{dict.format}</dt>
        <dd className="font-mono text-slate-300">{formatLine}</dd>

        {sbom.author && (
          <>
            <dt className="text-slate-500">{dict.attestedBy}</dt>
            <dd className="text-slate-300">{sbom.author}</dd>
          </>
        )}

        {publishedLabel && (
          <>
            <dt className="text-slate-500">{dict.published}</dt>
            <dd className="text-slate-300">{publishedLabel}</dd>
          </>
        )}

        {typeof downloads === "number" && downloads > 0 && (
          <>
            <dt className="text-slate-500">{dict.downloadsLabel}</dt>
            <dd className="text-slate-300">{downloads.toLocaleString(locale)}</dd>
          </>
        )}
      </dl>

      {downloadHref && (
        <a
          href={downloadHref}
          download
          className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-emerald-800/50 bg-emerald-900/30 px-3 py-2 text-xs font-semibold text-emerald-300 transition-colors hover:border-emerald-500 hover:text-emerald-200"
        >
          <Download className="h-3.5 w-3.5" />
          {dict.download}
        </a>
      )}
    </section>
  );
}
