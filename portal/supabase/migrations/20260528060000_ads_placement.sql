-- ads.placement column + secure increment RPCs for Demand 4/4 — 1/2.

-- 1. Column with CHECK constraint and default. Idempotent.
ALTER TABLE public.ads
    ADD COLUMN IF NOT EXISTS placement TEXT NOT NULL DEFAULT 'hero'
        CHECK (placement IN ('hero', 'sidebar', 'inline'));

-- 2. Composite index supporting the eligibility query.
CREATE INDEX IF NOT EXISTS ads_placement_status_idx
    ON public.ads (placement, status);

-- 3. SECURITY DEFINER RPC: increment click counter for a single ad.
CREATE OR REPLACE FUNCTION public.increment_ad_clicks(ad_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    UPDATE public.ads SET clicks = clicks + 1 WHERE id = ad_id;
$$;

-- 4. SECURITY DEFINER RPC: increment impression counter for a single ad.
CREATE OR REPLACE FUNCTION public.increment_ad_impressions(ad_id UUID)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    UPDATE public.ads SET impressions = impressions + 1 WHERE id = ad_id;
$$;

-- 5. Grant execute to public roles so the route handler (and AdSlot impression
-- fire-and-forget) can call them via the anon / authenticated Supabase clients.
GRANT EXECUTE ON FUNCTION public.increment_ad_clicks(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ad_impressions(UUID) TO anon, authenticated;
