export const PARTNER_STATUSES = ["active", "inactive"] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export const PARTNER_TIERS = ["platinum", "gold", "silver", "bronze"] as const;
export type PartnerTier = (typeof PARTNER_TIERS)[number];

export type PartnerRow = {
  id: string;
  name: string;
  logo_url: string;
  website_url: string;
  description: string | null;
  status: PartnerStatus;
  tier: PartnerTier | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export function isPartnerStatus(value: string): value is PartnerStatus {
  return (PARTNER_STATUSES as readonly string[]).includes(value);
}
