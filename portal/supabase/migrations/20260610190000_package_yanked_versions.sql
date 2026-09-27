-- Version yank: a publisher can mark specific released versions as yanked
-- (withdrawn — buggy, insecure, or published by mistake). Yanked versions stay
-- visible for transparency but are flagged so adopters avoid them. Stored as the
-- list of yanked version strings; empty array = nothing yanked.

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS yanked_versions TEXT[] NOT NULL DEFAULT '{}';

-- Refresh PostgREST's schema cache so the new column is queryable immediately.
NOTIFY pgrst, 'reload schema';
