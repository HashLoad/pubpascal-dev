-- Public partner application form support — Epic 3 / Demand 3/3.
--
-- An application is a `partners` row in the new `applied` state. This migration:
--   1. adds nullable `cnpj` and `area` columns,
--   2. extends the status CHECK to allow `applied`,
--   3. adds a public INSERT policy restricted to `status = 'applied'`
--      (applicants cannot self-activate; admins moderate via the existing UI).

-- 1. Additive columns (idempotent).
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS area TEXT;

-- 2. Extend the status CHECK to include `applied`.
-- The original constraint is named `partners_status_check` by Postgres convention.
ALTER TABLE public.partners DROP CONSTRAINT IF EXISTS partners_status_check;
ALTER TABLE public.partners
    ADD CONSTRAINT partners_status_check
    CHECK (status IN ('active', 'inactive', 'applied'));

-- 3. Public INSERT policy — anyone may submit an application, but only as
-- `status = 'applied'`. Existing admin `FOR ALL` governs update/delete; public
-- SELECT remains active-only, so applied rows are not publicly visible.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'partners'
          AND policyname = 'Anyone can submit a partner application'
    ) THEN
        CREATE POLICY "Anyone can submit a partner application"
            ON public.partners FOR INSERT
            WITH CHECK (status = 'applied');
    END IF;
END $$;
