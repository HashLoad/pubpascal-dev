import { Check } from "lucide-react";
import type { ReactNode } from "react";
import {
  CYCLE_LABEL,
  extractPlanFeatures,
  type PlanRow,
} from "@/utils/queries/sponsorship-plans-types";

function formatPrice(cents: number, currency: string): string {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function PlanCard({ plan, children }: { plan: PlanRow; children?: ReactNode }) {
  const features = extractPlanFeatures(plan.features);
  const cycleSuffix = plan.billing_cycle === "monthly" ? "/mês" : "/ano";

  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/60 p-6 backdrop-blur-md">
      <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-slate-500">
        {CYCLE_LABEL[plan.billing_cycle]}
      </p>
      <p className="mt-2 font-display text-3xl font-extrabold text-white">
        {formatPrice(plan.price_cents, plan.currency)}
        <span className="text-sm font-medium text-slate-500">{cycleSuffix}</span>
      </p>

      {features.length > 0 ? (
        <ul className="mt-5 space-y-2.5 flex-grow">
          {features.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
              <Check className="h-4 w-4 text-brand-red shrink-0 mt-0.5" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 flex-grow text-sm text-slate-500">
          Detalhes sob consulta.
        </p>
      )}

      {children}
    </div>
  );
}
