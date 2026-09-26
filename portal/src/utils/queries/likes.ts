import "server-only";
import { createClient } from "@/utils/supabase/server";

export type LikeSummary = { count: number; likedByMe: boolean };

const EMPTY: LikeSummary = { count: 0, likedByMe: false };

/**
 * Batch like aggregation for a visible package set.
 *
 * Bounded to ≤2 queries (ADR-034, AC 7): one grouped count over the set, plus —
 * only when a user is supplied — one query for that user's liked package ids.
 * Counting is done in-memory, mirroring the reviews-rating batch helper
 * (`getPackageRatings`) for consistency.
 *
 * Fails soft: if the table is missing (migration not yet applied live) or any
 * query errors, every id resolves to a zero/unliked summary — no throw (AC 10).
 */
export async function getLikesForPackages(
  packageIds: string[],
  userId: string | null,
): Promise<Map<string, LikeSummary>> {
  const result = new Map<string, LikeSummary>();
  if (packageIds.length === 0) return result;

  const supabase = await createClient();

  // Query 1: all like rows for the visible set, grouped client-side by package_id.
  const { data: likeRows, error } = await supabase
    .from("package_likes")
    .select("package_id")
    .in("package_id", packageIds);

  if (error || !likeRows) {
    for (const id of packageIds) result.set(id, EMPTY);
    return result;
  }

  const counts = new Map<string, number>();
  for (const row of likeRows as { package_id: string }[]) {
    counts.set(row.package_id, (counts.get(row.package_id) ?? 0) + 1);
  }

  // Query 2 (only when a user is known): which of these packages they already liked.
  const likedByMe = new Set<string>();
  if (userId) {
    const { data: mine } = await supabase
      .from("package_likes")
      .select("package_id")
      .eq("user_id", userId)
      .in("package_id", packageIds);
    if (mine) for (const row of mine as { package_id: string }[]) likedByMe.add(row.package_id);
  }

  for (const id of packageIds) {
    result.set(id, { count: counts.get(id) ?? 0, likedByMe: likedByMe.has(id) });
  }
  return result;
}

/** Single-package variant for the detail page. Fails soft to a zero/unliked summary. */
export async function getLikesForPackage(
  packageId: string,
  userId: string | null,
): Promise<LikeSummary> {
  const map = await getLikesForPackages([packageId], userId);
  return map.get(packageId) ?? EMPTY;
}
