"use client";

// Add Link popup (ADR-102, AC-03): the external-link manager relocated from the
// former ExternalRepoLinksForm — list existing links, create (useActionState over
// createExternalRepoLink), per-link delete (<form action={deleteExternalRepoLink}>).
// Both actions revalidate server-side, so the list (links prop) refreshes after a
// create/delete; the popup stays open so the owner can add several. Validation +
// ownership stay server-side (BR1/BR4); errors render in-popup.

import { useActionState } from "react";
import {
  createExternalRepoLink,
  deleteExternalRepoLink,
  type LinkFormState,
} from "../../actions";
import type { ExternalRepoLink } from "@/lib/workspaces/types";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import { PopupShell } from "./PopupShell";

type WorkspacesDict = Dictionary["workspaces"];

const labelClass =
  "block text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 mb-1.5";
const inputClass =
  "w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 hover:border-slate-700 focus:border-brand-red focus:outline-none";

export function AddLinkPopup({
  links,
  workspaceId,
  dict,
  onClose,
}: {
  links: ExternalRepoLink[];
  workspaceId: string;
  dict: WorkspacesDict;
  onClose: () => void;
}) {
  const l = dict.links;
  const gd = dict.graph;

  const [createState, createAction, createPending] = useActionState<
    LinkFormState,
    FormData
  >(createExternalRepoLink, {});

  return (
    <PopupShell
      title={gd.popupAddLinkTitle}
      closeLabel={gd.popupClose}
      onClose={onClose}
    >
      <div className="space-y-6">
        <p className="text-sm text-slate-400">{l.subtitle}</p>

        {links.length === 0 ? (
          <p className="text-sm text-slate-500">{l.empty}</p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-slate-800">
            <table className="w-full text-sm text-left text-slate-300">
              <thead className="border-b border-slate-800 text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-3 py-2">{l.labelLabel}</th>
                  <th className="px-3 py-2">{l.writeTargetLabel}</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr
                    key={link.id}
                    className="border-b border-slate-800/60 last:border-0"
                  >
                    <td className="px-3 py-2 font-medium text-slate-200">
                      {link.label}
                    </td>
                    <td className="px-3 py-2">
                      {link.write_target === "fork" ? (
                        <span className="text-xs text-amber-400">
                          {l.writeTargetFork}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">
                          {l.writeTargetNone}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <form action={deleteExternalRepoLink}>
                        <input type="hidden" name="link_id" value={link.id} />
                        <input
                          type="hidden"
                          name="workspace_id"
                          value={workspaceId}
                        />
                        <button
                          type="submit"
                          className="text-xs text-rose-500 hover:text-rose-400 transition-colors"
                        >
                          {l.remove}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-800 pt-5">
          <h4 className="text-sm font-semibold text-slate-300 mb-4">{l.add}</h4>
          <form action={createAction} className="space-y-4">
            <input type="hidden" name="workspace_id" value={workspaceId} />

            <div>
              <label htmlFor="link-label" className={labelClass}>
                {l.labelLabel}
              </label>
              <input
                id="link-label"
                name="label"
                type="text"
                required
                maxLength={120}
                placeholder={l.labelPlaceholder}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="link-upstream_url" className={labelClass}>
                {l.upstreamLabel}
              </label>
              <input
                id="link-upstream_url"
                name="upstream_url"
                type="url"
                required
                maxLength={2000}
                placeholder={l.upstreamPlaceholder}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="link-fork_url" className={labelClass}>
                {l.forkLabel}
              </label>
              <input
                id="link-fork_url"
                name="fork_url"
                type="url"
                maxLength={2000}
                placeholder={l.forkPlaceholder}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="link-write_target" className={labelClass}>
                {l.writeTargetLabel}
              </label>
              <select
                id="link-write_target"
                name="write_target"
                defaultValue="none"
                className={inputClass}
              >
                <option value="none">{l.writeTargetNone}</option>
                <option value="fork">{l.writeTargetFork}</option>
              </select>
            </div>

            {createState.error ? (
              <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                {createState.error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={createPending}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-red/20 hover:bg-brand-red/90 disabled:opacity-60 transition-colors"
            >
              {createPending ? l.adding : l.add}
            </button>
          </form>
        </div>
      </div>
    </PopupShell>
  );
}
