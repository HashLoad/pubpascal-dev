"use client";

import { useActionState, useState } from "react";
import { KeyRound } from "lucide-react";
import type { CliTokenListRow } from "./query";
import {
  createCliToken,
  revokeCliToken,
  type TokenFormState,
  type RevokeFormState,
} from "./actions";
import type { Dictionary } from "@/app/[lang]/dictionaries";

type TokensDict = Dictionary["tokens"];

const labelClass =
  "block text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500 mb-1.5";
const inputClass =
  "w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 hover:border-slate-700 focus:border-brand-red focus:outline-none";

function tokenStatus(row: CliTokenListRow): "active" | "revoked" | "expired" {
  if (row.revoked_at !== null) return "revoked";
  if (row.expires_at !== null && new Date(row.expires_at) <= new Date()) return "expired";
  return "active";
}

export function TokensClient({
  tokens,
  dict,
}: {
  tokens: CliTokenListRow[];
  dict: TokensDict;
}) {
  const [createState, createAction, isCreating] = useActionState<TokenFormState, FormData>(
    createCliToken,
    {},
  );
  const [revokeState, revokeAction, isRevoking] = useActionState<RevokeFormState, FormData>(
    revokeCliToken,
    {},
  );
  const [copied, setCopied] = useState(false);

  async function copyToken() {
    if (!createState.plaintext) return;
    try {
      await navigator.clipboard.writeText(createState.plaintext);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard access denied — user can select manually
    }
  }

  const dateFmt = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  function fmtDate(s: string | null) {
    if (!s) return dict.table.never;
    return dateFmt.format(new Date(s));
  }

  return (
    <div className="space-y-10">
      {/* Copy-once banner — only visible immediately after token creation (AC-01/02) */}
      {createState.plaintext && (
        <div className="rounded-xl border border-amber-600/40 bg-amber-950/30 p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-400">{dict.copyBanner.heading}</p>
          <p className="text-xs text-amber-300/80">{dict.copyBanner.warning}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-slate-950 border border-slate-800 rounded px-3 py-2 font-mono text-slate-200 break-all select-all">
              {createState.plaintext}
            </code>
            <button
              type="button"
              onClick={copyToken}
              className="shrink-0 rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-500 transition-colors cursor-pointer"
            >
              {copied ? dict.copyBanner.copied : dict.copyBanner.copy}
            </button>
          </div>
        </div>
      )}

      {/* Token list */}
      <section>
        {tokens.length === 0 && !createState.plaintext ? (
          <div className="mx-auto max-w-lg text-center py-12">
            <div className="mx-auto h-14 w-14 flex items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 text-brand-red mb-5">
              <KeyRound className="h-7 w-7" />
            </div>
            <h2 className="font-display text-xl font-bold text-white mb-2">
              {dict.list.emptyTitle}
            </h2>
            <p className="text-slate-400 leading-relaxed">{dict.list.emptyBody}</p>
          </div>
        ) : tokens.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-mono uppercase tracking-wider text-slate-500">
                  <th className="pb-2 pr-4 font-medium">{dict.table.labelCol}</th>
                  <th className="pb-2 pr-4 font-medium">{dict.table.prefixCol}</th>
                  <th className="pb-2 pr-4 font-medium">{dict.table.createdCol}</th>
                  <th className="pb-2 pr-4 font-medium">{dict.table.lastUsedCol}</th>
                  <th className="pb-2 pr-4 font-medium">{dict.table.expiresCol}</th>
                  <th className="pb-2 pr-4 font-medium">{dict.table.statusCol}</th>
                  <th className="pb-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {tokens.map((row) => {
                  const status = tokenStatus(row);
                  return (
                    <tr key={row.id} className="border-b border-slate-800/60">
                      <td className="py-3 pr-4 text-white font-medium max-w-[120px] truncate">
                        {row.label ?? <span className="text-slate-500">—</span>}
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-slate-400">
                        {row.token_prefix}…
                      </td>
                      <td className="py-3 pr-4 text-slate-400 whitespace-nowrap">
                        {fmtDate(row.created_at)}
                      </td>
                      <td className="py-3 pr-4 text-slate-400 whitespace-nowrap">
                        {fmtDate(row.last_used_at)}
                      </td>
                      <td className="py-3 pr-4 text-slate-400 whitespace-nowrap">
                        {fmtDate(row.expires_at)}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                            status === "active"
                              ? "bg-emerald-900/40 text-emerald-400"
                              : status === "revoked"
                                ? "bg-slate-800 text-slate-500"
                                : "bg-amber-900/40 text-amber-400"
                          }`}
                        >
                          {dict.status[status]}
                        </span>
                      </td>
                      <td className="py-3">
                        {status === "active" && (
                          <form action={revokeAction}>
                            <input type="hidden" name="id" value={row.id} />
                            <button
                              type="submit"
                              disabled={isRevoking}
                              className="text-xs font-semibold text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              {isRevoking ? dict.table.revoking : dict.table.revokeButton}
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
        {revokeState.error && (
          <p className="mt-3 text-sm text-red-400">{revokeState.error}</p>
        )}
      </section>

      {/* Generate form */}
      <section className="space-y-4">
        <h2 className="font-display text-lg font-bold text-white">{dict.form.heading}</h2>
        <form action={createAction} className="space-y-4 max-w-xl">
          <div>
            <label className={labelClass}>{dict.form.labelLabel}</label>
            <input
              type="text"
              name="label"
              maxLength={120}
              placeholder={dict.form.labelPlaceholder}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{dict.form.expiresAtLabel}</label>
            <input
              type="date"
              name="expires_at"
              className={inputClass}
            />
          </div>
          {createState.error && (
            <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {createState.error}
            </p>
          )}
          <button
            type="submit"
            disabled={isCreating}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand-red/20 hover:bg-brand-red/90 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {isCreating ? dict.form.generating : dict.form.generate}
          </button>
        </form>
      </section>
    </div>
  );
}
