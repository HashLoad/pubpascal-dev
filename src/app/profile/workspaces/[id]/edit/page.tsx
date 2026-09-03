import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Header from "@/components/HeaderServer";
import Footer from "@/components/Footer";
import { createClient } from "@/utils/supabase/server";
import {
  getMyWorkspaceById,
  getWorkspaceNodes,
  getWorkspaceEdges,
  getActivePackagesForSelect,
  getMyExternalRepoLinks,
} from "../../query";
import { isUuid } from "@/utils/queries/admin-submissions";
import { getRequestLocale } from "@/utils/locale";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { WorkspaceEditForm } from "./WorkspaceEditForm";
import { WorkspaceGraphCanvas } from "./WorkspaceGraphCanvas";
import { WorkspaceCloneCommand } from "./WorkspaceCloneCommand";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary(await getRequestLocale());
  return {
    title: dict.workspaces.meta.editTitle,
    robots: { index: false, follow: false },
  };
}

type PageProps = { params: Promise<{ id: string }> };

export default async function EditWorkspacePage({ params }: PageProps) {
  const { id } = await params;

  const dict = await getDictionary(await getRequestLocale());
  const w = dict.workspaces;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=/profile/workspaces/${id}/edit`);
  }

  // Foreign/unknown id → back to the list, never another user's data (AC4, BR3).
  if (!isUuid(id)) {
    redirect("/profile/workspaces");
  }

  const workspace = await getMyWorkspaceById(user.id, id);
  if (!workspace) {
    redirect("/profile/workspaces");
  }

  // The root (PAI) node defines the workspace's clone identifier (<slug>@<version>).
  const [nodes, edges, packages, links] = await Promise.all([
    getWorkspaceNodes(id),
    getWorkspaceEdges(id),
    getActivePackagesForSelect(user.id),
    getMyExternalRepoLinks(user.id),
  ]);

  const rootNode = nodes.find((n) => n.is_root && n.package_id);

  return (
    <div className="flex flex-col min-h-screen bg-brand-slate text-slate-100">
      <Header />

      <main className="flex-grow py-12 space-y-8">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-8">
          <header>
            <Link
              href="/profile/workspaces"
              className="text-xs font-mono uppercase tracking-[0.15em] text-slate-500 hover:text-slate-300 transition-colors"
            >
              ← {w.edit.back}
            </Link>
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-white mt-2">
              {w.edit.headingPrefix}{" "}
              <span className="text-brand-red">{w.edit.headingHighlight}</span>
            </h1>
          </header>

          <WorkspaceEditForm
            workspace={workspace}
            dict={w}
            packages={packages}
            currentRootPackageId={rootNode?.package_id ?? ""}
          />
        </div>

        {/* Graph builder gets a wider canvas than the form (v7 DAG builder). */}
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-4 border-t border-slate-800 pt-8">
          <h2 className="font-display text-lg font-bold text-white">
            {w.graph.heading}
          </h2>
          <WorkspaceCloneCommand
            rootSlug={rootNode?.packages?.slug ?? null}
            rootVersion={rootNode?.ref_value ?? null}
            workspaceId={id}
            dict={w.graph}
          />
          <WorkspaceGraphCanvas
            nodes={nodes}
            edges={edges}
            dict={w}
            packages={packages}
            links={links}
            workspaceId={id}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
