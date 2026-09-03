"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AD_STATUSES, type AdRow } from "@/utils/queries/admin-ads-types";
import {
  FormField,
  FORM_LABEL_CLASS,
  FORM_INPUT_CLASS,
} from "@/components/admin/FormField";
import type { AdFormState } from "./actions";

type Action = (state: AdFormState, formData: FormData) => Promise<AdFormState>;

type Props = {
  action: Action;
  initial?: AdRow;
  submitLabel: string;
};

function toDateInput(value: string | undefined): string {
  if (!value) return "";
  return value.length >= 10 ? value.slice(0, 10) : value;
}

export function AdForm({ action, initial, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState<AdFormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="space-y-5 max-w-2xl">
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}

      <FormField id="title" label="Título *">
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initial?.title ?? ""}
          className={FORM_INPUT_CLASS}
        />
      </FormField>

      <FormField id="description" label="Descrição">
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
          className={FORM_INPUT_CLASS}
        />
      </FormField>

      <FormField id="banner_url" label="URL do banner *">
        <input
          id="banner_url"
          name="banner_url"
          type="url"
          required
          defaultValue={initial?.banner_url ?? ""}
          className={FORM_INPUT_CLASS}
        />
      </FormField>

      <FormField id="target_url" label="URL de destino *">
        <input
          id="target_url"
          name="target_url"
          type="url"
          required
          defaultValue={initial?.target_url ?? ""}
          className={FORM_INPUT_CLASS}
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="start_date" className={FORM_LABEL_CLASS}>Data de início *</label>
          <input
            id="start_date"
            name="start_date"
            type="date"
            required
            defaultValue={toDateInput(initial?.start_date)}
            className={FORM_INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="end_date" className={FORM_LABEL_CLASS}>Data de fim *</label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            required
            defaultValue={toDateInput(initial?.end_date)}
            className={FORM_INPUT_CLASS}
          />
        </div>
      </div>

      <div>
        <label htmlFor="status" className={FORM_LABEL_CLASS}>Status *</label>
        <select
          id="status"
          name="status"
          required
          defaultValue={initial?.status ?? "pending"}
          className={FORM_INPUT_CLASS}
        >
          {AD_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
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
          href="/admin/ads"
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
