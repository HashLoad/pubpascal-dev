import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/HeaderServer";
import Footer from "@/components/Footer";
import {
  Download,
  Terminal,
  LayoutGrid,
  ArrowUpRight,
  AlertTriangle,
  PackageCheck,
  type LucideIcon,
} from "lucide-react";
import { hasLocale } from "../dictionaries";

type DownloadPageProps = {
  params: Promise<{ lang: string }>;
};

// Binaries are served statically from the portal's public/downloads folder —
// Vercel serves public/ even though the source repo is private. One repo for the
// portal + its downloads. Drop new builds into public/downloads and bump below.
const PUBPASCAL = "/downloads";

type DownloadKind = "installer" | "cli" | "desktopZip";

const KIND_ICON: Record<DownloadKind, LucideIcon> = {
  installer: Download,
  cli: Terminal,
  desktopZip: LayoutGrid,
};

type AppDownload = {
  kind: DownloadKind;
  href: string;
  primary?: boolean;
  comingSoon?: boolean;
};

type AppMeta = {
  id: string;
  name: string;
  publisher: string;
  version: string;
  icon: LucideIcon;
  downloads: AppDownload[];
};

// Lang-independent app catalog. To add an app: append here + add its copy under
// COPY[*].apps[id]. The first download (or the one flagged `primary`) is the big
// button; the rest render under "also standalone".
const APPS: AppMeta[] = [
  {
    id: "pubpascal",
    name: "PubPascal",
    publisher: "Isaque Pinheiro",
    version: "0.1.0",
    icon: PackageCheck,
    downloads: [
      { kind: "installer", href: `${PUBPASCAL}/PubPascal-Setup-0.1.0.exe`, primary: true },
      { kind: "cli", href: `${PUBPASCAL}/boss.exe` },
      { kind: "desktopZip", href: `${PUBPASCAL}/pubpascal-desktop-win64.zip` },
    ],
  },
];

type AppCopy = {
  tagline: string;
  requirements: string;
  note?: string;
};

type Copy = {
  title: string;
  subtitle: string;
  earlyAccess: string;
  dlLabels: Record<DownloadKind, string>;
  comingSoon: string;
  alsoStandalone: string;
  token: string;
  apps: Record<string, AppCopy>;
};

const COPY: Record<string, Copy> = {
  "pt-BR": {
    title: "Downloads",
    subtitle: "Os apps free do ecossistema Delphi — instaladores Windows.",
    earlyAccess:
      "Dev builds / early access — qualidade POC, sem assinatura digital ainda. Cada app tem seus próprios requisitos (veja abaixo).",
    dlLabels: {
      installer: "Instalar",
      cli: "Baixar CLI (.exe)",
      desktopZip: "Baixar app Desktop (.zip)",
    },
    comingSoon: "Em breve",
    alsoStandalone: "Também avulso",
    token: "Gere um token manifest:read no seu perfil",
    apps: {
      pubpascal: {
        tagline:
          "O registry de pacotes Object Pascal + as ferramentas desktop pra gerenciar workspaces: o CLI e o app Desktop com o grafo do workspace e git ao vivo.",
        requirements: "Windows 10/11 · 64-bit · WebView2 (vem no Edge) · git no PATH",
        note: "O instalador coloca o app Desktop + o CLI no lugar, cria atalhos no menu Iniciar e adiciona o pubpascal ao PATH.",
      },
    },
  },
  en: {
    title: "Downloads",
    subtitle: "The free apps for the Delphi ecosystem — Windows installers.",
    earlyAccess:
      "Dev builds / early access — POC quality, no digital signature yet. Each app has its own requirements (see below).",
    dlLabels: {
      installer: "Install",
      cli: "Download CLI (.exe)",
      desktopZip: "Download Desktop app (.zip)",
    },
    comingSoon: "Coming soon",
    alsoStandalone: "Also standalone",
    token: "Mint a manifest:read token in your profile",
    apps: {
      pubpascal: {
        tagline:
          "The Object Pascal package registry + the desktop tools to manage workspaces: the CLI and the Desktop app with the workspace graph and live git.",
        requirements: "Windows 10/11 · 64-bit · WebView2 (ships with Edge) · git on PATH",
        note: "The installer places the Desktop app + the CLI, adds Start Menu shortcuts and puts pubpascal on your PATH.",
      },
    },
  },
};

export async function generateMetadata({
  params,
}: DownloadPageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const c = COPY[lang] ?? COPY["pt-BR"];
  return {
    title: c.title,
    description: c.subtitle,
    alternates: {
      canonical: `/${lang}/download/`,
      languages: { "pt-BR": "/pt-BR/download/", en: "/en/download/" },
    },
  };
}

function DownloadButton({
  dl,
  label,
  comingSoonLabel,
  primary,
}: {
  dl: AppDownload;
  label: string;
  comingSoonLabel: string;
  primary?: boolean;
}) {
  const Icon = KIND_ICON[dl.kind];
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition";
  const size = primary ? "px-6 py-3" : "px-4 py-2.5";

  if (dl.comingSoon) {
    return (
      <span
        className={`${base} ${size} cursor-not-allowed border border-slate-700 bg-slate-900/60 text-slate-500`}
        aria-disabled="true"
      >
        <Icon className="h-4 w-4" aria-hidden /> {label} · {comingSoonLabel}
      </span>
    );
  }

  const style = primary
    ? "bg-blue-600 text-white hover:bg-blue-500"
    : "border border-slate-700 text-slate-200 hover:border-blue-500 hover:text-white";
  return (
    <a href={dl.href} className={`${base} ${size} ${style}`}>
      <Icon className="h-4 w-4" aria-hidden /> {label}
    </a>
  );
}

export default async function DownloadPage({ params }: DownloadPageProps) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const c = COPY[lang] ?? COPY["pt-BR"];

  return (
    <div className="flex flex-col min-h-screen bg-brand-slate text-slate-100">
      <Header />
      <main className="flex-grow">
        <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {c.title}
          </h1>
          <p className="mt-3 max-w-2xl text-slate-400">{c.subtitle}</p>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" aria-hidden />
            <p>{c.earlyAccess}</p>
          </div>

          <div className="mt-10 space-y-8">
            {APPS.map((app) => {
              const ac = c.apps[app.id];
              if (!ac) return null;
              const primary =
                app.downloads.find((d) => d.primary) ?? app.downloads[0];
              const rest = app.downloads.filter((d) => d !== primary);
              const Icon = app.icon;
              return (
                <article
                  key={app.id}
                  className="rounded-2xl border-2 border-blue-500/40 bg-gradient-to-br from-blue-950/30 to-slate-900/50 p-6 md:p-8"
                >
                  <div className="flex items-start gap-4">
                    <Icon className="h-9 w-9 flex-none text-blue-400" aria-hidden />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <h2 className="text-xl font-bold">{app.name}</h2>
                        <span className="text-xs text-slate-500">
                          v{app.version} · {app.publisher}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">{ac.tagline}</p>
                      {ac.note && (
                        <p className="mt-2 text-xs text-slate-400">{ac.note}</p>
                      )}
                      <p className="mt-3 text-xs text-slate-500">
                        {ac.requirements}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <DownloadButton
                      dl={primary}
                      label={c.dlLabels[primary.kind]}
                      comingSoonLabel={c.comingSoon}
                      primary
                    />
                  </div>

                  {rest.length > 0 && (
                    <div className="mt-5 border-t border-slate-800 pt-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {c.alsoStandalone}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3">
                        {rest.map((d) => (
                          <DownloadButton
                            key={d.kind}
                            dl={d}
                            label={c.dlLabels[d.kind]}
                            comingSoonLabel={c.comingSoon}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              href="/profile/tokens"
              className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200"
            >
              {c.token} <ArrowUpRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
