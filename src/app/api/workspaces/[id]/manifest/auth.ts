import "server-only";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { hashToken, parseBearer } from "@/lib/cli-tokens/token";

// Resolve viewer by bearer token. Fail-soft: returns null on any error so the
// endpoint never crashes (AC-11, BR7). Uses service-role because the request
// is headless/anonymous — session RLS cannot see the row by hash (ADR-076, A3).
async function resolveByToken(token: string): Promise<string | null> {
  try {
    const svc = createServiceClient();
    const hash = hashToken(token);

    const { data } = await svc
      .from("cli_tokens")
      .select("id, owner_id, expires_at, revoked_at")
      .eq("token_hash", hash)
      .maybeSingle();

    if (!data) return null;

    const row = data as {
      id: string;
      owner_id: string;
      expires_at: string | null;
      revoked_at: string | null;
    };

    // Validity check: revoked or past expiry → treat as no token (BR5, BR8).
    if (row.revoked_at !== null) return null;
    if (row.expires_at !== null && new Date(row.expires_at) <= new Date()) return null;

    // Best-effort last_used_at bump — update failure does not fail the request (AC-09).
    void Promise.resolve(
      svc.from("cli_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", row.id),
    ).catch(() => undefined);

    return row.owner_id;
  } catch {
    // Missing service key or absent cli_tokens table → anonymous fallback (AC-11).
    return null;
  }
}

// Resolve the viewer identity from a request. Priority: bearer token → session
// cookie → anonymous (ADR-077). The manifest handler's visibility gate and
// per-viewer projection are unchanged — only viewerId changes (BR6).
export async function resolveViewerId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  const token = parseBearer(authHeader);

  if (token !== null) {
    return resolveByToken(token);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
