-- Package funding: an optional sponsor/funding URL (GitHub Sponsors, Open
-- Collective, Patreon, etc.) so adopters can support the maintainer. Surfaced as
-- a "Sponsor" link on the package page. NULL = no funding link.

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS funding_url TEXT;

-- Refresh PostgREST's schema cache so the new column is queryable immediately.
NOTIFY pgrst, 'reload schema';
