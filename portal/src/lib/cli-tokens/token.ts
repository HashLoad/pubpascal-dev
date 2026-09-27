import { createHash, randomBytes } from "crypto";

export type CliTokenScope = "manifest:read";

export type GeneratedToken = {
  plaintext: string;
  prefix: string;
  hash: string;
};

export type CliTokenRow = {
  id: string;
  owner_id: string;
  label: string | null;
  scope: CliTokenScope;
  token_prefix: string;
  token_hash: string;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
};

// Single randomBytes boundary (AC-12). Returns the token in three forms needed
// for generation: plaintext (shown once), prefix (display fragment), hash (stored).
export function generateToken(): GeneratedToken {
  const random = randomBytes(32);
  const base64url = random.toString("base64url");
  const plaintext = `pdv_${base64url}`;
  const prefix = plaintext.slice(0, 10); // "pdv_" + first 6 chars of base64url
  const hash = hashToken(plaintext);
  return { plaintext, prefix, hash };
}

// Pure: same input always yields the same SHA-256 hex. No Date/Math.random (AC-12).
export function hashToken(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

// Pure: case-insensitive "Bearer " prefix extraction. Returns null when absent (AC-12).
export function parseBearer(header: string | null): string | null {
  if (!header) return null;
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}
