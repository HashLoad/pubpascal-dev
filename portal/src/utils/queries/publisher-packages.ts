import "server-only";
import { createClient } from "@/utils/supabase/server";
import type { MyPackageRow, MyPackageEditable } from "./publisher-packages-types";

export async function getMyPackages(userId: string): Promise<MyPackageRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("packages")
    .select(
      "id, name, slug, status, highlight_level, validation_report, description, license_type, license_name, platforms, languages, categories, stars, downloads, score, deprecated_message, created_at, updated_at",
    )
    .eq("publisher_id", userId)
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];
  return data as MyPackageRow[];
}

export async function getMyPackageById(
  userId: string,
  id: string,
): Promise<MyPackageEditable | null> {
  const supabase = await createClient();
  const [{ data, error }, { data: profile }] = await Promise.all([
    supabase
      .from("packages")
      .select(
        "id, name, slug, repository_url, description, website_url, funding_url, screenshots, license_type, license_name, platforms, languages, categories, status, highlight_level, deprecated_message, yanked_versions",
      )
      .eq("id", id)
      .eq("publisher_id", userId)
      .single(),
    // Owner's global publisher display name — separate read, keeps the `packages`
    // select untouched (ADR-035 / ADR-037). Pre-fills the editable name field.
    supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
  ]);

  if (error || !data) return null;
  // Curated tab content (example/installing) is read separately by the edit page
  // via getCuratedTabContent — the `packages` select stays unchanged (ADR-035).
  return {
    ...(data as Omit<
      MyPackageEditable,
      "example" | "installing" | "publisher_display_name"
    >),
    example: null,
    installing: null,
    publisher_display_name: profile?.full_name ?? null,
  };
}
