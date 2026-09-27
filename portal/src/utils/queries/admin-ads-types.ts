export const AD_STATUSES = ["pending", "active", "paused", "expired"] as const;
export type AdStatus = (typeof AD_STATUSES)[number];

export type AdRow = {
  id: string;
  title: string;
  description: string | null;
  banner_url: string;
  target_url: string;
  start_date: string;
  end_date: string;
  status: AdStatus;
  impressions: number;
  clicks: number;
  created_at: string;
  updated_at: string;
};

export function isAdStatus(value: string): value is AdStatus {
  return (AD_STATUSES as readonly string[]).includes(value);
}
