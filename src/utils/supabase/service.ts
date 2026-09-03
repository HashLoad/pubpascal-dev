// Server-only — do NOT import from client components.
// Service-role Supabase client factory. Bypasses RLS for server-side operations
// that have no user session context (e.g. webhook handlers). ADR-021.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing required env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createSupabaseClient(url, key);
}
