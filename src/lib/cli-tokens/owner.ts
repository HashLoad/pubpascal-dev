import "server-only";
import { createServiceClient } from "@/utils/supabase/service";
import { hashToken } from "./token";

// Resolve a cli_tokens bearer to its owner id. Service-role by-hash lookup,
// rejecting revoked/expired tokens. Returns null on any failure (missing service
// key, absent table, no match, transport error) so callers map cleanly to 401.
// Shared by every headless write endpoint (SBOM upload, package upload, ...).
export async function resolveCliTokenOwner(token: string): Promise<string | null> {
  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from("cli_tokens")
      .select("id, owner_id, expires_at, revoked_at")
      .eq("token_hash", hashToken(token))
      .maybeSingle();
    if (!data) return null;

    const row = data as {
      id: string;
      owner_id: string;
      expires_at: string | null;
      revoked_at: string | null;
    };
    if (row.revoked_at !== null) return null;
    if (row.expires_at !== null && new Date(row.expires_at) <= new Date()) return null;

    // Best-effort last_used_at bump — failure never fails the request.
    void Promise.resolve(
      svc.from("cli_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", row.id),
    ).catch(() => undefined);

    return row.owner_id;
  } catch {
    return null;
  }
}
