import Link from "next/link";
import { Layers, Anchor, Lock } from "lucide-react";
import type { PackageWorkspace } from "@/app/[lang]/packages/[slug]/workspaces";

export type WorkspaceLabels = {
  heading: string;
  anchors: string; // "Anchors a working set"
  private: string; // badge for the viewer's own (non-public) workspace
};

export default function WorkspacePanel({
  workspaces,
  lang,
  dict,
}: {
  workspaces: PackageWorkspace[];
  lang: string;
  dict: WorkspaceLabels;
}) {
  if (workspaces.length === 0) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="h-4 w-4 text-brand-blue" />
        <h3 className="font-display text-sm font-bold text-white">{dict.heading}</h3>
        <span className="ml-auto text-xs text-slate-500">{workspaces.length}</span>
      </div>

      <ul className="flex flex-col gap-4">
        {workspaces.map((ws) => (
          <li key={ws.id}>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href={`/${lang}/workspaces/${ws.id}`}
                className="min-w-0 truncate text-sm font-semibold text-slate-200 hover:text-white"
              >
                {ws.name}
              </Link>
              {ws.isOwn && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400">
                  <Lock className="h-3 w-3" />
                  {dict.private}
                </span>
              )}
            </div>
            <p className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-2">
              <Anchor className="h-3 w-3 text-brand-blue" />
              {dict.anchors}
            </p>
            <ul className="flex flex-col gap-1.5">
              {ws.members.map((m) => (
                <li key={`${ws.id}:${m.slug}`}>
                  <Link
                    href={`/${lang}/packages/${m.slug}`}
                    className={`group flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                      m.isRoot
                        ? "border-brand-blue/40 bg-slate-950/40 hover:border-brand-blue/60"
                        : "border-slate-800 bg-slate-950/40 hover:border-brand-blue/50"
                    }`}
                  >
                    {m.isRoot && (
                      <Anchor className="h-3.5 w-3.5 shrink-0 text-brand-blue" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200 group-hover:text-white">
                      {m.name || m.slug}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
