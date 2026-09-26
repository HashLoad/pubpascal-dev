import React from "react";
import Link from "next/link";
import { Flame, Download, ArrowRight, MessageSquare, Code2 } from "lucide-react";
import { localizedHref, type Locale } from "@/utils/localized-href";

// The home "fold" that showcases Aefos AI — an AI chat + terminal living inside
// the Delphi IDE (Agent Execution Flow Orchestration System). It is the flagship
// hook that draws visitors (incl. international) to the portal, so it sits right
// under the search hero. Copy is injected from home.aefosFold; the IDE-chrome
// strings (code, menu) are static since they aren't natural language.
export type AefosFoldDict = {
  badge: string;
  titlePrefix: string;
  titleHighlight: string;
  subtitle: string;
  cta: string;
  ctaAll: string;
  meta: string;
  ideTitle: string;
  menu: string;
  chatLabel: string;
  chatUser: string;
  chatAi: string;
  chatAiFile: string;
  terminalLabel: string;
  terminalCmd: string;
  terminalOut: string;
};

export default function AefosFold({
  dict,
  lang,
}: {
  dict: AefosFoldDict;
  lang: Locale;
}) {
  return (
    <section
      id="aefos"
      className="scroll-mt-20 border-b border-slate-800 bg-slate-950/30 py-16 md:py-20"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          {/* Pitch */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-red/30 bg-brand-red/10 px-3.5 py-1.5 text-xs font-semibold text-brand-red">
              <Flame className="h-3.5 w-3.5" /> {dict.badge}
            </span>
            <h2 className="font-display mt-5 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
              {dict.titlePrefix}{" "}
              <span className="text-brand-blue">{dict.titleHighlight}</span>
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400 md:text-lg">
              {dict.subtitle}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <a
                href="https://github.com/ModernDelphiWorks/Aefos"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-blue-light"
              >
                <Download className="h-4 w-4" /> {dict.cta}
              </a>
              <Link
                href={localizedHref("/download", lang)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                {dict.ctaAll} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-500">{dict.meta}</p>
          </div>

          {/* IDE mockup: menu → editor + chat → terminal */}
          <div className="overflow-hidden rounded-xl border border-slate-700 bg-[#0b1220] shadow-xl">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-[#15233f] px-3 py-2 text-xs text-slate-400">
              <Code2 className="h-4 w-4 text-brand-red" aria-hidden />
              <span>{dict.ideTitle}</span>
              <span className="text-slate-600">{dict.menu}</span>
              <span className="rounded border border-brand-blue/40 bg-brand-blue/15 px-2 py-0.5 text-[#5BB8F5]">
                Aefos AI
              </span>
            </div>

            <div className="grid grid-cols-[1.35fr_1fr]">
              <div className="border-r border-slate-800 p-3 font-mono text-[12px] leading-7 text-slate-400">
                <div>
                  <span className="text-slate-600">12</span>{" "}
                  <span className="text-purple-300">procedure</span>{" "}
                  <span className="text-sky-300">TCustomer</span>.Save;
                </div>
                <div>
                  <span className="text-slate-600">13</span>{" "}
                  <span className="text-purple-300">begin</span>
                </div>
                <div className="bg-brand-blue/10">
                  <span className="text-slate-600">14</span>{" "}
                  &nbsp;&nbsp;FConn.StartTransaction;
                </div>
                <div>
                  <span className="text-slate-600">15</span>{" "}
                  &nbsp;&nbsp;FRepo.Persist(Self);
                </div>
                <div>
                  <span className="text-slate-600">16</span>{" "}
                  &nbsp;&nbsp;FConn.Commit;
                </div>
                <div>
                  <span className="text-slate-600">17</span>{" "}
                  <span className="text-purple-300">end</span>;
                </div>
              </div>

              <div className="flex flex-col bg-[#0f1a30]">
                <div className="flex items-center gap-1.5 border-b border-slate-800 px-3 py-2 text-[11px] text-slate-400">
                  <MessageSquare className="h-3.5 w-3.5 text-brand-blue" aria-hidden />
                  {dict.chatLabel}
                </div>
                <div className="flex flex-col gap-2 p-3">
                  <div className="max-w-[88%] self-end rounded-lg rounded-br-sm bg-brand-blue px-2.5 py-1.5 text-[11.5px] text-white">
                    {dict.chatUser}
                  </div>
                  <div className="max-w-[92%] self-start rounded-lg rounded-bl-sm bg-slate-800 px-2.5 py-1.5 text-[11.5px] text-slate-300">
                    {dict.chatAi}{" "}
                    <span className="text-emerald-400">{dict.chatAiFile}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800 bg-[#0a1324] px-3 py-2 font-mono text-[11.5px] leading-7">
              <span className="text-slate-600">{dict.terminalLabel}</span>
              <br />
              <span className="text-emerald-400">›</span>{" "}
              <span className="text-slate-300">{dict.terminalCmd}</span>
              <br />
              <span className="text-emerald-400">✓ {dict.terminalOut}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
