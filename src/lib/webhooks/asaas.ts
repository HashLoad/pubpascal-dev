// Server-only — do NOT import from client components.
// Asaas webhook helpers: token validation, sponsorship end date, and tier mapping.
// ADR-021: token-in-header validation via Node.js crypto.timingSafeEqual (no npm).

import { timingSafeEqual } from "crypto";

const VALID_TIERS = new Set(["gold", "silver", "bronze"]);

/**
 * Validates the Asaas webhook access token.
 * Reads the `asaas-access-token` header and compares it to ASAAS_WEBHOOK_SECRET
 * using constant-time comparison to prevent timing attacks.
 */
export function validateAsaasToken(request: Request): boolean {
  const header = request.headers.get("asaas-access-token");
  const secret = process.env.ASAAS_WEBHOOK_SECRET;

  if (!header || !secret) return false;

  // Buffers must be equal length for timingSafeEqual; mismatched lengths → false.
  const headerBuf = Buffer.from(header);
  const secretBuf = Buffer.from(secret);

  if (headerBuf.length !== secretBuf.length) return false;

  return timingSafeEqual(headerBuf, secretBuf);
}

/**
 * Computes the sponsorship end date from the plan billing cycle.
 * monthly → now + 1 month; annual → now + 1 year.
 */
export function computeSponsorshipEnd(billingCycle: string): Date {
  const now = new Date();
  if (billingCycle === "annual") {
    now.setFullYear(now.getFullYear() + 1);
  } else {
    now.setMonth(now.getMonth() + 1);
  }
  return now;
}

/**
 * Maps a plan tier string to a package highlight_level value.
 * 1:1 mapping for gold/silver/bronze; unknown tiers fall back to 'none'.
 */
export function tierToHighlightLevel(tier: string): string {
  return VALID_TIERS.has(tier) ? tier : "none";
}
