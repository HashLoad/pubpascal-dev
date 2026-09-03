import { ShieldCheck, Check, X } from "lucide-react";
import type { CraReadiness } from "@/lib/cra/readiness";

export type CraReadinessDict = {
  heading: string;
  metOf: string; // "{met} of {total} signals"
  complete: string; // shown at 100%
  explainer: string;
  sbom: string;
  securityPolicy: string;
  maintained: string;
};

// The trust SEAL: a 0–100% score toward full CRA compliance + the checklist of
// what's still needed to reach 100%. Color grades by level so it reads at a
// glance (full = emerald, partial = brand blue, none = slate). The OSV
// vulnerability-scan signal joins as a 4th once its results are stored.
export default function CraReadinessPanel({
  readiness,
  dict,
}: {
  readiness: CraReadiness;
  dict: CraReadinessDict;
}) {
  const rows = [
    { ok: readiness.signals.sbom, label: dict.sbom },
    { ok: readiness.signals.securityPolicy, label: dict.securityPolicy },
    { ok: readiness.signals.maintained, label: dict.maintained },
  ];

  const tone = readiness.complete
    ? { border: "border-emerald-800/50", bg: "bg-emerald-950/20", accent: "text-emerald-400", bar: "bg-emerald-500" }
    : readiness.pct > 0
      ? { border: "border-slate-800", bg: "bg-slate-950/40", accent: "text-brand-blue", bar: "bg-brand-blue" }
      : { border: "border-slate-800", bg: "bg-slate-950/40", accent: "text-slate-400", bar: "bg-slate-600" };

  const summary = readiness.complete
    ? dict.complete
    : dict.metOf
        .replace("{met}", String(readiness.met))
        .replace("{total}", String(readiness.total));

  return (
    <section className={`rounded-lg border ${tone.border} ${tone.bg} p-4`}>
      <div className="flex items-center gap-2">
        <ShieldCheck className={`h-4 w-4 shrink-0 ${tone.accent}`} />
        <h3 className="text-sm font-bold text-white">{dict.heading}</h3>
        <span className={`ml-auto font-mono text-lg font-bold ${tone.accent}`}>
          {readiness.pct}%
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full ${tone.bar} transition-all`}
          style={{ width: `${readiness.pct}%` }}
        />
      </div>
      <p className={`mt-1 text-[11px] font-semibold ${tone.accent}`}>{summary}</p>

      <p className="mt-2 mb-3 text-xs leading-relaxed text-slate-500">
        {dict.explainer}
      </p>

      <ul className="space-y-1.5 text-xs">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-2">
            {row.ok ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
            ) : (
              <X className="h-3.5 w-3.5 shrink-0 text-slate-600" />
            )}
            <span className={row.ok ? "text-slate-300" : "text-slate-500"}>
              {row.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
