import React from "react";

// Shared admin-form primitives (ADR-148). `AdForm`/`PlanForm`/`PartnerForm`
// previously declared byte-identical `labelClass`/`inputClass` locals and
// repeated the same label+control wrapper. The consts hold the exact prior
// strings (BR3) and `FormField` renders the common label+input wrapper.
// Field-specific layouts (checkbox row, two-column grid, `<select>` with option
// maps) stay inline but reuse `FORM_INPUT_CLASS`. Client-safe: no `server-only`
// import.

export const FORM_LABEL_CLASS =
  "block text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 mb-1.5";

export const FORM_INPUT_CLASS =
  "w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 hover:border-slate-700 focus:border-brand-red focus:outline-none";

export function FormField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={FORM_LABEL_CLASS}>
        {label}
      </label>
      {children}
    </div>
  );
}
