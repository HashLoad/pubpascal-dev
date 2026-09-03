"use client";

// Hand-rolled modal shell (ADR-101): dimmed backdrop + centered panel, brand
// tokens only, no modal library. Closes via ✕, backdrop click, and Escape.
// Width constrained (w-[90vw] max-w-md) so 375px never overflows (BR7/AC-11).

import { useEffect, type ReactNode } from "react";

export function PopupShell({
  title,
  closeLabel,
  onClose,
  children,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}) {
  // Escape closes the popup; listener mounts/unmounts with the open popup.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-[90vw] max-w-md max-h-[85vh] overflow-y-auto rounded-lg border border-slate-700 bg-brand-slate p-5 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="font-display text-lg font-bold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="shrink-0 text-xl leading-none text-slate-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
