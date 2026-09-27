"use server";

import { createClient } from "@/utils/supabase/server";
import { deriveSlug, isValidSlug } from "@/lib/slug";
import { upsertCuratedTabContent } from "@/utils/queries/tab-content";
import { upsertPublishValidation } from "@/utils/queries/publish-validation";
import {
  runPublishValidation,
  isPublishValidationEnforced,
  type PublishValidationReport,
} from "@/lib/publish-validation";
import { fetchGithubRaw } from "@/app/[lang]/packages/[slug]/github";
import { getRequestLocale } from "@/utils/locale";
import { getDictionary, type Dictionary } from "@/app/[lang]/dictionaries";
import {
  PLATFORM_ALLOWLIST,
  LANGUAGE_ALLOWLIST,
  CATEGORY_ALLOWLIST,
} from "@/app/[lang]/packages/searchParams";
import { checkRateLimit, publishUserKey } from "@/lib/rate-limit";

type PublishErrors = Dictionary["publish"]["errors"];

const REPO_HOST_REGEX = /^https:\/\/(?:github\.com|gitlab\.com|bitbucket\.org)\/.+/i;
const HTTPS_URL_REGEX = /^https:\/\/.+/i;
const CONTROL_CHARS = /[\x00-\x08\x0B-\x1F]/g;
const CURATED_MAX = 8000;

const LICENSE_TYPES = ["open_source", "commercial"] as const;
type LicenseType = (typeof LICENSE_TYPES)[number];

export type SubmittedValues = {
  name: string;
  publisher_name: string;
  description: string;
  repository_url: string;
  license_type: string;
  license_name: string;
  website_url: string;
  platforms: string[];
  languages: string[];
  categories: string[];
  example: string;
  installing: string;
};

export type SubmitState =
  | { status: "idle" }
  | { status: "success"; slug: string; validation?: PublishValidationReport | null }
  | { status: "unauthorized" }
  | {
      status: "invalid";
      errors: Record<string, string>;
      values: SubmittedValues;
    }
  | { status: "db_error"; message: string; values: SubmittedValues };

function getString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getAll(formData: FormData, key: string): string[] {
  return formData.getAll(key).filter((v): v is string => typeof v === "string");
}

function readValues(formData: FormData): SubmittedValues {
  return {
    name: getString(formData, "name"),
    publisher_name: getString(formData, "publisher_name"),
    description: getString(formData, "description"),
    repository_url: getString(formData, "repository_url"),
    license_type: getString(formData, "license_type"),
    license_name: getString(formData, "license_name"),
    website_url: getString(formData, "website_url"),
    platforms: getAll(formData, "platforms"),
    languages: getAll(formData, "languages"),
    categories: getAll(formData, "categories"),
    example: getString(formData, "example"),
    installing: getString(formData, "installing"),
  };
}

// Optional curated tab field: strip control chars, enforce max length.
// Returns the cleaned string (null when empty) plus an optional field error.
function cleanCurated(value: string, maxError: string): { value: string | null; error: string | null } {
  const cleaned = value.replace(CONTROL_CHARS, "");
  if (cleaned.length > CURATED_MAX) {
    return { value: null, error: maxError };
  }
  return { value: cleaned.length > 0 ? cleaned : null, error: null };
}

function validate(values: SubmittedValues, msgs: PublishErrors): {
  errors: Record<string, string>;
  cleaned: {
    name: string;
    publisher_name: string;
    description: string;
    repository_url: string;
    license_type: LicenseType;
    license_name: string;
    website_url: string | null;
    platforms: string[];
    languages: string[];
    categories: string[];
    slug: string;
    example: string | null;
    installing: string | null;
  } | null;
} {
  const errors: Record<string, string> = {};

  if (values.name.length < 3 || values.name.length > 80) {
    errors.name = msgs.name;
  }

  // Publisher display name is optional; only bounded when provided.
  if (values.publisher_name && values.publisher_name.length > 60) {
    errors.publisher_name = msgs.publisherName;
  }

  const cleanDescription = values.description.replace(CONTROL_CHARS, "");
  if (cleanDescription.length < 20 || cleanDescription.length > 2000) {
    errors.description = msgs.description;
  }

  if (!values.repository_url) {
    errors.repository_url = msgs.repositoryRequired;
  } else if (!REPO_HOST_REGEX.test(values.repository_url)) {
    errors.repository_url = msgs.repositoryInvalid;
  }

  if (!(LICENSE_TYPES as readonly string[]).includes(values.license_type)) {
    errors.license_type = msgs.licenseType;
  }

  if (!values.license_name) {
    errors.license_name = msgs.licenseNameRequired;
  } else if (values.license_name.length > 60) {
    errors.license_name = msgs.licenseNameLength;
  }

  if (values.website_url && !HTTPS_URL_REGEX.test(values.website_url)) {
    errors.website_url = msgs.website;
  }

  if (values.platforms.length === 0) {
    errors.platforms = msgs.platformsRequired;
  } else if (
    values.platforms.some((p) => !(PLATFORM_ALLOWLIST as readonly string[]).includes(p))
  ) {
    errors.platforms = msgs.platformsInvalid;
  }

  if (values.languages.length === 0) {
    errors.languages = msgs.languagesRequired;
  } else if (
    values.languages.some((l) => !(LANGUAGE_ALLOWLIST as readonly string[]).includes(l))
  ) {
    errors.languages = msgs.languagesInvalid;
  }

  if (values.categories.length === 0) {
    errors.categories = msgs.categoriesRequired;
  } else if (
    values.categories.some((c) => !(CATEGORY_ALLOWLIST as readonly string[]).includes(c))
  ) {
    errors.categories = msgs.categoriesInvalid;
  }

  const example = cleanCurated(values.example, msgs.curatedMax);
  if (example.error) errors.example = example.error;

  const installing = cleanCurated(values.installing, msgs.curatedMax);
  if (installing.error) errors.installing = installing.error;

  let slug = "";
  if (!errors.name) {
    slug = deriveSlug(values.name);
    if (!isValidSlug(slug)) {
      errors.name = msgs.nameSlug;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors, cleaned: null };
  }

  return {
    errors,
    cleaned: {
      name: values.name,
      publisher_name: values.publisher_name,
      description: cleanDescription,
      repository_url: values.repository_url,
      license_type: values.license_type as LicenseType,
      license_name: values.license_name,
      website_url: values.website_url || null,
      platforms: values.platforms,
      languages: values.languages,
      categories: values.categories,
      slug,
      example: example.value,
      installing: installing.value,
    },
  };
}

export async function submitPackage(
  _prevState: SubmitState,
  formData: FormData,
): Promise<SubmitState> {
  const values = readValues(formData);
  const dict = await getDictionary(await getRequestLocale());
  const msgs = dict.publish.errors;

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { status: "unauthorized" };
    }

    // Per-user rate limit before any validation/insert work (AC-04). Fail-open:
    // an Upstash hiccup resolves ok:true and never blocks a publish (BR3).
    const rate = await checkRateLimit("publish", publishUserKey(user.id));
    if (!rate.ok) {
      return { status: "db_error", message: msgs.rateLimited, values };
    }

    const { errors, cleaned } = validate(values, msgs);
    if (cleaned === null) {
      return { status: "invalid", errors, values };
    }

    const { data: collisions, error: collisionError } = await supabase
      .from("packages")
      .select("id, slug, repository_url")
      .or(`slug.eq.${cleaned.slug},repository_url.eq.${cleaned.repository_url}`)
      .limit(2);

    if (collisionError) {
      console.warn("[/publish] collision check failed", collisionError);
    } else if (collisions && collisions.length > 0) {
      const conflictErrors: Record<string, string> = {};
      for (const row of collisions) {
        if (row.slug === cleaned.slug) {
          conflictErrors.name = msgs.nameConflict;
        }
        if (row.repository_url === cleaned.repository_url) {
          conflictErrors.repository_url = msgs.repositoryConflict;
        }
      }
      if (Object.keys(conflictErrors).length > 0) {
        return { status: "invalid", errors: conflictErrors, values };
      }
    }

    const { data: inserted, error: insertError } = await supabase
      .from("packages")
      .insert({
        publisher_id: user.id,
        name: cleaned.name,
        slug: cleaned.slug,
        description: cleaned.description,
        repository_url: cleaned.repository_url,
        license_type: cleaned.license_type,
        license_name: cleaned.license_name,
        website_url: cleaned.website_url,
        platforms: cleaned.platforms,
        languages: cleaned.languages,
        categories: cleaned.categories,
        status: "pending",
      })
      .select("id, slug")
      .single();

    if (insertError || !inserted) {
      const message = insertError?.message ?? "";
      if (message.includes("packages_slug_key")) {
        return {
          status: "invalid",
          errors: { name: msgs.nameConflict },
          values,
        };
      }
      if (message.includes("packages_repository_url_key")) {
        return {
          status: "invalid",
          errors: { repository_url: msgs.repositoryConflict },
          values,
        };
      }
      console.warn("[/publish] insert failed", insertError);
      return {
        status: "db_error",
        message: msgs.dbError,
        values,
      };
    }

    // Persist the chosen display name on the publisher's profile (applies to all
    // their packages). Best-effort: a failure here must not fail the publish.
    if (cleaned.publisher_name) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: cleaned.publisher_name })
        .eq("id", user.id);
      if (profileError) {
        console.warn("[/publish] profile display-name update failed", profileError);
      }
    }

    // Best-effort curated tab content. Failure must NOT fail the submission —
    // the package is already created (ADR-035, AC 8).
    if (cleaned.example || cleaned.installing) {
      await upsertCuratedTabContent(inserted.id, {
        example: cleaned.example,
        installing: cleaned.installing,
      });
    }

    // Best-effort publish-time validation (ESP-002, ADR-042/043/044/045). Runs the
    // pluggable validator registry (README gate this demand) and persists the report
    // to the satellite table. Lenient launch: any throw from the runner or the
    // persistence helper must NOT fail the publish — the package is already created.
    // The enforce branch is scaffolded but inert (flag default-off); a "rejected"
    // README verdict never blocks the publish (BR1, ADR-043). The computed report is
    // returned to the UI for the success-panel README block — even when the live
    // migration is deferred and persistence fails soft (the report is in-memory).
    let validationReport: PublishValidationReport | null = null;
    try {
      const report = await runPublishValidation({
        packageId: inserted.id,
        repositoryUrl: cleaned.repository_url,
        name: cleaned.name,
        slug: cleaned.slug,
        licenseType: cleaned.license_type,
        licenseName: cleaned.license_name,
        platforms: cleaned.platforms,
        languages: cleaned.languages,
        fetchRepoFile: (filename) =>
          fetchGithubRaw(cleaned.repository_url, filename),
      });
      validationReport = report;

      if (isPublishValidationEnforced() && report.verdict === "rejected") {
        // Future hard block: reject the publish here. Inert this cycle — flag
        // default-off, so a "rejected" verdict is recorded + surfaced, not blocked.
      }

      await upsertPublishValidation(inserted.id, report);
    } catch (err) {
      console.warn("[/publish] publish-time validation failed", err);
    }

    return { status: "success", slug: inserted.slug, validation: validationReport };
  } catch (err) {
    console.warn("[/publish] unexpected error", err);
    return {
      status: "db_error",
      message: msgs.unexpected,
      values,
    };
  }
}
