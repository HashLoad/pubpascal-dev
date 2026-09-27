import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";

export type Placement = "hero" | "sidebar";

export type AdRecord = {
  id: string;
  title: string;
  description: string;
  banner_url: string;
  target_url: string;
  placement: Placement;
};

type AdRow = {
  id: string;
  title: string;
  description: string | null;
  banner_url: string | null;
  target_url: string | null;
  placement: string;
};

function pickRandom<T>(rows: T[]): T | null {
  if (rows.length === 0) return null;
  const idx = Math.floor(Math.random() * rows.length);
  return rows[idx];
}

async function loadActiveAdsByPlacement(
  placement: Placement,
): Promise<AdRecord | null> {
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("ads")
      .select("id, title, description, banner_url, target_url, placement")
      .eq("status", "active")
      .eq("placement", placement)
      .lte("start_date", now)
      .gte("end_date", now)
      .limit(20);

    if (error) {
      console.warn("[ads] eligibility query failed", error);
      return null;
    }

    const eligible = ((data ?? []) as AdRow[]).filter(
      (r): r is AdRow & { banner_url: string; target_url: string } =>
        Boolean(r.banner_url) && Boolean(r.target_url),
    );

    const chosen = pickRandom(eligible);
    if (!chosen) return null;

    return {
      id: chosen.id,
      title: chosen.title,
      description: chosen.description ?? "",
      banner_url: chosen.banner_url,
      target_url: chosen.target_url,
      placement: placement,
    };
  } catch (err) {
    console.warn("[ads] eligibility unexpected error", err);
    return null;
  }
}

export const getActiveAdsByPlacement = cache(loadActiveAdsByPlacement);

export async function incrementAdImpression(adId: string): Promise<void> {
  try {
    // Service-role so the counter RPC isn't exposed to anon (prevents metric abuse).
    const supabase = createServiceClient();
    await supabase.rpc("increment_ad_impressions", { ad_id: adId });
  } catch (err) {
    console.warn("[ads] impression increment failed", err);
  }
}
