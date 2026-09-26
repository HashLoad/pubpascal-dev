import {
  PLATFORM_ALLOWLIST,
  LANGUAGE_ALLOWLIST,
  CATEGORY_ALLOWLIST,
} from "@/app/[lang]/packages/searchParams";

export const EDITABLE_LICENSE_TYPES = ["open_source", "commercial"] as const;
export type EditableLicenseType = (typeof EDITABLE_LICENSE_TYPES)[number];

export { PLATFORM_ALLOWLIST, LANGUAGE_ALLOWLIST, CATEGORY_ALLOWLIST };

export type MyPackageRow = {
  id: string;
  name: string;
  slug: string;
  status: "pending" | "validating" | "active" | "rejected" | "deleted";
  highlight_level: "none" | "bronze" | "silver" | "gold";
  validation_report: unknown;
  description: string | null;
  license_type: string | null;
  license_name: string | null;
  platforms: string[] | null;
  languages: string[] | null;
  categories: string[] | null;
  stars: number | null;
  downloads: number | null;
  score: number | null;
  deprecated_message: string | null;
  created_at: string;
  updated_at: string;
};

export type MyPackageEditable = {
  id: string;
  name: string;
  slug: string;
  repository_url: string;
  description: string | null;
  website_url: string | null;
  funding_url: string | null;
  screenshots: string[];
  license_type: EditableLicenseType;
  license_name: string;
  platforms: string[];
  languages: string[];
  categories: string[];
  status: MyPackageRow["status"];
  highlight_level: MyPackageRow["highlight_level"];
  // Deprecation notice (null = not deprecated). Set/cleared here; surfaced as a
  // banner on the public detail page.
  deprecated_message: string | null;
  // Versions the publisher has yanked (withdrawn). Empty = none. Flagged on the
  // Versions tab.
  yanked_versions: string[];
  // Curated tab content (satellite table, ADR-035) — read separately from the
  // `packages` row, never part of the `getMyPackageById` column list.
  example: string | null;
  installing: string | null;
  // Owner's global publisher display name (`profiles.full_name`), read separately
  // from the package row. Editable here; blank save preserves the existing value (ADR-037).
  publisher_display_name: string | null;
};

export function isEditableLicenseType(
  value: string,
): value is EditableLicenseType {
  return (EDITABLE_LICENSE_TYPES as readonly string[]).includes(value);
}
