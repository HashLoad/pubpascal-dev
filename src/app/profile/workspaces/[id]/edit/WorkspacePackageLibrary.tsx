"use client";

import { useMemo, useState } from "react";
import { Search, Package } from "lucide-react";
import type { ActivePackageOption } from "../../query";

// Drag-and-drop payload key — read by the canvas's onDrop handler.
export const PKG_DRAG_MIME = "application/x-pubpascal-package";

type LibraryDict = {
  title: string;
  searchPlaceholder: string;
  empty: string;
  allAdded: string;
  dragHint: string;
  yoursLabel: string;
  othersLabel: string;
  pendingTag: string;
};

function PackageCardItem({
  pkg,
  dragHint,
  pendingTag,
}: {
  pkg: ActivePackageOption;
  dragHint: string;
  pendingTag: string;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(PKG_DRAG_MIME, pkg.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      title={dragHint}
      className="group cursor-grab rounded-md border border-slate-700 bg-slate-900 px-2.5 py-2 transition-colors hover:border-brand-blue/50 hover:bg-slate-800 active:cursor-grabbing"
    >
      <div className="flex items-center gap-1.5">
        <Package className="h-3.5 w-3.5 shrink-0 text-brand-blue/70" />
        <span className="truncate text-xs font-medium text-white">{pkg.name}</span>
        {pkg.pending && (
          <span className="ml-auto shrink-0 rounded bg-amber-500/15 px-1 text-[9px] font-semibold uppercase tracking-wide text-amber-400">
            {pendingTag}
          </span>
        )}
      </div>
      <span className="mt-0.5 block truncate text-[10px] text-slate-500">{pkg.slug}</span>
    </div>
  );
}

function LibrarySection({
  label,
  items,
  dragHint,
  pendingTag,
}: {
  label: string;
  items: ActivePackageOption[];
  dragHint: string;
  pendingTag: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="px-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">
        {label} <span className="text-slate-600">({items.length})</span>
      </p>
      <ul className="flex flex-col gap-1.5">
        {items.map((p) => (
          <li key={p.id}>
            <PackageCardItem pkg={p} dragHint={dragHint} pendingTag={pendingTag} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// Left rail of the graph builder (v7 — frente A). Lists the active packages the
// owner can drop onto the canvas as dependency nodes. Packages already in the
// workspace are hidden so a drop never hits the (workspace_id, package_id)
// unique constraint. Pure presentational + HTML5 drag source; the drop + insert
// happen in WorkspaceGraphCanvas.
export function WorkspacePackageLibrary({
  packages,
  addedPackageIds,
  dict,
}: {
  packages: ActivePackageOption[];
  addedPackageIds: Set<string>;
  dict: LibraryDict;
}) {
  const [query, setQuery] = useState("");

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return packages
      .filter((p) => !addedPackageIds.has(p.id))
      .filter(
        (p) =>
          q.length === 0 ||
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q),
      );
  }, [packages, addedPackageIds, query]);

  // Purpose-fit grouping: your own published packages first (you co-develop
  // these), then the rest of the registry.
  const yours = useMemo(() => available.filter((p) => p.owned), [available]);
  const others = useMemo(() => available.filter((p) => !p.owned), [available]);

  const allAdded = packages.length > 0 && available.length === 0 && query.trim().length === 0;

  return (
    <div className="flex h-full w-[210px] shrink-0 flex-col border-r border-slate-800 bg-slate-900/40">
      <div className="border-b border-slate-800 px-3 py-2.5">
        <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-slate-400">
          {dict.title}
        </p>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dict.searchPlaceholder}
            className="w-full rounded-md border border-slate-700 bg-slate-950 py-1.5 pl-7 pr-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-brand-blue/60 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2">
        {available.length === 0 ? (
          <p className="px-1 py-4 text-center text-[11px] text-slate-600">
            {allAdded ? dict.allAdded : dict.empty}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <LibrarySection
              label={dict.yoursLabel}
              items={yours}
              dragHint={dict.dragHint}
              pendingTag={dict.pendingTag}
            />
            <LibrarySection
              label={dict.othersLabel}
              items={others}
              dragHint={dict.dragHint}
              pendingTag={dict.pendingTag}
            />
          </div>
        )}
      </div>
    </div>
  );
}
