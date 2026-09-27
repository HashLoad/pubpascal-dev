"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { isUuid } from "@/utils/queries/admin-submissions";
import { upsertCuratedTabContent } from "@/utils/queries/tab-content";
import { getRequestLocale } from "@/utils/locale";
import { getDictionary, type Dictionary } from "@/app/[lang]/dictionaries";
import {
  isEditableLicenseType,
  PLATFORM_ALLOWLIST,
  LANGUAGE_ALLOWLIST,
  CATEGORY_ALLOWLIST,
  type EditableLicenseType,
} from "@/utils/queries/publisher-packages-types";

export type EditFormState = { error?: string };

type DashboardErrors = Dictionary["dashboard"]["errors"];

const HTTPS_URL_REGEX = /^https:\/\/.+/i;
const CONTROL_CHARS = /[\x00-\x08\x0B-\x1F]/g;
const CURATED_MAX = 8000;
const DEPRECATION_MAX = 280;
const SCREENSHOTS_MAX = 10;
// Screenshots must be repo-hosted on *.githubusercontent.com so they satisfy the
// existing img-src CSP (and can't point at arbitrary hosts).
const GITHUB_IMAGE_REGEX = /^https:\/\/([a-z0-9-]+\.)?githubusercontent\.com\/\S+$/i;

type EditablePayload = {
  description: string;
  website_url: string | null;
  license_type: EditableLicenseType;
  license_name: string;
  platforms: string[];
  languages: string[];
  categories: string[];
  deprecated_message: string | null;
  funding_url: string | null;
  yanked_versions: string[];
  screenshots: string[];
};

type Curated = { example: string | null; installing: string | null };

type ValidationError = { error: string };
type EditableResult = EditablePayload | ValidationError;

function checkDescription(value: string, msgs: DashboardErrors): string | null {
  if (value.length < 20 || value.length > 2000) {
    return msgs.description;
  }
  return null;
}

function checkWebsite(value: string, msgs: DashboardErrors): string | null {
  if (value && !HTTPS_URL_REGEX.test(value)) {
    return msgs.website;
  }
  return null;
}

function checkLicense(type: string, name: string, msgs: DashboardErrors): string | null {
  if (!isEditableLicenseType(type)) {
    return msgs.licenseType;
  }
  if (!name || name.length > 60) {
    return msgs.licenseName;
  }
  return null;
}

function checkTaxonomy(
  values: string[],
  allowlist: readonly string[],
  emptyError: string,
): string | null {
  if (values.length === 0 || values.some((v) => !allowlist.includes(v))) {
    return emptyError;
  }
  return null;
}

// Optional curated tab field: strip control chars, enforce max length.
function cleanCuratedField(value: string, maxError: string): { value: string | null; error: string | null } {
  const cleaned = value.replace(CONTROL_CHARS, "").trim();
  if (cleaned.length > CURATED_MAX) {
    return { value: null, error: maxError };
  }
  return { value: cleaned.length > 0 ? cleaned : null, error: null };
}

// Reads + validates both curated tab fields. Kept out of validateEditable to hold its CCN down.
function readCurated(formData: FormData, msgs: DashboardErrors): Curated | ValidationError {
  const example = cleanCuratedField(String(formData.get("example") ?? ""), msgs.curatedMax);
  if (example.error) return { error: example.error };
  const installing = cleanCuratedField(String(formData.get("installing") ?? ""), msgs.curatedMax);
  if (installing.error) return { error: installing.error };
  return { example: example.value, installing: installing.value };
}

function validateEditable(formData: FormData, msgs: DashboardErrors): EditableResult {
  const description = String(formData.get("description") ?? "")
    .replace(CONTROL_CHARS, "")
    .trim();
  const websiteUrl = String(formData.get("website_url") ?? "").trim();
  const fundingUrl = String(formData.get("funding_url") ?? "").trim();
  const licenseType = String(formData.get("license_type") ?? "").trim();
  const licenseName = String(formData.get("license_name") ?? "").trim();
  const platforms = formData
    .getAll("platforms")
    .filter((v): v is string => typeof v === "string");
  const languages = formData
    .getAll("languages")
    .filter((v): v is string => typeof v === "string");
  const categories = formData
    .getAll("categories")
    .filter((v): v is string => typeof v === "string");
  const deprecatedMessage = String(formData.get("deprecated_message") ?? "")
    .replace(CONTROL_CHARS, "")
    .trim();
  // Yanked versions: free-text, one per line (or comma-separated). Normalize to a
  // deduped, bounded list of version strings.
  const yankedVersions = Array.from(
    new Set(
      String(formData.get("yanked_versions") ?? "")
        .split(/[\n,]/)
        .map((s) => s.replace(CONTROL_CHARS, "").trim())
        .filter((s) => s.length > 0 && s.length <= 80),
    ),
  ).slice(0, 100);
  const screenshots = Array.from(
    new Set(
      String(formData.get("screenshots") ?? "")
        .split("\n")
        .map((s) => s.replace(CONTROL_CHARS, "").trim())
        .filter((s) => s.length > 0),
    ),
  ).slice(0, SCREENSHOTS_MAX);

  const error =
    checkDescription(description, msgs) ??
    checkWebsite(websiteUrl, msgs) ??
    checkLicense(licenseType, licenseName, msgs) ??
    checkTaxonomy(platforms, PLATFORM_ALLOWLIST, msgs.platforms) ??
    checkTaxonomy(languages, LANGUAGE_ALLOWLIST, msgs.languages) ??
    checkTaxonomy(categories, CATEGORY_ALLOWLIST, msgs.categories) ??
    (fundingUrl && !HTTPS_URL_REGEX.test(fundingUrl) ? msgs.funding : null) ??
    (screenshots.some((s) => !GITHUB_IMAGE_REGEX.test(s)) ? msgs.screenshots : null) ??
    (deprecatedMessage.length > DEPRECATION_MAX ? msgs.deprecated : null);
  if (error) return { error };

  return {
    description,
    website_url: websiteUrl.length > 0 ? websiteUrl : null,
    license_type: licenseType as EditableLicenseType,
    license_name: licenseName,
    platforms,
    languages,
    categories,
    deprecated_message: deprecatedMessage.length > 0 ? deprecatedMessage : null,
    funding_url: fundingUrl.length > 0 ? fundingUrl : null,
    yanked_versions: yankedVersions,
    screenshots,
  };
}

// Owner-scoped publisher display-name write (ADR-037). Blank is filtered by the
// caller (no clobber). Best-effort — RLS re-checks ownership; a failure here does
// not roll back the package update.
async function applyPublisherName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  name: string,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: name })
    .eq("id", userId);
  if (error) console.warn("[dashboard] publisher name update failed", error);
}

export async function updateMyPackage(
  _prev: EditFormState,
  formData: FormData,
): Promise<EditFormState> {
  const msgs = (await getDictionary(await getRequestLocale())).dashboard.errors;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { error: msgs.id };

  // Global publisher display name (ADR-037): optional, bounded, blank = no-op.
  const publisherName = String(formData.get("publisher_name") ?? "").trim();
  if (publisherName.length > 60) return { error: msgs.publisherName };

  const result = validateEditable(formData, msgs);
  if ("error" in result) return { error: result.error };

  const curated = readCurated(formData, msgs);
  if ("error" in curated) return { error: curated.error };

  const { error } = await supabase
    .from("packages")
    .update(result)
    .eq("id", id)
    .eq("publisher_id", user.id);

  if (error) {
    console.warn("[dashboard] update failed", error);
    return { error: msgs.saveFailed };
  }

  // Blank leaves the existing profile name untouched (ADR-037, no clobber).
  if (publisherName) await applyPublisherName(supabase, user.id, publisherName);

  // Owner already verified by the scoped package update above. Best-effort upsert —
  // RLS re-checks ownership; a failure here does not roll back the package update (ADR-035).
  await upsertCuratedTabContent(id, {
    example: curated.example,
    installing: curated.installing,
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

// Soft delete / restore — owner-scoped status flip. 'deleted' hides the package
// from every public read (they all filter status='active'); it stays in the
// owner's dashboard, flagged, and can be restored. Restore returns it to active.
async function setMyPackageStatus(
  formData: FormData,
  status: "deleted" | "active",
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) redirect("/dashboard");

  await supabase
    .from("packages")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("publisher_id", user.id);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deleteMyPackage(formData: FormData): Promise<void> {
  await setMyPackageStatus(formData, "deleted");
}

export async function restoreMyPackage(formData: FormData): Promise<void> {
  await setMyPackageStatus(formData, "active");
}
