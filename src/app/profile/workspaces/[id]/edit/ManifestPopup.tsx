"use client";

import { useEffect, useState } from "react";
import { PopupShell } from "./PopupShell";

type ManifestDict = {
  popupManifestTitle: string;
  popupClose: string;
  manifestHint: string;
  manifestLoading: string;
  manifestError: string;
  manifestCopy: string;
  manifestCopied: string;
};

// Frente E — read-only view of the workspace manifest the PubPascal CLI consumes.
// Fetches the live payload from the same endpoint the CLI hits
// (GET /api/workspaces/[id]/manifest, session-cookie auth) so what the owner
// sees is exactly what `pp workspace clone` receives. Rendered as
// formatted JSON — the endpoint's actual content type.
export function ManifestPopup({
  workspaceId,
  dict,
  onClose,
}: {
  workspaceId: string;
  dict: ManifestDict;
  onClose: () => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/manifest`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!res.ok) throw new Error(String(res.status));
        const json = await res.json();
        if (active) setText(JSON.stringify(json, null, 2));
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [workspaceId]);

  const onCopy = () => {
    if (!text) return;
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <PopupShell title={dict.popupManifestTitle} closeLabel={dict.popupClose} onClose={onClose}>
      <p className="mb-3 text-xs text-slate-400">{dict.manifestHint}</p>

      {failed ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {dict.manifestError}
        </p>
      ) : text === null ? (
        <p className="text-xs text-slate-500">{dict.manifestLoading}</p>
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={onCopy}
            className="absolute right-2 top-2 rounded border border-slate-600 bg-slate-900/90 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:border-slate-400"
          >
            {copied ? dict.manifestCopied : dict.manifestCopy}
          </button>
          <pre className="max-h-[55vh] overflow-auto rounded-md border border-slate-800 bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-300">
            {text}
          </pre>
        </div>
      )}
    </PopupShell>
  );
}
