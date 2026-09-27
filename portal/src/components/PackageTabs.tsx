import React from "react";
import Link from "next/link";
import { TABS, buildTabHref, type TabKey } from "@/app/[lang]/packages/[slug]/searchParams";

type Props = {
  slug: string;
  activeTab: TabKey;
};

export default function PackageTabs({ slug, activeTab }: Props) {
  return (
    <nav className="border-b border-slate-800" aria-label="Detalhes do pacote">
      <ul className="flex flex-wrap items-center gap-1 -mb-px overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          return (
            <li key={tab.key}>
              <Link
                href={buildTabHref(slug, tab.key)}
                className={`inline-flex items-center px-4 py-3 text-sm transition-colors border-b-2 ${
                  isActive
                    ? "border-brand-red text-white font-bold"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
