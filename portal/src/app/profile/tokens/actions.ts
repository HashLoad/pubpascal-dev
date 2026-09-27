"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isUuid } from "@/utils/queries/admin-submissions";
import { getRequestLocale } from "@/utils/locale";
import { getDictionary } from "@/app/[lang]/dictionaries";
import { generateToken } from "@/lib/cli-tokens/token";
import { checkRateLimit, tokensUserKey } from "@/lib/rate-limit";

export type TokenFormState = { error?: string; plaintext?: string };
export type RevokeFormState = { error?: string };

const LABEL_MAX = 120;

// Generate a new CLI token. Owner-id stamped server-side; plaintext returned
// exactly once in the action state (BR3, AC-01/02).
export async function createCliToken(
  _prev: TokenFormState,
  formData: FormData,
): Promise<TokenFormState> {
  const dict = (await getDictionary(await getRequestLocale())).tokens;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile/tokens");

  // Per-user create throttle before any DB write (AC-05). Fail-open (BR3).
  const rate = await checkRateLimit("tokens-create", tokensUserKey(user.id));
  if (!rate.ok) return { error: dict.errors.rateLimited };

  const labelRaw = String(formData.get("label") ?? "").trim();
  const label = labelRaw.length > 0 ? labelRaw : null;
  if (label !== null && label.length > LABEL_MAX) {
    return { error: dict.errors.labelTooLong };
  }

  const expiresAtRaw = String(formData.get("expires_at") ?? "").trim();
  let expiresAt: string | null = null;
  if (expiresAtRaw.length > 0) {
    const parsed = new Date(expiresAtRaw);
    if (isNaN(parsed.getTime())) return { error: dict.errors.expiresAtInvalid };
    if (parsed <= new Date()) return { error: dict.errors.expiresAtPast };
    expiresAt = parsed.toISOString();
  }

  const { plaintext, prefix, hash } = generateToken();

  const { error } = await supabase.from("cli_tokens").insert({
    owner_id: user.id,
    label,
    scope: "manifest:read",
    token_prefix: prefix,
    token_hash: hash,
    expires_at: expiresAt,
  });

  if (error) {
    console.warn("[cli_tokens] createCliToken failed", error);
    return { error: dict.errors.saveFailed };
  }

  revalidatePath("/profile/tokens");
  return { plaintext };
}

// Revoke a token: sets revoked_at; owner-scoped (BR4). A foreign/unknown id
// matches no row — safe no-op (AC-04).
export async function revokeCliToken(
  _prev: RevokeFormState,
  formData: FormData,
): Promise<RevokeFormState> {
  const dict = (await getDictionary(await getRequestLocale())).tokens;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/profile/tokens");

  // Per-user revoke throttle before any DB write (AC-05). Fail-open (BR3).
  const rate = await checkRateLimit("tokens-revoke", tokensUserKey(user.id));
  if (!rate.ok) return { error: dict.errors.rateLimited };

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { error: dict.errors.revokeFailed };

  const { error } = await supabase
    .from("cli_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    console.warn("[cli_tokens] revokeCliToken failed", error);
    return { error: dict.errors.revokeFailed };
  }

  revalidatePath("/profile/tokens");
  return {};
}
