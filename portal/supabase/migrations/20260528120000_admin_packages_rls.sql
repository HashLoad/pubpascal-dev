-- Admin UPDATE policy for packages — Epic 2 / Demand 2/4.
-- Apply via Supabase Studio or `supabase db push` (CI does not run migrations).
--
-- Adds a second UPDATE policy granting admins (profiles.role = 'admin')
-- mutation rights over any package row, so the /admin/submissions queue can
-- moderate (status) and tune commercial highlight_level for packages they do
-- not own. The original owner UPDATE policy
-- ("Publishers can update their own packages") stays intact.

CREATE POLICY "packages_admin_update"
    ON public.packages FOR UPDATE
    TO authenticated
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
