import "server-only";
import { createClient } from "@/utils/supabase/server";
import type { PlanRow } from "./admin-plans-types";

const PLAN_COLUMNS =
  "id, tier, billing_cycle, price_cents, currency, features, external_price_id, provider, is_active, sort_order, created_at, updated_at";

export async function getAllPlans(): Promise<PlanRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select(PLAN_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("tier", { ascending: true })
    .limit(200);

  if (error || !data) return [];
  return data as PlanRow[];
}

export async function getPlanById(id: string): Promise<PlanRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select(PLAN_COLUMNS)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as PlanRow;
}
