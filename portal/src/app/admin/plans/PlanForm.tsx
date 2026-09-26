"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  PLAN_TIERS,
  BILLING_CYCLES,
  type PlanRow,
} from "@/utils/queries/admin-plans-types";
import {
  FormField,
  FORM_LABEL_CLASS,
  FORM_INPUT_CLASS,
} from "@/components/admin/FormField";
import type { PlanFormState } from "./actions";

type Action = (
  state: PlanFormState,
  formData: FormData,
) => Promise<PlanFormState>;

type Props = {
  action: Action;
  initial?: PlanRow;
  submitLabel: string;
};

function featuresToText(features: unknown): string {
  if (features == null) return "{}";
  try {
    return JSON.stringify(features, null, 2);
  } catch {
    return "{}";
  }
}

export function PlanForm({ action, initial, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState<PlanFormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="space-y-5 max-w-2xl">
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="tier" className={FORM_LABEL_CLASS}>Tier *</label>
          <select
            id="tier"
            name="tier"
            required
            defaultValue={initial?.tier ?? "bronze"}
            className={FORM_INPUT_CLASS}
          >
            {PLAN_TIERS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="billing_cycle" className={FORM_LABEL_CLASS}>Ciclo de cobrança *</label>
          <select
            id="billing_cycle"
            name="billing_cycle"
            required
            defaultValue={initial?.billing_cycle ?? "monthly"}
            className={FORM_INPUT_CLASS}
          >
            {BILLING_CYCLES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="price_cents" className={FORM_LABEL_CLASS}>Preço (centavos) *</label>
          <input
            id="price_cents"
            name="price_cents"
            type="number"
            min={0}
            step={1}
            required
            defaultValue={initial?.price_cents ?? 0}
            className={FORM_INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="currency" className={FORM_LABEL_CLASS}>Moeda *</label>
          <input
            id="currency"
            name="currency"
            type="text"
            required
            defaultValue={initial?.currency ?? "BRL"}
            className={FORM_INPUT_CLASS}
          />
        </div>
      </div>

      <FormField id="features" label="Features (JSON)">
        <textarea
          id="features"
          name="features"
          rows={5}
          placeholder="{}"
          defaultValue={initial ? featuresToText(initial.features) : "{}"}
          className={`${FORM_INPUT_CLASS} font-mono`}
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="external_price_id" className={FORM_LABEL_CLASS}>External price ID</label>
          <input
            id="external_price_id"
            name="external_price_id"
            type="text"
            defaultValue={initial?.external_price_id ?? ""}
            className={FORM_INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="provider" className={FORM_LABEL_CLASS}>Provider</label>
          <input
            id="provider"
            name="provider"
            type="text"
            defaultValue={initial?.provider ?? ""}
            className={FORM_INPUT_CLASS}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <div>
          <label htmlFor="sort_order" className={FORM_LABEL_CLASS}>Ordem</label>
          <input
            id="sort_order"
            name="sort_order"
            type="number"
            step={1}
            defaultValue={initial?.sort_order ?? 0}
            className={FORM_INPUT_CLASS}
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-300 pb-2">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={initial?.is_active ?? true}
            className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-brand-red focus:ring-brand-red"
          />
          Ativo
        </label>
      </div>

      {state.error ? (
        <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {state.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-red/20 hover:bg-brand-red/90 disabled:opacity-60 transition-colors"
        >
          {pending ? "Salvando…" : submitLabel}
        </button>
        <Link
          href="/admin/plans"
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
