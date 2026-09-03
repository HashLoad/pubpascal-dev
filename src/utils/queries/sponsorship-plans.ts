import "server-only";
import { createClient } from "@/utils/supabase/server";
import type { PlanRow } from "@/utils/queries/admin-plans-types";

export async function getActivePlans(): Promise<PlanRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select(
      "id, tier, billing_cycle, price_cents, currency, features, external_price_id, provider, is_active, sort_order, created_at, updated_at",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("tier", { ascending: true })
    .order("billing_cycle", { ascending: true })
    .limit(100);

  if (error || !data) return [];
  return data as PlanRow[];
}
