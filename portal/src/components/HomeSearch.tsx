"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

type Props = {
  initialValue?: string;
  placeholder: string;
  submitLabel: string;
};

export default function HomeSearch({ initialValue = "", placeholder, submitLabel }: Props) {
  const [query, setQuery] = useState(initialValue);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.key.toLowerCase() === "k") ||
        (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA")
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/packages?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push("/packages");
    }
  };

  return (
    <form onSubmit={handleSearch} className="mt-10 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/90 border border-slate-700 shadow-2xl focus-within:ring-2 focus-within:ring-brand-red/50 focus-within:border-brand-red/50 transition-all">
        <div className="flex items-center pl-3 flex-grow gap-2.5">
          <Search className="h-5 w-5 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-white border-0 outline-none text-base placeholder-slate-500"
          />
          <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold text-slate-500 bg-slate-800 px-2 py-1 rounded">
            Ctrl
          </span>
          <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono font-semibold text-slate-500 bg-slate-800 px-2 py-1 rounded">
            K
          </span>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-red/80 active:scale-95 transition-all"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
