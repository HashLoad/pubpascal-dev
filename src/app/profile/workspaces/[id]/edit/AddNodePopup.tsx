"use client";

// Add Node popup (ADR-100, AC-02): target-kind toggle (Package | External link),
// matching selector, ref-type, ref-value → existing addWorkspaceNode action.
// Success closes + refreshes (ADR-070); action error shows in-popup, popup stays
// open. Submit disabled until ref-value + a target are set (BR3). Self-contained:
// holds its own form state, reusing the existing nodes/graph dictionary keys.

import { useRouter } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import type { ActivePackageOption } from "../../query";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { ExternalRepoLink, NodeRefType } from "@/lib/workspaces/types";
import { addWorkspaceNode } from "../../actions";
import { PopupShell } from "./PopupShell";

type WorkspacesDict = Dictionary["workspaces"];

const inputCls =
  "w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:border-brand-red focus:outline-none";
const btnBase =
  "px-3 py-1.5 rounded text-xs font-semibold border transition-colors";
const btnOn = "bg-brand-red text-white border-brand-red";
const btnOff =
  "bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-500";

export function AddNodePopup({
  packages,
  links,
  workspaceId,
  dict,
  onClose,
}: {
  packages: ActivePackageOption[];
  links: ExternalRepoLink[];
  workspaceId: string;
  dict: WorkspacesDict;
  onClose: () => void;
}) {
  const router = useRouter();
  const gd = dict.graph;
  const nd = dict.nodes;

  const [kind, setKind] = useState<"package" | "external">("package");
  const [pkgId, setPkgId] = useState(packages[0]?.id ?? "");
  const [linkId, setLinkId] = useState(links[0]?.id ?? "");
  const [refType, setRefType] = useState<NodeRefType>("branch");
  const [refValue, setRefValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Real git tags for the selected package, fetched when pinning a tag/version
  // (version validation). Keyed by slug so switching package derives back to
  // "loading" with no synchronous setState. [] = none / non-GitHub → free-form.
  const [versionsData, setVersionsData] = useState<{ slug: string; versions: string[] } | null>(null);

  const selectedSlug = packages.find((p) => p.id === pkgId)?.slug ?? null;
  const wantsTagList =
    kind === "package" && (refType === "tag" || refType === "version") && !!selectedSlug;

  const fetchedVersions =
    versionsData && versionsData.slug === selectedSlug ? versionsData.versions : null;
  const loadingVersions = wantsTagList && fetchedVersions === null;
  const useVersionDropdown = wantsTagList && !!fetchedVersions && fetchedVersions.length > 0;

  useEffect(() => {
    if (!wantsTagList || !selectedSlug) return;
    let active = true;
    (async () => {
      try {
        const r = await fetch(`/api/packages/${encodeURIComponent(selectedSlug)}/versions`, {
          headers: { Accept: "application/json" },
        });
        const j = r.ok ? await r.json() : { versions: [] };
        if (active) {
          setVersionsData({ slug: selectedSlug, versions: Array.isArray(j.versions) ? j.versions : [] });
        }
      } catch {
        if (active) setVersionsData({ slug: selectedSlug, versions: [] });
      }
    })();
    return () => {
      active = false;
    };
  }, [wantsTagList, selectedSlug]);

  // Ref is OPTIONAL (empty → default branch), matching the drag-drop path and the
  // relaxed addWorkspaceNode action. Only a target is required.
  const isDisabled = kind === "package" ? !pkgId : !linkId;

  const handleAdd = () => {
    const fd = new FormData();
    fd.set("workspace_id", workspaceId);
    // Send the ref pair only when a value is typed; empty → null ref (co-presence).
    const v = refValue.trim();
    if (v.length > 0) {
      fd.set("ref_type", refType);
      fd.set("ref_value", v);
    }
    if (kind === "external") {
      fd.set("target_kind", "external");
      fd.set("external_link_id", linkId);
    } else {
      fd.set("target_kind", "package");
      fd.set("package_id", pkgId);
    }
    startTransition(async () => {
      const result = await addWorkspaceNode({}, fd);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        setRefValue("");
        onClose();
        router.refresh();
      }
    });
  };

  return (
    <PopupShell
      title={gd.popupAddNodeTitle}
      closeLabel={gd.popupClose}
      onClose={onClose}
    >
      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setKind("package")}
            className={`${btnBase} ${kind === "package" ? btnOn : btnOff}`}
          >
            {nd.targetKindPackage}
          </button>
          <button
            type="button"
            onClick={() => setKind("external")}
            className={`${btnBase} ${kind === "external" ? btnOn : btnOff}`}
          >
            {nd.targetKindExternal}
          </button>
        </div>

        {kind === "package" ? (
          <select
            value={pkgId}
            onChange={(e) => setPkgId(e.target.value)}
            className={inputCls}
          >
            <option value="">{gd.selectPackagePlaceholder}</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        ) : (
          <select
            value={linkId}
            onChange={(e) => setLinkId(e.target.value)}
            className={inputCls}
          >
            <option value="">{nd.linkPlaceholder}</option>
            {links.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        )}

        <select
          value={refType}
          onChange={(e) => setRefType(e.target.value as NodeRefType)}
          className={inputCls}
        >
          <option value="branch">{gd.refTypeBranch}</option>
          <option value="tag">{gd.refTypeTag}</option>
          <option value="version">{gd.refTypeVersion}</option>
        </select>

        <div>
          {loadingVersions ? (
            <p className={`${inputCls} text-slate-500`}>{gd.versionsLoading}</p>
          ) : useVersionDropdown ? (
            <select
              value={refValue}
              onChange={(e) => setRefValue(e.target.value)}
              className={inputCls}
            >
              <option value="">{`— ${gd.defaultRefHint} —`}</option>
              {fetchedVersions!.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={refValue}
              onChange={(e) => setRefValue(e.target.value)}
              placeholder={gd.refValuePlaceholder}
              className={inputCls}
            />
          )}
          <p className="mt-1 text-[11px] text-slate-500">
            {wantsTagList && fetchedVersions && fetchedVersions.length === 0
              ? gd.versionsNone
              : gd.refOptionalHint}
          </p>
        </div>

        {error ? (
          <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleAdd}
          disabled={isDisabled}
          className="w-full rounded bg-brand-red px-2 py-2 text-sm font-semibold text-white hover:bg-brand-red/90 disabled:opacity-50 transition-colors"
        >
          {nd.addButton}
        </button>

        <p className="text-[11px] text-slate-600 leading-snug">
          {gd.connectHint}
        </p>
      </div>
    </PopupShell>
  );
}
