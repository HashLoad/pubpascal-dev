import { createBrowserClient } from "@supabase/ssr";

// Placeholders used only when env vars are missing at build time (e.g. CI
// prerender of /_not-found). Any actual query made through such a client
// fails at request time, which the caller already handles.
const FALLBACK_URL = "https://placeholder.supabase.co";
const FALLBACK_KEY = "placeholder-anon-key";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY
  );
}
