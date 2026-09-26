"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getPlanById } from "@/utils/queries/admin-plans";
import { isUuid } from "@/utils/queries/admin-submissions";
import { getGateway } from "@/lib/gateways";
import type { GatewayCheckoutInput } from "@/lib/gateways/types";

export type CheckoutState = { error?: string } | null;

function buildCheckoutInput(
  plan: { id: string; external_price_id: string | null; price_cents: number; currency: string; tier: string; billing_cycle: string; provider: string | null },
  publisherId: string,
): GatewayCheckoutInput {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://pubpascal.dev";
  return {
    planId: plan.id,
    priceId: plan.external_price_id ?? "",
    priceCents: plan.price_cents,
    currency: plan.currency,
    provider: plan.provider ?? "",
    publisherId,
    successUrl: `${siteUrl}/dashboard/sponsorship?checkout=success`,
    failureUrl: `${siteUrl}/dashboard/sponsorship?checkout=failure`,
    description: `Patrocínio ${plan.tier} — ${plan.billing_cycle}`,
  };
}

export async function startCheckout(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Autenticação necessária." };

  const planId = String(formData.get("planId") ?? "");
  if (!isUuid(planId)) return { error: "Plano inválido." };

  const plan = await getPlanById(planId);
  if (!plan) return { error: "Plano não encontrado." };

  if (!plan.provider || !plan.external_price_id) {
    return { error: "Plano sem gateway configurado. Contate o administrador." };
  }

  const input = buildCheckoutInput(plan, user.id);
  const gateway = getGateway(plan.provider);
  const result = await gateway.createCheckout(input);

  if ("error" in result) return { error: result.error };

  const { error: insertError } = await supabase.from("subscriptions").insert({
    publisher_id: user.id,
    plan_id: plan.id,
    provider: plan.provider,
    external_subscription_id: result.externalId,
    external_checkout_url: result.checkoutUrl,
    status: "draft",
  });

  if (insertError) {
    console.warn("[startCheckout] insert failed", insertError);
    return { error: "Erro ao registrar assinatura. Tente novamente." };
  }

  redirect(result.checkoutUrl);
}
