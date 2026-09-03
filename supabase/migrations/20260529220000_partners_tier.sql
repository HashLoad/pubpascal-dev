-- Epic 6/6 — Demand 1/2: add tier column to partners
-- Adds commercial tier classification; backfills existing rows to 'platinum'.

ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS tier text
  CONSTRAINT partners_tier_check CHECK (tier IN ('platinum', 'gold', 'silver', 'bronze'));

UPDATE public.partners SET tier = 'platinum' WHERE tier IS NULL;

CREATE INDEX IF NOT EXISTS partners_tier_idx ON public.partners (tier);
