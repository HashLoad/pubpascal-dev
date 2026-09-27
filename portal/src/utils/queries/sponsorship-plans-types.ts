import type {
  PlanRow,
  PlanTier,
  BillingCycle,
} from "@/utils/queries/admin-plans-types";

export type { PlanRow, PlanTier, BillingCycle };

// Premium-first display order for the publisher-facing sponsorship page.
export const PLAN_TIER_ORDER = ["gold", "silver", "bronze"] as const;

export const TIER_LABEL: Record<PlanTier, string> = {
  gold: "Ouro",
  silver: "Prata",
  bronze: "Bronze",
};

export const CYCLE_LABEL: Record<BillingCycle, string> = {
  monthly: "Mensal",
  annual: "Anual",
};

/**
 * Reads the locked `plans.features` shape `{ items: string[] }` defensively.
 * Any non-conforming value (null, array, primitive, missing/!array `items`,
 * non-string members) yields an empty list — never throws.
 */
export function extractPlanFeatures(features: unknown): string[] {
  if (!features || typeof features !== "object" || Array.isArray(features)) {
    return [];
  }
  const items = (features as Record<string, unknown>).items;
  if (!Array.isArray(items)) return [];
  return items.filter((item): item is string => typeof item === "string");
}
