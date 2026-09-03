"use client";

import { useState } from "react";
import { Terminal, Copy, Check, Download } from "lucide-react";

type Dict = {
  cloneHeading: string;
  cloneByVersionHint: string;
  cloneNoVersion: string;
  cloneCopy: string;
  cloneCopied: string;
  cloneDownloadCli: string;
};

// Shows how to clone this workspace with the CLI. When the root (PAI) package is
// pinned to a version, the workspace's identifier IS `<root-slug>@<version>`
// (e.g. janus@1.0) — so project A clones janus@1.0 and project B clones
// janus@2.0. Without a pinned root version, falls back to the UUID.
export function WorkspaceCloneCommand({
  rootSlug,
  rootVersion,
  workspaceId,
  dict,
}: {
  rootSlug: string | null;
  rootVersion: string | null;
  workspaceId: string;
  dict: Dict;
}) {
  const [copied, setCopied] = useState(false);
  const byVersion = !!rootSlug && !!rootVersion;
  const identifier = byVersion ? `${rootSlug}@${rootVersion}` : workspaceId;
  const command = `boss workspace clone ${identifier}`;

  const onCopy = () => {
    void navigator.clipboard?.writeText(command).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Terminal className="h-4 w-4 text-brand-blue" />
        <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-slate-400">
          {dict.cloneHeading}
        </p>
      </div>

      <p className="mb-2 text-xs text-slate-500">
        {byVersion ? dict.cloneByVersionHint : dict.cloneNoVersion}
      </p>

      <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950 px-3 py-2">
        <code className="flex-1 truncate font-mono text-sm text-emerald-300">
          {command}
        </code>
        <button
          type="button"
          onClick={onCopy}
          title={dict.cloneCopy}
          className="inline-flex shrink-0 items-center gap-1 rounded border border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:border-slate-400 transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" /> {dict.cloneCopied}
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> {dict.cloneCopy}
            </>
          )}
        </button>
      </div>

      <a
        href="/downloads/boss.exe"
        className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-500 transition-colors hover:text-brand-blue"
      >
        <Download className="h-3 w-3" /> {dict.cloneDownloadCli}
      </a>
    </div>
  );
}
