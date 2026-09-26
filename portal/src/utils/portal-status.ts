import { cache } from "react";
import { createServiceClient } from "@/utils/supabase/service";

export type PortalStatusMetrics = {
  active_count: number;
  submissions_7d: number;
  validated_7d: number;
  pending_count: number;
};

const EMPTY: PortalStatusMetrics = {
  active_count: 0,
  submissions_7d: 0,
  validated_7d: 0,
  pending_count: 0,
};

async function loadPortalStatusMetrics(): Promise<PortalStatusMetrics> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .rpc("get_portal_status_metrics")
      .maybeSingle();

    if (error || !data) {
      console.warn("[portal-status] rpc failed", error);
      return EMPTY;
    }

    const row = data as Partial<PortalStatusMetrics>;
    return {
      active_count: Number(row.active_count ?? 0),
      submissions_7d: Number(row.submissions_7d ?? 0),
      validated_7d: Number(row.validated_7d ?? 0),
      pending_count: Number(row.pending_count ?? 0),
    };
  } catch (err) {
    console.warn("[portal-status] unexpected", err);
    return EMPTY;
  }
}

export const getPortalStatusMetrics = cache(loadPortalStatusMetrics);
