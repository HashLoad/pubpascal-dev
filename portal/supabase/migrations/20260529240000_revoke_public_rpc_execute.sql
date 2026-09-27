-- Lock down the SECURITY DEFINER counter/metrics RPCs: they are now called only
-- server-side via the service-role client, so revoke EXECUTE from the API roles.
-- This also closes a real abuse vector — previously any visitor could call
-- /rest/v1/rpc/increment_ad_clicks (or _impressions) directly and inflate ad metrics.
-- Run in the Supabase SQL Editor (or via `supabase db push`).

REVOKE EXECUTE ON FUNCTION public.get_portal_status_metrics() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.increment_ad_clicks(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.increment_ad_impressions(uuid) FROM anon, authenticated, public;
