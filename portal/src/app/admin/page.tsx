import Link from "next/link";
import {
  Package as PackageIcon,
  Inbox,
  Megaphone,
  Handshake,
  ArrowRight,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

interface Metric {
  label: string;
  value: number;
  hint: string;
  icon: typeof PackageIcon;
  accent: "red" | "amber" | "blue" | "emerald";
  href?: string;
}

async function loadMetrics(): Promise<{ metrics: Metric[]; degraded: boolean }> {
  let degraded = false;

  const safeCount = async (
    table: string,
    filter?: { column: string; value: string },
  ): Promise<number> => {
    try {
      const supabase = await createClient();
      let q = supabase.from(table).select("id", { count: "exact", head: true });
      if (filter) q = q.eq(filter.column, filter.value);
      const { count, error } = await q;
      if (error) {
        degraded = true;
        return 0;
      }
      return count ?? 0;
    } catch {
      degraded = true;
      return 0;
    }
  };

  const [totalPackages, pendingPackages, activeAds, activePartners] = await Promise.all([
    safeCount("packages"),
    safeCount("packages", { column: "status", value: "pending" }),
    safeCount("ads", { column: "status", value: "active" }),
    safeCount("partners", { column: "status", value: "active" }),
  ]);

  return {
    degraded,
    metrics: [
      {
        label: "Total de Pacotes",
        value: totalPackages,
        hint: "Pacotes indexados no portal",
        icon: PackageIcon,
        accent: "red",
        href: "/packages",
      },
      {
        label: "Pacotes Pendentes",
        value: pendingPackages,
        hint: "Aguardando moderação",
        icon: Inbox,
        accent: "amber",
        href: "/admin/submissions",
      },
      {
        label: "Anúncios Ativos",
        value: activeAds,
        hint: "Slots veiculando agora",
        icon: Megaphone,
        accent: "blue",
        href: "/admin/ads",
      },
      {
        label: "Parceiros Ativos",
        value: activePartners,
        hint: "Parcerias publicadas",
        icon: Handshake,
        accent: "emerald",
        href: "/admin/partners",
      },
    ],
  };
}

const ACCENT_CLASSES: Record<Metric["accent"], { ring: string; text: string; glow: string }> = {
  red: { ring: "border-brand-red/30", text: "text-brand-red", glow: "bg-brand-red/10" },
  amber: { ring: "border-amber-500/30", text: "text-amber-400", glow: "bg-amber-500/10" },
  blue: { ring: "border-brand-blue/30", text: "text-brand-blue", glow: "bg-brand-blue/10" },
  emerald: { ring: "border-emerald-500/30", text: "text-emerald-400", glow: "bg-emerald-500/10" },
};

const QUICK_ACTIONS = [
  {
    href: "/admin/submissions",
    label: "Ver submissões pendentes",
    description: "Aprovar ou rejeitar pacotes na fila",
    icon: Inbox,
  },
  {
    href: "/admin/partners",
    label: "Gerenciar parceiros",
    description: "Aprovar, editar e curar parcerias ativas",
    icon: Handshake,
  },
  {
    href: "/admin/ads",
    label: "Gerenciar anúncios",
    description: "Campanhas ativas e slots de veiculação",
    icon: Megaphone,
  },
  {
    href: "/admin/plans",
    label: "Editar planos de destaque",
    description: "Configurar níveis comerciais",
    icon: Sparkles,
  },
  {
    href: "/publish",
    label: "Publicar novo pacote",
    description: "Submeter como admin",
    icon: PlusCircle,
  },
];

export default async function AdminOverviewPage() {
  const { metrics, degraded } = await loadMetrics();

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <section>
        <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Bem-vindo ao <span className="text-brand-red">Console Administrativo</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl">
          Resumo executivo do portal PubPascal-Dev. Acompanhe o volume da esteira,
          campanhas ativas e parcerias publicadas em um único painel.
        </p>
        {degraded && (
          <p className="mt-4 inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">
            métricas em modo degradado — dados ao vivo indisponíveis
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((m) => {
          const accent = ACCENT_CLASSES[m.accent];
          const Icon = m.icon;
          const card = (
            <div
              className={`group h-full p-5 rounded-2xl border ${accent.ring} bg-slate-950/60 backdrop-blur-md hover:bg-slate-950/80 hover:-translate-y-0.5 transition-all shadow-lg shadow-black/20`}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div
                  className={`h-10 w-10 rounded-xl ${accent.glow} flex items-center justify-center`}
                >
                  <Icon className={`h-5 w-5 ${accent.text}`} />
                </div>
                {m.href && (
                  <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-slate-300 transition-colors" />
                )}
              </div>
              <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-slate-500">
                {m.label}
              </p>
              <p className="font-display text-3xl font-extrabold text-white mt-1 tabular-nums">
                {m.value.toLocaleString("pt-BR")}
              </p>
              <p className="text-xs text-slate-500 mt-2">{m.hint}</p>
            </div>
          );
          return m.href ? (
            <Link key={m.label} href={m.href} className="block">
              {card}
            </Link>
          ) : (
            <div key={m.label}>{card}</div>
          );
        })}
      </section>

      <section>
        <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-red" />
          <span>Ações rápidas</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {QUICK_ACTIONS.map((a, i) => {
            const Icon = a.icon;
            const isLastOdd = QUICK_ACTIONS.length % 2 !== 0 && i === QUICK_ACTIONS.length - 1;
            return (
              <Link
                key={a.href}
                href={a.href}
                className={`group flex items-center gap-4 p-4 rounded-xl border border-slate-850 bg-slate-950/50 hover:border-brand-red/40 hover:bg-slate-950/80 transition-all${isLastOdd ? " md:col-span-2" : ""}`}
              >
                <div className="h-10 w-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center group-hover:border-brand-red/40 transition-colors">
                  <Icon className="h-4 w-4 text-brand-red" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{a.label}</p>
                  <p className="text-xs text-slate-500 truncate">{a.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-brand-red transition-colors" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
