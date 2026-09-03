-- packages.sponsorship_ends_at column — Epic 4 / Demand 2/3
--
-- Adds sponsorship_ends_at to packages so the webhook handler can record when
-- the current sponsorship period expires. Column is nullable (NULL = no active
-- sponsorship). IF NOT EXISTS guard ensures idempotent re-runs.

ALTER TABLE public.packages
    ADD COLUMN IF NOT EXISTS sponsorship_ends_at TIMESTAMP WITH TIME ZONE;
