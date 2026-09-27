import "server-only";
import { createClient } from "@/utils/supabase/server";
import type { CliTokenScope } from "@/lib/cli-tokens/token";

export type CliTokenListRow = {
  id: string;
  label: string | null;
  token_prefix: string;
  scope: CliTokenScope;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
};

// token_hash is intentionally excluded — plaintext is never re-displayed (BR3, AC-02).
const TOKEN_SELECT =
  "id, label, token_prefix, scope, created_at, updated_at, last_used_at, expires_at, revoked_at";

// Owner-scoped list. Fail-soft: returns [] if the cli_tokens migration is not yet
// applied or on any other error — graceful degradation (BR7, AC-11).
export async function getMyCliTokens(userId: string): Promise<CliTokenListRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cli_tokens")
    .select(TOKEN_SELECT)
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[cli_tokens] getMyCliTokens failed", error);
    return [];
  }
  return (data ?? []) as CliTokenListRow[];
}
