"use client";

import { useActionState } from "react";
import { createWorkspace, type WorkspaceFormState } from "./actions";
import type { ActivePackageOption } from "./query";
import type { Dictionary } from "@/app/[lang]/dictionaries";

type WorkspacesDict = Dictionary["workspaces"];

const labelClass =
  "block text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 mb-1.5";
const inputClass =
  "w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 hover:border-slate-700 focus:border-brand-red focus:outline-none";

export function WorkspaceCreateForm({
  dict,
  packages,
}: {
  dict: WorkspacesDict;
  packages: ActivePackageOption[];
}) {
  const [state, formAction, pending] = useActionState<WorkspaceFormState, FormData>(
    createWorkspace,
    {},
  );
  const f = dict.form;

  return (
    <form action={formAction} className="space-y-4 max-w-xl">
      <div>
        <label htmlFor="name" className={labelClass}>{f.nameLabel} *</label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={120}
          placeholder={f.namePlaceholder}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="description" className={labelClass}>{f.descriptionLabel}</label>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={2000}
          placeholder={f.descriptionPlaceholder}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="root_package_id" className={labelClass}>{f.rootLabel}</label>
        <select
          id="root_package_id"
          name="root_package_id"
          defaultValue=""
          className={inputClass}
        >
          <option value="">{f.rootNone}</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-slate-500">{f.rootHint}</p>
      </div>

      <div>
        <label htmlFor="visibility" className={labelClass}>{f.visibilityLabel}</label>
        <select
          id="visibility"
          name="visibility"
          defaultValue="private"
          className={inputClass}
        >
          <option value="private">{dict.visibility.private}</option>
          <option value="public">{dict.visibility.public}</option>
        </select>
      </div>

      {state.error ? (
        <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-red/20 hover:bg-brand-red/90 disabled:opacity-60 transition-colors"
      >
        {pending ? f.creating : f.create}
      </button>
    </form>
  );
}
