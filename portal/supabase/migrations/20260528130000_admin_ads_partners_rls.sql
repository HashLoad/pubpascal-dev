-- Defensive RLS migration for admin CRUD over `ads` and `partners`.
--
-- The original schema (20260527184000_init_schema.sql) already grants admins
-- FOR ALL access via the policies "Admins have full access to ads" and
-- "Admins have full access to partners". This migration is idempotent and
-- only re-creates those policies if they happen to be missing in a given
-- environment, so Demand 3/4 (Epic 2/6) can never be deployed against a DB
-- where admin writes are silently blocked.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'ads'
          AND policyname = 'Admins have full access to ads'
    ) THEN
        CREATE POLICY "Admins have full access to ads"
            ON public.ads FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'partners'
          AND policyname = 'Admins have full access to partners'
    ) THEN
        CREATE POLICY "Admins have full access to partners"
            ON public.partners FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
                )
            );
    END IF;
END $$;
