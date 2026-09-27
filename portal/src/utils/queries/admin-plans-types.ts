export const PLAN_TIERS = ["bronze", "silver", "gold"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const BILLING_CYCLES = ["monthly", "annual"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export type PlanRow = {
  id: string;
  tier: PlanTier;
  billing_cycle: BillingCycle;
  price_cents: number;
  currency: string;
  features: unknown;
  external_price_id: string | null;
  provider: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function isPlanTier(value: string): value is PlanTier {
  return (PLAN_TIERS as readonly string[]).includes(value);
}

export function isBillingCycle(value: string): value is BillingCycle {
  return (BILLING_CYCLES as readonly string[]).includes(value);
}
