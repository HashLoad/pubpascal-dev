"use client";

import Link from "next/link";
import { useActionState } from "react";
import { PARTNER_STATUSES, PARTNER_TIERS, type PartnerRow } from "@/utils/queries/admin-partners-types";
import {
  FormField,
  FORM_LABEL_CLASS,
  FORM_INPUT_CLASS,
} from "@/components/admin/FormField";
import type { PartnerFormState } from "./actions";

type Action = (
  state: PartnerFormState,
  formData: FormData,
) => Promise<PartnerFormState>;

type Props = {
  action: Action;
  initial?: PartnerRow;
  submitLabel: string;
};

export function PartnerForm({ action, initial, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState<PartnerFormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="space-y-5 max-w-2xl">
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}

      <FormField id="name" label="Nome *">
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initial?.name ?? ""}
          className={FORM_INPUT_CLASS}
        />
      </FormField>

      <FormField id="logo_url" label="URL do logo *">
        <input
          id="logo_url"
          name="logo_url"
          type="url"
          required
          defaultValue={initial?.logo_url ?? ""}
          className={FORM_INPUT_CLASS}
        />
      </FormField>

      <FormField id="website_url" label="URL do site *">
        <input
          id="website_url"
          name="website_url"
          type="url"
          required
          defaultValue={initial?.website_url ?? ""}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="status" className={FORM_LABEL_CLASS}>Status *</label>
          <select
            id="status"
            name="status"
            required
            defaultValue={initial?.status ?? "active"}
            className={FORM_INPUT_CLASS}
          >
            {PARTNER_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tier" className={FORM_LABEL_CLASS}>Tier</label>
          <select
            id="tier"
            name="tier"
            defaultValue={initial?.tier ?? ""}
            className={FORM_INPUT_CLASS}
          >
            <option value="">— none —</option>
            {PARTNER_TIERS.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          href="/admin/partners"
          className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
