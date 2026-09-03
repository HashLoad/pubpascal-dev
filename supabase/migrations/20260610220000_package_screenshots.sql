-- Package screenshots: an optional ordered list of image URLs shown as a gallery
-- on the package page. Useful for visual packages (VCL/FMX UI components, IDE
-- tools). URLs are constrained app-side to *.githubusercontent.com so they pass
-- the existing img-src CSP (repo-hosted images) and can't load arbitrary hosts.

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS screenshots TEXT[] NOT NULL DEFAULT '{}';

-- Refresh PostgREST's schema cache so the new column is queryable immediately.
NOTIFY pgrst, 'reload schema';
