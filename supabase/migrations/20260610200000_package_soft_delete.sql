-- Soft delete: a publisher can remove a package without destroying the row
-- (audit, recovery, and so the slug isn't silently reused). Modeled as a new
-- terminal status value 'deleted' — every public read already filters
-- status = 'active', so a deleted package disappears from the catalog, detail
-- page, sitemap, and home without touching those queries. The row stays visible
-- in the owner's dashboard (flagged) and can be restored.

ALTER TABLE public.packages DROP CONSTRAINT IF EXISTS packages_status_check;
ALTER TABLE public.packages
  ADD CONSTRAINT packages_status_check
  CHECK (status IN ('pending', 'validating', 'active', 'rejected', 'deleted'));

NOTIFY pgrst, 'reload schema';
