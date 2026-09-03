import type { Metadata } from "next";
import { BookOpen, Terminal, Puzzle, Zap, GitBranch, ArrowRight } from "lucide-react";
import Link from "next/link";
import Header from "@/components/HeaderServer";
import Footer from "@/components/Footer";
import { getRequestLocale } from "@/utils/locale";

export const metadata: Metadata = {
  title: "Documentação — PubPascal-Dev",
  description:
    "Guias, referência da API pública e tutoriais para publicar, descobrir e integrar pacotes Object Pascal no PubPascal-Dev.",
  alternates: { canonical: "/documentation" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Documentação — PubPascal-Dev",
    description:
      "Guias e referência da API pública para publicar e integrar pacotes Delphi/Lazarus no PubPascal-Dev.",
    type: "website",
  },
};

const SECTIONS = [
  {
    icon: BookOpen,
    title: "Guia de Início Rápido",
    description:
      "Como criar uma conta, publicar seu primeiro pacote e entender o fluxo de validação da Esteira.",
    status: "em breve",
    accent: "text-brand-blue",
    border: "border-brand-blue/30",
    bg: "bg-brand-blue/5",
  },
  {
    icon: Terminal,
    title: "CLI pubpascal",
    description:
      "Referência completa dos comandos: publish, clone, update, status, login e configuração do workspace.",
    status: "em breve",
    accent: "text-emerald-400",
    border: "border-emerald-400/30",
    bg: "bg-emerald-400/5",
  },
  {
    icon: Puzzle,
    title: "API Pública REST",
    description:
      "Endpoints para listar, buscar e inspecionar pacotes programaticamente. Ideal para integrar com seu toolchain.",
    status: "em breve",
    accent: "text-violet-400",
    border: "border-violet-400/30",
    bg: "bg-violet-400/5",
  },
  {
    icon: Zap,
    title: "Planos de Destaque",
    description:
      "Como funciona o sistema de sponsorship: tiers Bronze, Prata e Gold, renovação automática e expiração.",
    status: "em breve",
    accent: "text-amber-400",
    border: "border-amber-400/30",
    bg: "bg-amber-400/5",
  },
  {
    icon: GitBranch,
    title: "Workspaces & Dependências",
    description:
      "Gerencie múltiplos repositórios como um conjunto de trabalho unificado com o grafo de dependências.",
    status: "em breve",
    accent: "text-rose-400",
    border: "border-rose-400/30",
    bg: "bg-rose-400/5",
  },
];

export default async function DocumentationPage() {
  const lang = await getRequestLocale();
  return (
    <div className="flex flex-col min-h-screen bg-brand-slate text-slate-100">
      <Header />

      <main className="flex-grow">
        {/* Hero */}
        <section className="border-b border-slate-800 bg-slate-950/40 py-16 md:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-red/10 border border-brand-red/30 px-3.5 py-1.5 text-xs font-semibold text-brand-red mb-6">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Em construção</span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-white">
              Documentação
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-400 leading-relaxed">
              Guias, tutoriais e referência da API pública do PubPascal-Dev.
              Estamos preparando o conteúdo — em breve tudo disponível aqui.
            </p>
          </div>
        </section>

        {/* Sections grid */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="font-display text-xl font-bold text-white mb-8">
            O que vai estar aqui
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.title}
                  className={`rounded-2xl border ${s.border} ${s.bg} p-6 flex flex-col gap-3`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`h-5 w-5 ${s.accent}`} />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 border border-slate-700 rounded-full px-2 py-0.5">
                      {s.status}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-white">
                    {s.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {s.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA interim */}
        <section className="border-t border-slate-800 bg-slate-950/30 py-14">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="font-display text-2xl font-extrabold text-white mb-3">
              Enquanto isso, explore o portal
            </h2>
            <p className="text-slate-400 mb-8 text-sm leading-relaxed">
              Navegue pelo catálogo de pacotes ou publique o seu projeto
              open-source agora mesmo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={`/${lang}/packages`}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-6 py-3 text-sm font-bold text-white hover:bg-brand-red-dark transition-all"
              >
                Ver catálogo
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/publish"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-bold text-slate-300 hover:border-slate-500 hover:text-white transition-all"
              >
                Publicar pacote
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
