import "server-only";
import { createClient } from "@/utils/supabase/server";
import type { AdRow } from "./admin-ads-types";

const ADS_COLUMNS =
  "id, title, description, banner_url, target_url, start_date, end_date, status, impressions, clicks, created_at, updated_at";

export async function getAllAds(): Promise<AdRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ads")
    .select(ADS_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];
  return data as AdRow[];
}

export async function getAdById(id: string): Promise<AdRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ads")
    .select(ADS_COLUMNS)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as AdRow;
}
