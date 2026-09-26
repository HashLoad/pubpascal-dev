-- Package categories — a curated taxonomy for catalog discovery (backlog #3).
--
-- Additive + defaulted: every existing row gets '{}', so reads never break and
-- the change is reversible (DROP COLUMN). Filtered with array `contains`, exactly
-- like the existing `platforms` / `languages` arrays — no new table, and the
-- `packages` RLS already governs the row, so no new policy is needed.

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS categories TEXT[] NOT NULL DEFAULT '{}';

-- GIN index so the array-contains category filter stays index-backed at scale.
CREATE INDEX IF NOT EXISTS idx_packages_categories
  ON public.packages USING GIN (categories);

-- Reload PostgREST's schema cache so the new column is queryable immediately
-- (works over the direct connection a migration push uses, unlike the pooler).
NOTIFY pgrst, 'reload schema';
