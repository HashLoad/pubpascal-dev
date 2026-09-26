"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createAdminSubscription, type SubscriptionFormState } from "../actions";

export type FormPlan = { id: string; tier: string; billing_cycle: string; price_cents: number };
export type FormPackage = { id: string; name: string; slug: string };
export type FormPartner = { id: string; name: string };

const TIER_LABEL: Record<string, string> = { gold: "Gold", silver: "Prata", bronze: "Bronze" };
const CYCLE_LABEL: Record<string, string> = { monthly: "Mensal", annual: "Anual" };

export function SubscriptionNewForm({
  plans,
  packages,
  partners,
}: {
  plans: FormPlan[];
  packages: FormPackage[];
  partners: FormPartner[];
}) {
  const [state, action, pending] = useActionState<SubscriptionFormState, FormData>(
    createAdminSubscription,
    {},
  );

  return (
    <form action={action} className="space-y-6 max-w-lg">
      {state.error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="package_id" className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">
          Pacote *
        </label>
        <select
          id="package_id"
          name="package_id"
          required
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white focus:border-brand-red focus:outline-none"
        >
          <option value="">Selecione um pacote…</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>{p.name} ({p.slug})</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="plan_id" className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">
          Plano *
        </label>
        <select
          id="plan_id"
          name="plan_id"
          required
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white focus:border-brand-red focus:outline-none"
        >
          <option value="">Selecione um plano…</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {TIER_LABEL[p.tier] ?? p.tier} — {CYCLE_LABEL[p.billing_cycle] ?? p.billing_cycle} — R${(p.price_cents / 100).toFixed(2)}
            </option>
          ))}
        </select>
      </div>

      {partners.length > 0 && (
        <div>
          <label htmlFor="sponsor_partner_id" className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-2">
            Patrocinador <span className="normal-case text-slate-600">(opcional)</span>
          </label>
          <select
            id="sponsor_partner_id"
            name="sponsor_partner_id"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white focus:border-brand-red focus:outline-none"
          >
            <option value="">Sem patrocinador — publisher paga</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-slate-500">
            Use quando um parceiro institucional patrocina o destaque de um pacote de terceiro.
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand-red px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-red/90 transition-colors disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Ativar destaque"}
        </button>
        <Link
          href="/admin/subscriptions"
          className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
        >
          Voltar
        </Link>
      </div>
    </form>
  );
}
