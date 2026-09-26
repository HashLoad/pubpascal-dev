import React from "react";
import Link from "next/link";
import { Package, Globe, FileText, ShieldCheck, Terminal, Cpu } from "lucide-react";
import { getRequestLocale } from "@/utils/locale";
import { localizedHref } from "@/utils/localized-href";
import { getDictionary } from "@/app/[lang]/dictionaries";

export default async function Footer() {
  const lang = await getRequestLocale();
  const dict = (await getDictionary(lang)).footer;
  return (
    <footer className="w-full border-t border-slate-800 bg-slate-950 text-slate-400 font-sans">
      {/* Main Footer Links & Columns */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & Vision Column */}
          <div className="space-y-4 col-span-1 md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-red">
                <Package className="h-4.5 w-4.5 text-white" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight text-white">
                Pub<span className="text-brand-red">Pascal</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-slate-400">
              {dict.description}
            </p>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-blue" />
              <span>{dict.verifiedPackages}</span>
            </div>
          </div>

          {/* Directory Navigation Column */}
          <div>
            <h3 className="font-display text-sm font-semibold tracking-wider text-slate-200 uppercase mb-4 flex items-center gap-1.5">
              <Terminal className="h-4 w-4 text-brand-red" />
              <span>{dict.platform}</span>
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href={localizedHref("/packages", lang)} className="hover:text-white transition-colors">
                  {dict.searchLibraries}
                </Link>
              </li>
              <li>
                <Link href="/publish" className="hover:text-white transition-colors">
                  {dict.publishComponent}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  {dict.highlightPlans}
                </Link>
              </li>
              <li>
                <Link href="/documentation" className="hover:text-white transition-colors">
                  {dict.apiDocs}
                </Link>
              </li>
              <li>
                <Link href={localizedHref("/download", lang)} className="hover:text-white transition-colors">
                  {lang === "pt-BR" ? "Baixar apps" : "Download apps"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Ecosystem Links Column */}
          <div>
            <h3 className="font-display text-sm font-semibold tracking-wider text-slate-200 uppercase mb-4 flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-brand-blue" />
              <span>{dict.ecosystem}</span>
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a 
                  href="https://www.embarcadero.com/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-white transition-colors"
                >
                  Embarcadero Technologies
                </a>
              </li>
              <li>
                <a 
                  href="https://www.lazarus-ide.org/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-white transition-colors"
                >
                  Lazarus IDE & FreePascal
                </a>
              </li>
              <li>
                <a 
                  href="https://github.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-white transition-colors"
                >
                  {dict.githubHosting}
                </a>
              </li>
            </ul>
          </div>

          {/* Compliance & Details Column */}
          <div>
            <h3 className="font-display text-sm font-semibold tracking-wider text-slate-200 uppercase mb-4 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-brand-blue-light" />
              <span>{dict.guidelines}</span>
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  {dict.terms}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  {dict.privacy}
                </Link>
              </li>
              <li>
                <Link href="/commercial-rules" className="hover:text-white transition-colors">
                  {dict.commercialRules}
                </Link>
              </li>
              <li>
                <div className="mt-4 p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                  <span className="font-semibold text-slate-300 block mb-1">{dict.trademarkLabel}</span>
                  {dict.trademark}
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start text-xs text-slate-500 gap-1">
            <p>&copy; {new Date().getFullYear()} PubPascal. {dict.copyright}.</p>
            <p className="mt-1">
              {dict.tagline}
            </p>
          </div>
          
          <div className="flex gap-4">
            <a 
              href="https://github.com/isaquepinheiro"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:text-white transition-colors"
              aria-label="GitHub"
            >
              <Globe className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
