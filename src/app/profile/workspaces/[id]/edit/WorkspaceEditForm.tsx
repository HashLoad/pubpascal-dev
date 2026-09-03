"use client";

import Link from "next/link";
import { useActionState } from "react";
import { updateWorkspace, deleteWorkspace, type WorkspaceFormState } from "../../actions";
import { ConfirmDeleteForm } from "@/app/admin/ConfirmDeleteForm";
import type { Workspace } from "@/lib/workspaces/types";
import type { ActivePackageOption } from "../../query";
import type { Dictionary } from "@/app/[lang]/dictionaries";

type WorkspacesDict = Dictionary["workspaces"];

const labelClass =
  "block text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 mb-1.5";
const inputClass =
  "w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 hover:border-slate-700 focus:border-brand-red focus:outline-none";

export function WorkspaceEditForm({
  workspace,
  dict,
  packages,
  currentRootPackageId,
}: {
  workspace: Workspace;
  dict: WorkspacesDict;
  packages: ActivePackageOption[];
  currentRootPackageId: string;
}) {
  const [state, formAction, pending] = useActionState<WorkspaceFormState, FormData>(
    updateWorkspace,
    {},
  );
  const f = dict.form;

  return (
    <div className="space-y-8 max-w-xl">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="id" value={workspace.id} />

        <div>
          <label htmlFor="name" className={labelClass}>{f.nameLabel} *</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={120}
            defaultValue={workspace.name}
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
            defaultValue={workspace.description ?? ""}
            placeholder={f.descriptionPlaceholder}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="root_package_id" className={labelClass}>{f.rootLabel}</label>
          <select
            id="root_package_id"
            name="root_package_id"
            defaultValue={currentRootPackageId}
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
            defaultValue={workspace.visibility}
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

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-red/20 hover:bg-brand-red/90 disabled:opacity-60 transition-colors"
          >
            {pending ? f.saving : f.save}
          </button>
          <Link
            href="/profile/workspaces"
            className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            {f.cancel}
          </Link>
        </div>
      </form>

      <div className="border-t border-slate-800 pt-6">
        <ConfirmDeleteForm
          action={deleteWorkspace}
          id={workspace.id}
          message={f.deleteConfirm}
        >
          {f.delete}
        </ConfirmDeleteForm>
      </div>
    </div>
  );
}
