"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

/**
 * Toggle the current user's like on a package (ADR-034).
 *
 * Auth is enforced server-side: an unauthenticated call is a silent no-op (the UI
 * routes anonymous users to /login instead of submitting). For an authenticated user
 * the like is binary — delete the row if it exists, insert it otherwise. RLS
 * (`auth.uid() = user_id`) is the second enforcement layer; the DB UNIQUE prevents
 * duplicates. Errors fail soft (e.g. migration not applied live) — no throw (AC 10).
 *
 * Bound to a <form> via FormData (mirrors the reviews actions). Revalidates the
 * catalog/home caches; the detail page is dynamic (reads the session) and re-renders
 * fresh after the action, so its count + button state update immediately.
 */
export async function toggleLike(formData: FormData): Promise<void> {
  const packageId = String(formData.get("packageId") ?? "").trim();
  if (!packageId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return; // anonymous → no-op (UI shows a sign-in link)

  const { data: existing } = await supabase
    .from("package_likes")
    .select("id")
    .eq("package_id", packageId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("package_likes")
      .delete()
      .eq("id", existing.id)
      .eq("user_id", user.id);
  } else {
    await supabase
      .from("package_likes")
      .insert({ package_id: packageId, user_id: user.id });
  }

  revalidatePath("/[lang]/packages", "page");
  revalidatePath("/[lang]", "page");
}
