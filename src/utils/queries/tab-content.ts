import "server-only";
import { createClient } from "@/utils/supabase/server";

export type CuratedTabContent = {
  example: string | null;
  installing: string | null;
};

const EMPTY: CuratedTabContent = { example: null, installing: null };

/**
 * Curated (publisher-authored) markdown for a package's Example / Installing tabs.
 *
 * Fails soft: if the table is missing (migration not yet applied live) or any query
 * errors, returns `{ example: null, installing: null }` — never throws (ADR-035, AC 3).
 * Same shape/contract as `getLikesForPackage` in `likes.ts`.
 */
export async function getCuratedTabContent(
  packageId: string,
): Promise<CuratedTabContent> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("package_tab_content")
      .select("example, installing")
      .eq("package_id", packageId)
      .maybeSingle();

    if (error || !data) return EMPTY;
    return {
      example: data.example ?? null,
      installing: data.installing ?? null,
    };
  } catch {
    return EMPTY;
  }
}

/**
 * Best-effort upsert of curated tab content. Used by both write paths (publish + edit).
 *
 * Fails soft: on any error (incl. missing table / RLS denial) it warns and returns
 * `false` without throwing — the caller's primary write (package insert/update) is
 * authoritative and must never be failed by a curated-content miss (ADR-035, AC 8/11).
 */
export async function upsertCuratedTabContent(
  packageId: string,
  values: { example: string | null; installing: string | null },
): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("package_tab_content")
      .upsert(
        {
          package_id: packageId,
          example: values.example,
          installing: values.installing,
        },
        { onConflict: "package_id" },
      );

    if (error) {
      console.warn("[tab-content] upsert failed", error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[tab-content] upsert unexpected error", err);
    return false;
  }
}
