import { cache } from "react";
import { createClient } from "@/utils/supabase/server";
import type { ValidationReport } from "@/utils/pubPoints";

export type PackageDetail = {
  id: string;
  publisher_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  repository_url: string | null;
  license_type: string | null;
  license_name: string | null;
  website_url: string | null;
  highlight_level: "gold" | "silver" | "bronze" | "none" | null;
  platforms: string[] | null;
  languages: string[] | null;
  categories: string[] | null;
  stars: number | null;
  downloads: number | null;
  score: number | null;
  validation_report: ValidationReport | null;
  deprecated_message: string | null;
  funding_url: string | null;
  yanked_versions: string[] | null;
  screenshots: string[] | null;
  created_at: string | null;
  updated_at: string | null;
};

export type PackageVersion = {
  id: string;
  version: string;
  release_notes: string | null;
  download_url: string | null;
  created_at: string | null;
};

export type PackageDetailResult = {
  pkg: PackageDetail;
  versions: PackageVersion[];
  publisherUsername: string | null;
};

const PACKAGE_SELECT =
  "id, publisher_id, name, slug, description, repository_url, license_type, license_name, website_url, highlight_level, platforms, languages, categories, stars, downloads, score, validation_report, deprecated_message, funding_url, yanked_versions, screenshots, created_at, updated_at";

async function loadUncached(slug: string): Promise<PackageDetailResult | null> {
  try {
    const supabase = await createClient();

    const { data: pkgRow, error: pkgError } = await supabase
      .from("packages")
      .select(PACKAGE_SELECT)
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();

    if (pkgError) {
      console.warn("[/packages/[slug]] supabase package query failed", pkgError);
      return null;
    }
    if (!pkgRow) return null;

    const pkg = pkgRow as PackageDetail;

    const [versionsResult, publisherResult] = await Promise.all([
      supabase
        .from("package_versions")
        .select("id, version, release_notes, download_url, created_at")
        .eq("package_id", pkg.id)
        .order("created_at", { ascending: false }),
      pkg.publisher_id
        ? supabase
            .from("profiles")
            .select("username, full_name")
            .eq("id", pkg.publisher_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (versionsResult.error) {
      console.warn(
        "[/packages/[slug]] supabase versions query failed",
        versionsResult.error,
      );
    }

    return {
      pkg,
      versions: (versionsResult.data ?? []) as PackageVersion[],
      publisherUsername: ((p) => p?.full_name || p?.username || null)(
        publisherResult.data as { username: string | null; full_name: string | null } | null,
      ),
    };
  } catch (err) {
    console.warn("[/packages/[slug]] supabase client failed", err);
    return null;
  }
}

export const loadPackageBySlug = cache(loadUncached);
