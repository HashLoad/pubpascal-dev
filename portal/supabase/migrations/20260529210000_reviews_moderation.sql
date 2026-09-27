-- Reviews moderation — Epic 5 / Demand 3/3.
-- ADR-025: ban flag on profiles; SECURITY DEFINER function for the public
-- flagged-count placeholder; admin UPDATE policy on profiles (so admins can
-- ban/unban any user without a service-role client). Admin flag/unflag/delete
-- on package_reviews is already covered by the "Admins have full access to
-- reviews" FOR ALL policy from Demand 1/3.

-- 1. Ban flag — DEFAULT false NOT NULL so existing rows are unaffected.
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_banned_from_reviews BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Admin UPDATE policy on profiles — allows an admin to update any profile row
-- (e.g. toggling is_banned_from_reviews). The pre-existing owner-only UPDATE
-- policy from init_schema remains; PostgreSQL ORs permissive policies together.
CREATE POLICY "Admins can update any profile"
    ON public.profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- 3. Flagged-review count for the public detail page. SECURITY DEFINER bypasses
-- the "Public can view non-flagged reviews" RLS so anon can read only the count
-- (never the flagged content). Returns 0 for packages with no flagged reviews.
CREATE OR REPLACE FUNCTION public.get_flagged_review_count(p_package_id UUID)
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)
    FROM public.package_reviews
    WHERE package_id = p_package_id AND is_flagged = TRUE;
$$;

GRANT EXECUTE ON FUNCTION public.get_flagged_review_count(UUID) TO anon, authenticated;
