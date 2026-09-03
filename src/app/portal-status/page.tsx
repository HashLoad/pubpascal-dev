// Public read-only status page (Demand 1/2 of Epic 1 v2).
//
// Four aggregate metrics from `public.get_portal_status_metrics()` (SECURITY DEFINER RPC):
//   - active_count    — packages with status='active'
//   - submissions_7d  — packages with created_at >= now() - 7d (any status)
//   - validated_7d    — packages with status='active' AND updated_at >= now() - 7d
//   - pending_count   — packages with status='pending' (Esteira backlog)
//
// No PII rendered. Aggregate integers only. Cookieless analytics tracks pageviews
// via @vercel/analytics mounted at the root layout.

import React from "react";
import type { Metadata } from "next";
import { Activity, Package, Upload, CheckCircle2, Clock } from "lucide-react";
import Header from "@/components/HeaderServer";
import Footer from "@/components/Footer";
import { getPortalStatusMetrics } from "@/utils/portal-status";

export const metadata: Metadata = {
  title: "Status do Portal",
  description:
    "Métricas ao vivo do PubPascal-Dev — pacotes ativos, submissões recentes, validações da Esteira e backlog pendente. Transparência operacional para a comunidade Object Pascal.",
  alternates: { canonical: "/portal-status" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Status do Portal — PubPascal-Dev",
    description:
      "Métricas ao vivo do PubPascal-Dev: pacotes ativos, submissões da semana, validações da Esteira e fila pendente.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Status do Portal — PubPascal-Dev",
    description:
      "Métricas ao vivo do PubPascal-Dev: pacotes ativos, submissões da semana, validações e fila pendente.",
  },
};

const numberFormatter = new Intl.NumberFormat("pt-BR");

type MetricCard = {
  key: keyof Awaited<ReturnType<typeof getPortalStatusMetrics>>;
  label: string;
  icon: typeof Package;
  accent: string;
  description: string;
};

const CARDS: MetricCard[] = [
  {
    key: "active_count",
    label: "Pacotes ativos",
    icon: Package,
    accent: "text-brand-blue",
    description:
      "Pacotes Object Pascal aprovados pela Esteira e listados no catálogo público.",
  },
  {
    key: "submissions_7d",
    label: "Submissões (últimos 7 dias)",
    icon: Upload,
    accent: "text-brand-red",
    description:
      "Todas as solicitações de publicação recebidas na última semana, em qualquer estado.",
  },
  {
    key: "validated_7d",
    label: "Validados (últimos 7 dias)",
    icon: CheckCircle2,
    accent: "text-emerald-400",
    description:
      "Pacotes aprovados pela Esteira na última semana — entraram no catálogo público.",
  },
  {
    key: "pending_count",
    label: "Em validação",
    icon: Clock,
    accent: "text-amber-400",
    description:
      "Fila atual aguardando análise da Esteira. Reflete o tempo de espera para novas publicações.",
  },
];

export default async function PortalStatusPage() {
  const metrics = await getPortalStatusMetrics();
  const lastUpdated = new Date().toLocaleString("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <div className="flex flex-col min-h-screen bg-brand-slate text-slate-100">
      <Header />

      <main className="flex-grow">
        <section className="border-b border-slate-800 bg-slate-950/40 py-16 md:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-blue/10 border border-brand-blue/30 px-3.5 py-1.5 text-xs font-semibold text-brand-blue mb-6">
                <Activity className="h-3.5 w-3.5" />
                <span>Transparência operacional</span>
              </div>
              <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-white">
                Status do Portal
              </h1>
              <p className="mt-4 text-lg text-slate-400 leading-relaxed">
                Métricas ao vivo do PubPascal-Dev. Atualizado a cada requisição —
                sem cache.
              </p>
              <p className="mt-3 text-xs font-mono text-slate-500">
                Última atualização: {lastUpdated}
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {CARDS.map((card) => {
              const Icon = card.icon;
              const value = metrics[card.key];
              return (
                <article
                  key={card.key}
                  className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6"
                >
                  <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                    <Icon className={`h-4 w-4 ${card.accent}`} />
                    <span>{card.label}</span>
                  </div>
                  <div className="font-display text-3xl md:text-4xl font-extrabold text-white">
                    {numberFormatter.format(value)}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-t border-slate-800 bg-slate-950/30 py-14">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-6">
              Como funciona
            </h2>
            <dl className="space-y-5 text-slate-300">
              {CARDS.map((card) => (
                <div key={card.key} className="flex gap-3">
                  <dt className="font-display text-sm font-bold text-white shrink-0 w-44 md:w-56">
                    {card.label}
                  </dt>
                  <dd className="text-sm text-slate-400 leading-relaxed">
                    {card.description}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-8 text-xs text-slate-500 leading-relaxed">
              Os números refletem o estado da tabela `packages` no exato momento
              em que esta página é carregada. Não usamos cache nem agregação
              assíncrona — cada acesso dispara uma consulta nova ao banco.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
