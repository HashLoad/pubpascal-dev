-- Drop the orphaned DB-backed SBOM storage. The SBOM is no longer stored in our
-- database: it is now classified LIVE from the repo on every package-detail
-- render (see src/lib/sbom/repo-sbom.ts), self-correcting and fail-soft. With the
-- upload route, the read helpers, and the per-version download endpoint all gone,
-- these objects are dead:
--   * public.package_version_sbom — the 1:1 satellite table (was 20260609000000)
--   * public.packages.sbom_downloads — the pull-count column (was 20260610210000)
--   * public.increment_sbom_downloads(text) — its SECURITY DEFINER incrementer
-- The Download affordance now points straight at the repo's raw SBOM file, so
-- nothing reads the count and nothing increments it.

DROP TABLE IF EXISTS public.package_version_sbom;

ALTER TABLE public.packages DROP COLUMN IF EXISTS sbom_downloads;

DROP FUNCTION IF EXISTS public.increment_sbom_downloads(text);

NOTIFY pgrst, 'reload schema';
