import "server-only";
import { createClient } from "@/utils/supabase/server";
import type { PublishValidationReport } from "@/lib/publish-validation";

/**
 * Read the persisted publish-time validation report for a package.
 *
 * Fails soft: if the table is missing (migration not yet applied live), RLS denies
 * the read, or any query errors, returns `null` — never throws (ADR-041/043, AC5).
 * Same contract as `getCuratedTabContent` in `tab-content.ts`.
 */
export async function getPublishValidation(
  packageId: string,
): Promise<PublishValidationReport | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("package_publish_validation")
      .select("report")
      .eq("package_id", packageId)
      .maybeSingle();

    if (error || !data) return null;
    return (data.report as PublishValidationReport) ?? null;
  } catch {
    return null;
  }
}

/**
 * Batch-read persisted publish-time validation reports for a set of packages.
 *
 * Fails soft: if the table is missing (migration not yet applied live), RLS denies
 * the read, or any query errors, returns an empty `Map` — never throws (ADR-041/045,
 * BR5, AC8). Empty input short-circuits with no query. Used by `/dashboard` to drive
 * the per-row README badge; a miss simply means no badge (graceful degradation).
 */
export async function getPublishValidationMap(
  packageIds: string[],
): Promise<Map<string, PublishValidationReport>> {
  const map = new Map<string, PublishValidationReport>();
  if (packageIds.length === 0) return map;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("package_publish_validation")
      .select("package_id, report")
      .in("package_id", packageIds);

    if (error || !data) return map;
    for (const row of data) {
      const id = row.package_id as string | null;
      if (id && row.report) {
        map.set(id, row.report as PublishValidationReport);
      }
    }
    return map;
  } catch {
    return map;
  }
}

/**
 * Best-effort upsert of the publish-time validation report.
 *
 * Fails soft: on any error (incl. missing table / RLS denial) it warns and returns
 * `false` without throwing — the publish (package insert) is authoritative and must
 * never be failed by a validation-persistence miss (ADR-043, BR1/BR5, AC5/AC6).
 */
export async function upsertPublishValidation(
  packageId: string,
  report: PublishValidationReport,
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("package_publish_validation")
      .upsert(
        {
          package_id: packageId,
          report,
        },
        { onConflict: "package_id" },
      );

    if (error) {
      console.warn("[publish-validation] upsert failed", error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[publish-validation] upsert unexpected error", err);
    return false;
  }
}
