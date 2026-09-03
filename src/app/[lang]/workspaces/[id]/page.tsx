// Public read-only workspace DAG page (ADR-063, RN-006).
//
// No auth gate — accessible to any viewer including anonymous users (AC-09).
// Returns notFound() for non-public or non-existent workspaces (BR-L6, AC-10).
// External nodes show ONLY upstream_url — no fork_url/label/write_target (AC-11).
// robots: index/follow — this is a public, SEO-relevant page.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/HeaderServer";
import Footer from "@/components/Footer";
import { getDictionary, hasLocale } from "@/app/[lang]/dictionaries";
import { getPublicWorkspaceView } from "./query";
import type { PublicWorkspaceNode } from "@/lib/workspaces/types";

type PageProps = {
  params: Promise<{ lang: string; id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, id } = await params;
  if (!hasLocale(lang)) return {};
  const view = await getPublicWorkspaceView(id);
  if (!view) return {};
  return {
    title: `${view.workspace.name} — PubPascal`,
    description: view.workspace.description ?? undefined,
    robots: { index: true, follow: true },
  };
}

function NodeRow({ node, lang }: { node: PublicWorkspaceNode; lang: string }) {
  if (node.kind === "external") {
    // AC-11 (RN-006): only upstream_url is rendered. No fork_url/label/write_target.
    return (
      <div className="flex items-start gap-3 rounded-md border border-slate-800 bg-slate-900/40 px-4 py-3">
        <span className="mt-0.5 flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-mono bg-blue-500/20 text-blue-400 border border-blue-500/30">
          ext
        </span>
        <div className="min-w-0 flex-1">
          {node.upstream_url ? (
            <a
              href={node.upstream_url}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all font-mono text-xs text-slate-300 hover:text-white transition-colors"
            >
              {node.upstream_url}
            </a>
          ) : (
            <span className="font-mono text-xs text-slate-500">—</span>
          )}
        </div>
      </div>
    );
  }

  // Package node.
  return (
    <div className="flex items-start gap-3 rounded-md border border-slate-800 bg-slate-900/40 px-4 py-3">
      <span className="mt-0.5 flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-mono bg-slate-700 text-slate-400 border border-slate-600">
        pkg
      </span>
      <div className="min-w-0 flex-1">
        {node.package.slug ? (
          <Link
            href={`/${lang}/packages/${node.package.slug}`}
            className="text-sm font-semibold text-slate-200 hover:text-white transition-colors"
          >
            {node.package.name || node.package.slug}
          </Link>
        ) : (
          <span className="text-sm text-slate-400">{node.package.name || "—"}</span>
        )}
      </div>
    </div>
  );
}

export default async function PublicWorkspacePage({ params }: PageProps) {
  const { lang, id } = await params;
  if (!hasLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const pv = dict.workspaces.publicView;

  // getPublicWorkspaceView returns null for non-public and non-existent workspaces.
  // Both map to notFound() — no existence leak (BR-L6, AC-10).
  const view = await getPublicWorkspaceView(id);
  if (!view) notFound();

  return (
    <div className="flex flex-col min-h-screen bg-brand-slate text-slate-100">
      <Header />

      <main className="flex-grow py-12">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-8">
          <header>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white">
              {pv.headingPrefix}{" "}
              <span className="text-brand-red">{view.workspace.name}</span>
            </h1>
            {view.workspace.description ? (
              <p className="mt-3 text-slate-400 text-sm leading-relaxed max-w-2xl">
                {view.workspace.description}
              </p>
            ) : null}
          </header>

          {/* Nodes list */}
          <section className="space-y-4">
            <h2 className="font-display text-lg font-bold text-white">
              {pv.headingHighlight}
            </h2>

            {view.nodes.length === 0 ? (
              <p className="text-sm text-slate-500">{pv.emptyNodes}</p>
            ) : (
              <div className="space-y-2">
                {view.nodes.map((node, i) => (
                  <NodeRow key={i} node={node} lang={lang} />
                ))}
              </div>
            )}
          </section>

          {/* Edges list */}
          {view.edges.length > 0 ? (
            <section className="space-y-4 border-t border-slate-800 pt-6">
              <h2 className="font-display text-lg font-bold text-white">
                {pv.edgesHeading}
              </h2>
              <div className="overflow-x-auto rounded-md border border-slate-800">
                <table className="w-full text-sm text-left text-slate-300">
                  <thead className="border-b border-slate-800 text-[11px] font-mono uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-4 py-2">From</th>
                      <th className="px-4 py-2"></th>
                      <th className="px-4 py-2">To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.edges.map((edge) => (
                      <tr key={edge.id} className="border-b border-slate-800/60 last:border-0">
                        <td className="px-4 py-2 font-mono text-xs text-slate-400">
                          {edge.from_node_id.slice(0, 8)}…
                        </td>
                        <td className="px-4 py-2 text-slate-500">→</td>
                        <td className="px-4 py-2 font-mono text-xs text-slate-400">
                          {edge.to_node_id.slice(0, 8)}…
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}
