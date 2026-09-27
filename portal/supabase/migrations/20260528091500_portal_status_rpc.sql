-- Public status page aggregator for Demand 1/2 of Epic 1 (v2 roadmap).
-- One SECURITY DEFINER function returns four aggregate INTEGER counts so anon
-- can query without per-table RLS. Body is a single SELECT — no dynamic SQL.

CREATE OR REPLACE FUNCTION public.get_portal_status_metrics()
RETURNS TABLE (
    active_count INTEGER,
    submissions_7d INTEGER,
    validated_7d INTEGER,
    pending_count INTEGER
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT
        (SELECT COUNT(*)::INTEGER FROM public.packages WHERE status = 'active') AS active_count,
        (SELECT COUNT(*)::INTEGER FROM public.packages WHERE created_at >= now() - interval '7 days') AS submissions_7d,
        (SELECT COUNT(*)::INTEGER FROM public.packages WHERE status = 'active' AND updated_at >= now() - interval '7 days') AS validated_7d,
        (SELECT COUNT(*)::INTEGER FROM public.packages WHERE status = 'pending') AS pending_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_portal_status_metrics() TO anon, authenticated;
