// Server-only — do NOT import from client components.
// Subscription query helpers. Uses service-role client (no user session). ADR-021.

import { createServiceClient } from "@/utils/supabase/service";

export type SubscriptionWithPlan = {
  id: string;
  publisher_id: string;
  package_id: string | null;
  plan_id: string;
  plan_tier: string;
  billing_cycle: string;
  status: string;
};

export async function getSubscriptionByExternalId(
  externalId: string
): Promise<SubscriptionWithPlan | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("subscriptions")
    .select(
      "id, publisher_id, package_id, plan_id, status, plans!inner(tier, billing_cycle)"
    )
    .eq("external_subscription_id", externalId)
    .maybeSingle();

  if (error || !data) return null;

  const plan = data.plans as unknown as { tier: string; billing_cycle: string };

  return {
    id: data.id,
    publisher_id: data.publisher_id,
    package_id: data.package_id ?? null,
    plan_id: data.plan_id,
    plan_tier: plan.tier,
    billing_cycle: plan.billing_cycle,
    status: data.status,
  };
}
