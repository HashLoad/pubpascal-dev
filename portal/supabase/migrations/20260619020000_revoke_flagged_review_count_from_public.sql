-- Revoke the DEFAULT PUBLIC EXECUTE on get_flagged_review_count.
--
-- Postgres grants EXECUTE to PUBLIC on function creation, so the prior REVOKE
-- FROM anon/authenticated still left anon able to call it via the PUBLIC grant
-- (Supabase linter 0028/0029). Revoke PUBLIC and keep it for service_role only
-- (the flagged count is computed with the service-role client). Idempotent.
REVOKE EXECUTE ON FUNCTION public.get_flagged_review_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_flagged_review_count(uuid) TO service_role;
