// SBOM view types — the shape the package page's compliance panel + per-version
// affordance render. The SBOM itself is no longer stored in our database: it is
// classified LIVE from the repo on every render (see @/lib/sbom/repo-sbom).
// These types are all that survives that move.

export type SbomFormat = "cyclonedx" | "spdx";

// SBOM metadata without the (potentially large) document — what the package
// page's compliance panel surfaces: format, spec version, the attesting
// author/tool, and when it was published.
export type PackageSbomMeta = {
  format: SbomFormat;
  spec_version: string | null;
  author: string | null;
  created_at: string | null;
  updated_at: string | null;
};
