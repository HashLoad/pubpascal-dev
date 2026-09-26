-- Lock down get_flagged_review_count (Supabase linter 0028/0029).
--
-- The flagged-review count is now computed server-side via the service-role
-- client (utils/queries/reviews.ts), so this SECURITY DEFINER function no longer
-- needs to be reachable by anon / authenticated through /rest/v1/rpc. Revoke
-- public EXECUTE; keep it for service_role (which bypasses RLS to count the
-- flagged/hidden reviews). Idempotent.
REVOKE EXECUTE ON FUNCTION public.get_flagged_review_count(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_flagged_review_count(uuid) TO service_role;
