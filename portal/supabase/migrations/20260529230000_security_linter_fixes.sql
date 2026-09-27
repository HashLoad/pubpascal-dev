-- Security linter fixes (Supabase database linter)
-- Run in the Supabase SQL Editor (or via `supabase db push`).

-- 1. function_search_path_mutable — pin a non-mutable search_path on the trigger
--    functions. Both bodies already schema-qualify every object, so '' is safe.
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.handle_updated_at() SET search_path = '';

-- 2. SECURITY DEFINER functions exposed as RPC — the trigger functions are not
--    meant to be called directly through PostgREST. Revoke EXECUTE from the API
--    roles (triggers still fire; they don't rely on these grants).
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM anon, authenticated, public;

-- 3. public_bucket_allows_listing — a public bucket serves object URLs without a
--    SELECT policy, so the broad SELECT policy only enabled listing every file.
--    Drop it; uploads keep working via the INSERT/UPDATE policies, and avatars
--    still display through their public URL.
DROP POLICY IF EXISTS "avatars públicos para leitura" ON storage.objects;

-- NOTE — left intentionally PUBLIC (by design, not fixed here):
--   • get_portal_status_metrics()  — read-only aggregate behind /portal-status
--   • increment_ad_clicks(uuid)    — anon ad-click tracking
--   • increment_ad_impressions(uuid) — anon ad-impression tracking
-- These are meant to be callable by anon; the linter WARN is expected.
