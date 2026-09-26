"use client";

import React, { useRef, useState } from "react";
import { marked } from "marked";
import { Bold, Italic, Code, Link2, List, Eye, Pencil } from "lucide-react";

export type MarkdownEditorLabels = {
  bold: string;
  italic: string;
  code: string;
  link: string;
  list: string;
  write: string;
  preview: string;
  nothingToPreview: string;
  footerSupports: string;
  footerHint: string;
};

// Safe default so any caller that omits `labels` still renders without a pt-BR
// leak. Both in-app callers (publish + dashboard forms) pass a localized slice.
const DEFAULT_LABELS: MarkdownEditorLabels = {
  bold: "Bold",
  italic: "Italic",
  code: "Code",
  link: "Link",
  list: "List",
  write: "Write",
  preview: "Preview",
  nothingToPreview: "Nothing to preview.",
  footerSupports: "Supports",
  footerHint: "— bold, italic, code, links and lists.",
};

type Props = {
  name: string;
  defaultValue?: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  rows?: number;
  placeholder?: string;
  hasError?: boolean;
  labels?: MarkdownEditorLabels;
};

type Wrap = { before: string; after: string; line?: boolean };

const ACTIONS: { key: keyof MarkdownEditorLabels; icon: React.ReactNode; wrap: Wrap }[] = [
  { key: "bold", icon: <Bold className="h-4 w-4" />, wrap: { before: "**", after: "**" } },
  { key: "italic", icon: <Italic className="h-4 w-4" />, wrap: { before: "_", after: "_" } },
  { key: "code", icon: <Code className="h-4 w-4" />, wrap: { before: "`", after: "`" } },
  { key: "link", icon: <Link2 className="h-4 w-4" />, wrap: { before: "[", after: "](https://)" } },
  { key: "list", icon: <List className="h-4 w-4" />, wrap: { before: "- ", after: "", line: true } },
];

export default function MarkdownEditor({
  name,
  defaultValue = "",
  required,
  minLength,
  maxLength,
  rows = 8,
  placeholder,
  hasError,
  labels = DEFAULT_LABELS,
}: Props) {
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const ref = useRef<HTMLTextAreaElement>(null);

  function applyWrap(wrap: Wrap) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const before = value.slice(0, start);
    const after = value.slice(end);

    let insert: string;
    if (wrap.line) {
      insert = selected
        ? selected
            .split("\n")
            .map((l) => `${wrap.before}${l}`)
            .join("\n")
        : `${wrap.before}`;
    } else {
      insert = `${wrap.before}${selected || ""}${wrap.after}`;
    }

    const next = before + insert + after;
    setValue(next);
    // restore focus + caret after the inserted markup
    requestAnimationFrame(() => {
      el.focus();
      const caret = before.length + insert.length;
      el.setSelectionRange(caret, caret);
    });
  }

  const previewHtml =
    tab === "preview"
      ? (marked.parse(value || `_${labels.nothingToPreview}_`, { async: false }) as string)
      : "";

  return (
    <div
      className={`rounded-lg border bg-slate-900 ${
        hasError ? "border-red-500/60" : "border-slate-800 focus-within:border-brand-red/40"
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          {ACTIONS.map((a) => (
            <button
              key={a.key}
              type="button"
              title={labels[a.key]}
              onClick={() => applyWrap(a.wrap)}
              disabled={tab === "preview"}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            >
              {a.icon}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={() => setTab("write")}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors ${
              tab === "write" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <Pencil className="h-3.5 w-3.5" /> {labels.write}
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 font-medium transition-colors ${
              tab === "preview" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <Eye className="h-3.5 w-3.5" /> {labels.preview}
          </button>
        </div>
      </div>

      {tab === "write" ? (
        <textarea
          ref={ref}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          rows={rows}
          placeholder={placeholder}
          className="w-full resize-y bg-transparent px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
        />
      ) : (
        <div
          className="prose prose-invert prose-sm max-w-none px-3.5 py-3 prose-headings:font-sans prose-a:text-brand-blue"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      )}

      <div className="border-t border-slate-800 px-3 py-1.5 text-[10px] text-slate-500">
        {labels.footerSupports} <span className="font-mono">Markdown</span> {labels.footerHint}
      </div>
    </div>
  );
}
