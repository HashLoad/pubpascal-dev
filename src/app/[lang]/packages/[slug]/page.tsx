import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, GitBranch, Download, BookOpen, ChevronDown, Trophy, Medal, Award } from "lucide-react";
import Header from "@/components/HeaderServer";
import Footer from "@/components/Footer";
import MarkdownView from "@/components/MarkdownView";
import PackageDetailHeader from "@/components/PackageDetailHeader";
import PackageMetaSidebar from "@/components/PackageMetaSidebar";
import LikeButton from "@/components/LikeButton";
import PackageTabs from "@/components/PackageTabs";
import ScreenshotsGallery from "@/components/ScreenshotsGallery";
import VersionsList from "@/components/VersionsList";
import ScoresPanel, { type ScoresLabels } from "@/components/ScoresPanel";
import { loadPackageBySlug, type PackageVersion } from "./query";
import {
  fetchGithubRaw,
  fetchGithubRepoMeta,
  fetchGithubVersions,
  fetchSecurityPolicyPresence,
  fetchManifestDependencies,
  repoSlugFromUrl,
  isGithubRepo,
  repoTreeUrl,
  type FetchResult,
} from "./github";
import { parseTab, parseReadmeOpen, type RawSearchParams, type TabKey } from "./searchParams";
import { createClient } from "@/utils/supabase/server";
import { getLikesForPackage } from "@/utils/queries/likes";
import { fetchRepoSbom } from "@/lib/sbom/repo-sbom";
import type { SbomFormat } from "@/utils/queries/package-sbom";
import SbomCompliancePanel from "@/components/SbomCompliancePanel";
import CraReadinessPanel from "@/components/CraReadinessPanel";
import DependenciesPanel, { type ResolvedDependency } from "@/components/DependenciesPanel";
import WorkspacePanel from "@/components/WorkspacePanel";
import { getWorkspacesForPackage } from "./workspaces";
import { computeReadiness, isMaintained } from "@/lib/cra/readiness";
import {
  getCuratedTabContent,
  type CuratedTabContent,
} from "@/utils/queries/tab-content";
import ReviewsTab from "./reviews/ReviewsTab";
import { getDictionary, hasLocale, ogLocale } from "../../dictionaries";
import { stripMarkdown } from "@/lib/markdown";

type PageProps = {
  params: Promise<{ lang: string; slug: string }>;
  searchParams: Promise<RawSearchParams>;
};

function FallbackPanel({
  title,
  message,
  cta,
}: {
  title: string;
  message: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-8 text-center">
      <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-xl bg-slate-950 border border-slate-800 text-brand-red mb-4">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="font-display text-lg font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400">{message}</p>
      {cta && (
        <a
          href={cta.href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
        >
          <GitBranch className="h-4 w-4" />
          <span>{cta.label}</span>
        </a>
      )}
    </div>
  );
}

function fallbackForResult(
  result: FetchResult,
  repositoryUrl: string | null,
  defaults: { unavailableTitle: string; unavailableMessage: string },
) {
  if (result.ok) return null;
  if (result.reason === "not-github") {
    return (
      <FallbackPanel
        title="Conteúdo não disponível aqui"
        message="Este pacote não está hospedado no GitHub. Acesse o repositório original para ver o conteúdo."
        cta={
          repositoryUrl
            ? { href: repositoryUrl, label: "Abrir repositório" }
            : undefined
        }
      />
    );
  }
  return (
    <FallbackPanel
      title={defaults.unavailableTitle}
      message={defaults.unavailableMessage}
      cta={
        repositoryUrl ? { href: repositoryUrl, label: "Abrir repositório" } : undefined
      }
    />
  );
}

const HIGHLIGHT_ACCENT: Record<string, { bar: string; badge: string; text: string; icon: typeof Trophy }> = {
  gold:   { bar: "from-yellow-500 to-amber-400",  badge: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",  text: "text-yellow-400",  icon: Trophy },
  silver: { bar: "from-slate-400 to-slate-300",   badge: "bg-slate-400/10 border-slate-400/30 text-slate-300",    text: "text-slate-300",   icon: Medal  },
  bronze: { bar: "from-amber-700 to-amber-500",   badge: "bg-amber-700/10 border-amber-600/30 text-amber-500",    text: "text-amber-500",   icon: Award  },
};

const PLATFORM_ICONS: Record<string, string> = {
  Windows: "🪟", macOS: "🍎", Linux: "🐧", Android: "🤖", iOS: "📱", Web: "🌐",
};

type DescriptionCardProps = {
  description: string;
  highlightLevel: string | null;
  platforms: string[] | null;
  languages: string[] | null;
  categories: string[] | null;
};

function DescriptionCard({ description, highlightLevel, platforms, languages, categories }: DescriptionCardProps) {
  const level = highlightLevel?.toLowerCase() ?? "none";
  const accent = HIGHLIGHT_ACCENT[level];
  const Icon = accent?.icon;

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-slate-900/40 ${accent ? "border-yellow-500/20" : "border-slate-800"}`}>
      {/* Accent gradient bar at top */}
      {accent && (
        <div className={`h-0.5 w-full bg-gradient-to-r ${accent.bar}`} />
      )}

      <div className="p-6 md:p-8">
        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${accent ? accent.badge : "bg-slate-800 border border-slate-700"}`}>
              {accent && Icon ? (
                <Icon className={`h-3.5 w-3.5 ${accent.text}`} />
              ) : (
                <BookOpen className="h-3.5 w-3.5 text-slate-400" />
              )}
            </div>
            <span className="text-xs font-mono uppercase tracking-widest text-slate-500">
              Sobre o projeto
            </span>
          </div>
          {accent && (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${accent.badge}`}>
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </span>
          )}
        </div>

        {/* Description body */}
        <div className="prose-description text-[15px] leading-relaxed text-slate-300">
          <MarkdownView source={description} />
        </div>

        {/* Language + Platform + Category chips — language first, labelled */}
        {((platforms && platforms.length > 0) ||
          (languages && languages.length > 0) ||
          (categories && categories.length > 0)) && (
          <div className="mt-6 pt-5 border-t border-slate-800/60 space-y-3">
            {/* Language row — primary identity */}
            {languages && languages.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600 w-20 shrink-0">
                  Linguagem
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {languages.map((l) => (
                    <span key={l} className="inline-flex items-center gap-1.5 rounded-md bg-brand-blue/10 border border-brand-blue/30 px-3 py-1 text-xs font-bold text-brand-blue">
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* Platform row — secondary info */}
            {platforms && platforms.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600 w-20 shrink-0">
                  Plataformas
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {platforms.map((p) => (
                    <span key={p} className="inline-flex items-center gap-1 rounded-md bg-slate-800/70 border border-slate-700/50 px-2.5 py-1 text-[11px] text-slate-400">
                      <span>{PLATFORM_ICONS[p] ?? "•"}</span>{p}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* Category row — secondary info */}
            {categories && categories.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-600 w-20 shrink-0">
                  Categorias
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 rounded-md bg-slate-800/70 border border-slate-700/50 px-2.5 py-1 text-[11px] text-slate-400">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

async function renderReadme(
  repositoryUrl: string | null,
  description: string | null,
  slug: string,
  open: boolean,
  highlightLevel: string | null,
  platforms: string[] | null,
  languages: string[] | null,
  categories: string[] | null,
  lang: string,
) {
  // Curated summary first (our own field). The repo README below is fetched
  // ONLY when expanded (open) — collapsed makes zero git calls.
  const summary =
    description && description.trim().length > 0 ? (
      <DescriptionCard
        description={description}
        highlightLevel={highlightLevel}
        platforms={platforms}
        languages={languages}
        categories={categories}
      />
    ) : null;

  let readmeBlock: React.ReactNode;
  if (!repositoryUrl || !isGithubRepo(repositoryUrl)) {
    readmeBlock = summary ? null : (
      <FallbackPanel
        title="README não disponível"
        message="Este pacote não está hospedado no GitHub ou não declarou um repositório."
        cta={
          repositoryUrl
            ? { href: repositoryUrl, label: "Abrir repositório" }
            : undefined
        }
      />
    );
  } else if (!open) {
    // Collapsed: eye-catching expand button
    readmeBlock = (
      <Link
        href={`/${lang}/packages/${slug}?readme=1`}
        scroll={false}
        className="group flex items-center justify-between rounded-2xl border border-slate-700/60 bg-gradient-to-r from-slate-900/80 to-slate-800/40 px-6 py-5 hover:border-brand-blue/40 hover:from-brand-blue/5 hover:to-slate-900/60 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center group-hover:bg-brand-blue/20 transition-colors">
            <BookOpen className="h-4 w-4 text-brand-blue" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">README do repositório</p>
            <p className="text-xs text-slate-500">Documentação completa do projeto</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-brand-blue/10 border border-brand-blue/20 px-3 py-1.5 group-hover:bg-brand-blue/20 transition-colors">
          <span className="text-xs font-bold text-brand-blue">expandir</span>
          <ChevronDown className="h-3.5 w-3.5 text-brand-blue animate-bounce" />
        </div>
      </Link>
    );
  } else {
    const result = await fetchGithubRaw(repositoryUrl, "README.md");
    if (result.ok) {
      readmeBlock = (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/20">
          <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
            <span className="text-sm font-semibold text-slate-200">
              README do repositório
            </span>
            <Link
              href={`/${lang}/packages/${slug}`}
              scroll={false}
              className="text-xs font-normal text-slate-500 hover:text-slate-300"
            >
              recolher
            </Link>
          </div>
          <div className="px-6 py-6">
            <MarkdownView source={result.body} repoUrl={repositoryUrl} />
          </div>
        </div>
      );
    } else {
      readmeBlock = fallbackForResult(result, repositoryUrl, {
        unavailableTitle: "README indisponível",
        unavailableMessage:
          "Não foi possível carregar o README do repositório agora. Tente novamente em instantes.",
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {summary}
      {readmeBlock}
    </div>
  );
}

async function renderChangelog(
  versions: PackageVersion[],
  repositoryUrl: string | null,
) {
  const haveNotes = versions.some(
    (v) => v.release_notes && v.release_notes.trim().length > 0,
  );

  if (haveNotes) {
    return (
      <div className="flex flex-col gap-6">
        {versions.map((v) => {
          if (!v.release_notes || v.release_notes.trim().length === 0) return null;
          return (
            <article
              key={v.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6"
            >
              <header className="flex items-baseline gap-3 mb-3">
                <span className="font-mono text-base font-bold text-white bg-slate-950 border border-slate-800 px-2.5 py-0.5 rounded">
                  {v.version}
                </span>
                <span className="text-xs text-slate-500">
                  {v.created_at
                    ? new Intl.DateTimeFormat("pt-BR", {
                        year: "numeric",
                        month: "short",
                        day: "2-digit",
                      }).format(new Date(v.created_at))
                    : ""}
                </span>
              </header>
              <MarkdownView source={v.release_notes} />
            </article>
          );
        })}
      </div>
    );
  }

  if (repositoryUrl && isGithubRepo(repositoryUrl)) {
    const result = await fetchGithubRaw(repositoryUrl, "CHANGELOG.md");
    if (result.ok) return <MarkdownView source={result.body} />;
  }

  return (
    <FallbackPanel
      title="Changelog ainda não fornecido"
      message="O publicador deste pacote ainda não registrou um histórico de versões."
      cta={
        repositoryUrl ? { href: repositoryUrl, label: "Abrir repositório" } : undefined
      }
    />
  );
}

// Curated (publisher-authored) markdown block, styled like renderReadme's summary.
function curatedBlock(source: string | null): React.ReactNode {
  if (!source || source.trim().length === 0) return null;
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6">
      <MarkdownView source={source} />
    </div>
  );
}

async function renderExample(curated: string | null, repositoryUrl: string | null) {
  const curatedContent = curatedBlock(curated);

  // Git fetch stays as the fallback source (EXAMPLE.md then examples/README.md).
  let gitContent: React.ReactNode = null;
  if (repositoryUrl && isGithubRepo(repositoryUrl)) {
    const first = await fetchGithubRaw(repositoryUrl, "EXAMPLE.md");
    if (first.ok) gitContent = <MarkdownView source={first.body} />;
    else {
      const second = await fetchGithubRaw(repositoryUrl, "examples/README.md");
      if (second.ok) gitContent = <MarkdownView source={second.body} />;
    }
  }

  // Curated-first: publisher content on top, git content below as supplement.
  if (curatedContent) {
    return (
      <div className="space-y-6">
        {curatedContent}
        {gitContent}
      </div>
    );
  }

  if (gitContent) return gitContent;

  // Neither curated nor git → today's placeholder behavior.
  if (!repositoryUrl || !isGithubRepo(repositoryUrl)) {
    return (
      <FallbackPanel
        title="Exemplo não disponível"
        message="Este pacote não está hospedado no GitHub ou não declarou um repositório."
        cta={
          repositoryUrl
            ? { href: repositoryUrl, label: "Abrir repositório" }
            : undefined
        }
      />
    );
  }

  return (
    <FallbackPanel
      title="Exemplo em breve"
      message="O publicador ainda não adicionou um exemplo. Você pode conferir a pasta examples/ do repositório."
      cta={{
        href: repoTreeUrl(repositoryUrl, "examples"),
        label: "Abrir pasta examples/",
      }}
    />
  );
}

async function renderInstalling(
  curated: string | null,
  repositoryUrl: string | null,
  licenseType: string | null,
  websiteUrl: string | null,
  lang: string,
) {
  const curatedContent = curatedBlock(curated);

  let gitContent: React.ReactNode = null;
  if (repositoryUrl && isGithubRepo(repositoryUrl)) {
    const result = await fetchGithubRaw(repositoryUrl, "INSTALL.md");
    if (result.ok) gitContent = <MarkdownView source={result.body} />;
  }

  // Curated-first: publisher content on top, git INSTALL.md below as supplement.
  if (curatedContent) {
    return (
      <div className="space-y-6">
        {curatedContent}
        {gitContent}
      </div>
    );
  }

  if (gitContent) return gitContent;

  const isCommercial = (licenseType ?? "").toLowerCase() === "commercial";

  if (isCommercial) {
    const target = websiteUrl || repositoryUrl;
    return (
      <FallbackPanel
        title="Como instalar"
        message="Este é um pacote comercial. Visite o site do publicador para obter instruções de aquisição e instalação."
        cta={
          target
            ? { href: target, label: websiteUrl ? "Abrir website" : "Abrir repositório" }
            : undefined
        }
      />
    );
  }

  if (!repositoryUrl) {
    return (
      <FallbackPanel
        title="Como instalar"
        message="Este pacote não declarou um repositório público de instalação."
      />
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6">
      <h3 className="font-display text-lg font-bold text-white mb-3">
        Clone o repositório
      </h3>
      <p className="text-sm text-slate-400 leading-relaxed mb-4">
        Este é um pacote open source. Clone o repositório oficial e siga as instruções do README.
      </p>
      <pre className="font-mono text-sm bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto text-slate-200">
        <code>git clone {repositoryUrl}</code>
      </pre>
      <p className="mt-4 text-xs text-slate-500">
        Para instruções específicas, abra a aba{" "}
        <Link href={`/${lang}/packages/?tab=readme`} className="text-brand-blue hover:underline">
          Readme
        </Link>
        .
      </p>
    </div>
  );
}

async function renderVersions(
  repositoryUrl: string | null,
  dbVersions: PackageVersion[],
  slug: string,
  yankedVersions: string[],
) {
  const yanked = new Set(yankedVersions);
  if (repositoryUrl && isGithubRepo(repositoryUrl)) {
    const versions = await fetchGithubVersions(repositoryUrl);
    if (versions && versions.length > 0) {
      const fmtDate = (iso: string | null) =>
        iso
          ? new Intl.DateTimeFormat("pt-BR", {
              year: "numeric",
              month: "short",
              day: "2-digit",
            }).format(new Date(iso))
          : "—";

      return (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/30">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
            <span className="text-sm font-semibold text-white">
              {versions.length} {versions.length === 1 ? "versão" : "versões"}
            </span>
            <span className="text-xs text-slate-500">do repositório no GitHub</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-850 text-left text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500">
                <th className="px-5 py-2.5">Versão</th>
                <th className="px-5 py-2.5">Lançado</th>
                <th className="px-5 py-2.5">Notas</th>
                <th className="px-5 py-2.5 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {versions.map((v) => (
                <tr key={v.version} className="hover:bg-slate-900/40">
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-2">
                      {v.url ? (
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`font-mono font-semibold hover:underline ${
                            yanked.has(v.version)
                              ? "text-amber-300/70 line-through"
                              : "text-brand-blue"
                          }`}
                        >
                          {v.version}
                        </a>
                      ) : (
                        <span
                          className={`font-mono font-semibold ${
                            yanked.has(v.version) ? "text-amber-300/70 line-through" : "text-slate-200"
                          }`}
                        >
                          {v.version}
                        </span>
                      )}
                      {yanked.has(v.version) && (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                          Yanked
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-400">{fmtDate(v.date)}</td>
                  <td className="px-5 py-3">
                    {v.notes && v.notes.trim().length > 0 && v.url ? (
                      <a
                        href={v.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-blue hover:underline"
                      >
                        ver notas
                      </a>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {v.zip && (
                      <a
                        href={v.zip}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white"
                        title={`Baixar ${v.version} (.zip)`}
                      >
                        <Download className="h-3.5 w-3.5" />
                        .zip
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }

  if (dbVersions.length > 0) {
    // Per-version SBOM affordance, derived purely from the LIVE repo SBOM: only
    // the version whose string matches repoSbom.version gets a badge, linking to
    // the repo's raw SBOM. fetchRepoSbom is React-cached, so this dedupes with
    // the page-level read. Fail-soft → no badge.
    const repoSbom = repositoryUrl ? await fetchRepoSbom(repositoryUrl) : null;
    const sbomByVersion: Record<string, SbomFormat> = {};
    const sbomDownloadUrls: Record<string, string> = {};
    if (repoSbom && repoSbom.version) {
      const match = dbVersions.find((v) => v.version === repoSbom.version);
      if (match) {
        sbomByVersion[match.id] = repoSbom.format;
        sbomDownloadUrls[match.id] = repoSbom.downloadUrl;
      }
    }
    return (
      <VersionsList
        versions={dbVersions}
        sbomByVersion={sbomByVersion}
        sbomDownloadUrls={sbomDownloadUrls}
        yankedVersions={yankedVersions}
      />
    );
  }

  return (
    <FallbackPanel
      title="Sem versões publicadas"
      message="Este pacote ainda não tem releases ou tags no repositório."
      cta={
        repositoryUrl ? { href: repositoryUrl, label: "Abrir repositório" } : undefined
      }
    />
  );
}

async function renderTab(
  activeTab: TabKey,
  data: NonNullable<Awaited<ReturnType<typeof loadPackageBySlug>>>,
  userId: string | null,
  lang: string,
  readmeOpen: boolean,
  scoresLabels: ScoresLabels,
  curated: CuratedTabContent,
) {
  const { pkg, versions } = data;
  switch (activeTab) {
    case "readme":
      return renderReadme(pkg.repository_url, pkg.description, pkg.slug, readmeOpen, pkg.highlight_level ?? null, pkg.platforms ?? null, pkg.languages ?? null, pkg.categories ?? null, lang);
    case "changelog":
      return renderChangelog(versions, pkg.repository_url);
    case "example":
      return renderExample(curated.example, pkg.repository_url);
    case "installing":
      return renderInstalling(
        curated.installing,
        pkg.repository_url,
        pkg.license_type,
        pkg.website_url,
        lang,
      );
    case "versions":
      return renderVersions(pkg.repository_url, versions, pkg.slug, pkg.yanked_versions ?? []);
    case "scores":
      return <ScoresPanel pkg={pkg} labels={scoresLabels} />;
    case "reviews":
      return <ReviewsTab packageId={pkg.id} userId={userId} />;
  }
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!hasLocale(lang)) return {};
  const dict = await getDictionary(lang);
  const data = await loadPackageBySlug(slug);

  if (!data) {
    return {
      title: dict.packageDetail.meta.notFoundTitle,
      robots: { index: false, follow: false },
    };
  }

  const { pkg } = data;
  const description = truncate(
    stripMarkdown(pkg.description) || dict.packageDetail.meta.descriptionFallback,
    160,
  );

  return {
    title: pkg.name,
    description,
    alternates: {
      canonical: `/${lang}/packages/${slug}`,
      languages: {
        "pt-BR": `/pt-BR/packages/${slug}`,
        en: `/en/packages/${slug}`,
      },
    },
    robots: { index: true, follow: true },
    openGraph: {
      title: pkg.name,
      description,
      type: "article",
      locale: ogLocale(lang),
      images: ["./opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: pkg.name,
      description,
      images: ["./twitter-image"],
    },
  };
}

export default async function PackageDetailPage({ params, searchParams }: PageProps) {
  const [{ lang, slug }, rawSearch] = await Promise.all([params, searchParams]);
  if (!hasLocale(lang)) notFound();
  const data = await loadPackageBySlug(slug);

  if (!data) notFound();

  const dict = await getDictionary(lang);
  const scoresLabels = dict.packageDetail.scores;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const activeTab = parseTab(rawSearch);
  const readmeOpen = parseReadmeOpen(rawSearch);
  const latestVersion = data.versions[0] ?? null;
  const curated = await getCuratedTabContent(data.pkg.id);
  const tabContent = await renderTab(
    activeTab,
    data,
    user?.id ?? null,
    lang,
    readmeOpen,
    scoresLabels,
    curated,
  );

  // Mirror the repo's current stars + license live (open-source only for license;
  // commercial keeps its declared license). Falls back to stored values on any miss.
  const repoMeta = isGithubRepo(data.pkg.repository_url)
    ? await fetchGithubRepoMeta(data.pkg.repository_url as string)
    : null;
  const liveStars = repoMeta?.stars ?? data.pkg.stars;
  const liveForks = repoMeta?.forks ?? null;
  const isOpenSource = (data.pkg.license_type ?? "").toLowerCase() === "open_source";
  const liveLicenseName =
    isOpenSource && repoMeta?.license ? repoMeta.license : data.pkg.license_name;

  const likes = await getLikesForPackage(data.pkg.id, user?.id ?? null);
  // The SBOM is the repo's responsibility: read it LIVE from the repo (no DB),
  // self-correcting and fail-soft. Drives both the header badge (presence) and
  // the compliance panel. React-cached, so it dedupes with renderVersions.
  const repoSbom = data.pkg.repository_url
    ? await fetchRepoSbom(data.pkg.repository_url)
    : null;

  // Composite CRA-readiness — SBOM + a security-disclosure policy + an actively
  // maintained release cadence. (OSV vuln-scan joins once its results are stored.)
  // "Maintained" uses the live GitHub release date (cached), falling back to the
  // stored version — repos publish versions as git tags, not always to the DB.
  const hasSecurityPolicy = data.pkg.repository_url
    ? await fetchSecurityPolicyPresence(data.pkg.repository_url)
    : false;
  const ghVersions =
    (data.pkg.repository_url
      ? await fetchGithubVersions(data.pkg.repository_url)
      : []) ?? [];
  // Prefer the last push (most accurate "still being worked on"), then the latest
  // release tag, then the stored version.
  const maintainedDate =
    repoMeta?.pushed_at ?? ghVersions[0]?.date ?? latestVersion?.created_at ?? null;
  const craReadiness = computeReadiness({
    sbom: !!repoSbom,
    securityPolicy: hasSecurityPolicy,
    maintained: isMaintained(maintainedDate, new Date()),
  });

  // Declared dependencies — read straight from the repo's pubpascal.json (our
  // manifest) and resolved to catalog packages when published, else linked to
  // GitHub. The package declares "I depend on X"; the workspace pins the version.
  const rawDeps = data.pkg.repository_url
    ? await fetchManifestDependencies(data.pkg.repository_url)
    : null;
  let resolvedDeps: ResolvedDependency[] = [];
  if (rawDeps && rawDeps.length > 0) {
    const { data: depPkgs } = await supabase
      .from("packages")
      .select("name, slug, repository_url")
      .eq("status", "active");
    const byRepo = new Map<string, { slug: string; name: string }>();
    for (const p of (depPkgs ?? []) as {
      name: string;
      slug: string;
      repository_url: string | null;
    }[]) {
      if (p.repository_url)
        byRepo.set(repoSlugFromUrl(p.repository_url), { slug: p.slug, name: p.name });
    }
    resolvedDeps = rawDeps.map((d) => {
      const match = byRepo.get(repoSlugFromUrl(d.key));
      return {
        key: d.key,
        version: d.version,
        slug: match?.slug ?? null,
        name: match?.name ?? null,
      };
    });
  }

  // Workspaces the viewer may see that are rooted at this package: public ones
  // for anyone, plus the viewer's own. Fail-soft → []. Renders only when ≥1.
  const workspaces = await getWorkspacesForPackage(data.pkg.id, user?.id ?? null);

  return (
    <div className="flex flex-col min-h-screen bg-brand-slate text-slate-100">
      <Header />

      <main className="flex-grow">
        <PackageDetailHeader
          pkg={data.pkg}
          latestVersion={latestVersion}
          hasSbom={!!repoSbom}
          deprecatedLabel={dict.packageDetail.deprecated}
        />

        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 sm:px-6 lg:px-8 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <ScreenshotsGallery screenshots={data.pkg.screenshots ?? []} />
            <PackageTabs slug={data.pkg.slug} activeTab={activeTab} />
            <div className="py-8">{tabContent}</div>
          </div>
          <aside className="lg:order-last flex flex-col gap-4">
            <CraReadinessPanel
              readiness={craReadiness}
              dict={dict.packageDetail.cra}
            />
            {repoSbom && (
              <SbomCompliancePanel
                sbom={{
                  format: repoSbom.format,
                  spec_version: repoSbom.specVersion,
                  author: repoSbom.author,
                  created_at: repoSbom.timestamp,
                  updated_at: null,
                }}
                dict={dict.packageDetail.sbom}
                locale={lang}
                downloadHref={repoSbom.downloadUrl}
              />
            )}
            {resolvedDeps.length > 0 && (
              <DependenciesPanel
                deps={resolvedDeps}
                lang={lang}
                dict={dict.packageDetail.dependencies}
              />
            )}
            {workspaces.length > 0 && (
              <WorkspacePanel
                workspaces={workspaces}
                lang={lang}
                dict={dict.packageDetail.workspace}
              />
            )}
            <LikeButton
              packageId={data.pkg.id}
              liked={likes.likedByMe}
              count={likes.count}
              isAuthenticated={!!user}
              dict={dict.likes}
            />
            <PackageMetaSidebar
              pkg={data.pkg}
              liveStars={liveStars}
              liveForks={liveForks}
              licenseName={liveLicenseName}
              publisherUsername={data.publisherUsername}
              pointsLabel={scoresLabels.pointsLabel}
              likesCount={likes.count}
              likesLabel={dict.likes.likesLabel}
              communityFallback={dict.common.communityPublisher}
              sponsorLabel={dict.packageDetail.sponsor}
            />
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
