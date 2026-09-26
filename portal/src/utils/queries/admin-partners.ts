import "server-only";
import { createClient } from "@/utils/supabase/server";
import type { PartnerRow } from "./admin-partners-types";

const PARTNERS_COLUMNS =
  "id, name, logo_url, website_url, description, status, tier, sort_order, created_at, updated_at";

export async function getAllPartners(): Promise<PartnerRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partners")
    .select(PARTNERS_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true })
    .limit(200);

  if (error || !data) return [];
  return data as PartnerRow[];
}

export async function getPartnerById(id: string): Promise<PartnerRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partners")
    .select(PARTNERS_COLUMNS)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as PartnerRow;
}
