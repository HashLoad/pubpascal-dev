-- Real usage signal: how many times a package's SBOM has been pulled. Nothing is
-- hosted for download here, so the legacy `downloads` stays 0 — but the SBOM IS
-- served (GET /api/.../sbom), so its pull count is a genuine, CRA-flavored
-- interest metric (who's auditing the supply chain). Incremented server-side via
-- a SECURITY DEFINER RPC callable only by the service role, so visitors can't
-- inflate it by hitting the function directly (mirrors increment_ad_clicks).

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS sbom_downloads INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_sbom_downloads(p_slug TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.packages
     SET sbom_downloads = sbom_downloads + 1
   WHERE slug = p_slug;
$$;

REVOKE ALL ON FUNCTION public.increment_sbom_downloads(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_sbom_downloads(TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
