-- Package deprecation: a publisher can mark a package deprecated with a short
-- message. A deprecated package stays active and visible (deprecation is not
-- rejection or deletion) — the UI surfaces a banner steering adopters toward a
-- successor or away from an end-of-life package. NULL = not deprecated.

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS deprecated_message TEXT;

-- Refresh PostgREST's schema cache so the new column is queryable immediately.
NOTIFY pgrst, 'reload schema';
