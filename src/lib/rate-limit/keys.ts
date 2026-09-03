// Pure namespaced rate-limit key-builder (ESP-002, BR4 / ADR-135 / AC-03).
// Deterministic — no Date, no Math.random — so every call site produces a
// stable, surface-distinct counter key. Keys are derived only from
// server-trusted identity (auth.uid(), a verified token hash, or the
// Vercel-normalized client IP), never from a blindly-trusted client header.

const SEPARATOR = ":";

// Join key segments with the namespace separator. Internal — call sites use the
// named builders below so the surface/identity shape stays consistent.
function buildKey(...segments: string[]): string {
  return segments.join(SEPARATOR);
}

/** `publish:user:<uid>` — per-publisher publish throttle. */
export function publishUserKey(uid: string): string {
  return buildKey("publish", "user", uid);
}

/** `tokens:user:<uid>` — per-owner CLI-token mutation throttle. */
export function tokensUserKey(uid: string): string {
  return buildKey("tokens", "user", uid);
}

/** `manifest:token:<hash>` — per-token manifest throttle. */
export function manifestTokenKey(tokenHash: string): string {
  return buildKey("manifest", "token", tokenHash);
}

/** `manifest:ip:<ip>` — per-IP manifest throttle (defense alongside per-token). */
export function manifestIpKey(ip: string): string {
  return buildKey("manifest", "ip", ip);
}

/** `sbom:ip:<ip>` — per-IP throttle for the public SBOM distribution endpoint. */
export function sbomIpKey(ip: string): string {
  return buildKey("sbom", "ip", ip);
}

/** `partner-apply:ip:<ip>` — per-IP anti-spam throttle for the public form. */
export function partnerApplyIpKey(ip: string): string {
  return buildKey("partner-apply", "ip", ip);
}

// Fallback identity when no client IP can be resolved. Keying every
// unidentified caller under one bucket is the conservative choice: it throttles
// the aggregate rather than handing each anonymous request its own fresh window.
export const UNKNOWN_IP = "unknown";

// Extract the client IP from an `x-forwarded-for` header value. On Vercel the
// platform sets a trustworthy left-most client IP behind its trusted proxy
// (ADR-135 / R3 / A4); off-Vercel hosting needs a trusted-proxy config. Pure:
// returns the first hop trimmed, or UNKNOWN_IP when the header is absent/empty.
export function clientIpFromForwardedFor(forwardedFor: string | null | undefined): string {
  if (!forwardedFor) return UNKNOWN_IP;
  const first = forwardedFor.split(",")[0]?.trim();
  return first && first.length > 0 ? first : UNKNOWN_IP;
}
