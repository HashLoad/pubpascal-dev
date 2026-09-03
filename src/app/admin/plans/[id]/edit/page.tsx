import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanForm } from "../../PlanForm";
import { updatePlan } from "../../actions";
import { getPlanById } from "@/utils/queries/admin-plans";
import { isUuid } from "@/utils/queries/admin-submissions";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditPlanPage({ params }: PageProps) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const plan = await getPlanById(id);
  if (!plan) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header>
        <Link
          href="/admin/plans"
          className="text-xs font-mono uppercase tracking-[0.15em] text-slate-500 hover:text-slate-300 transition-colors"
        >
          ← Planos
        </Link>
        <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight mt-2">
          Editar <span className="text-brand-red">Plano</span>
        </h2>
      </header>
      <PlanForm action={updatePlan} initial={plan} submitLabel="Salvar alterações" />
    </div>
  );
}
