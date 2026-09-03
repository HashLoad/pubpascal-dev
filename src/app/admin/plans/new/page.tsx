import Link from "next/link";
import { PlanForm } from "../PlanForm";
import { createPlan } from "../actions";

export const dynamic = "force-dynamic";

export default function NewPlanPage() {
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
          Novo <span className="text-brand-red">Plano</span>
        </h2>
      </header>
      <PlanForm action={createPlan} submitLabel="Criar plano" />
    </div>
  );
}
