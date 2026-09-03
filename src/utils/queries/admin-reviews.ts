import "server-only";
import { createClient } from "@/utils/supabase/server";

export type AdminReviewRow = {
  id: string;
  package_id: string;
  package_slug: string | null;
  reviewer_id: string;
  reviewer_username: string | null;
  rating: number;
  body: string | null;
  is_flagged: boolean;
  created_at: string;
};

const ADMIN_REVIEW_COLUMNS =
  "id, package_id, reviewer_id, rating, body, is_flagged, created_at, packages(slug), profiles(username)";

function firstJoin<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function getAdminReviews(): Promise<AdminReviewRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("package_reviews")
    .select(ADMIN_REVIEW_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];

  return data.map((row) => {
    const pkg = firstJoin(row.packages as { slug: string | null } | { slug: string | null }[] | null);
    const profile = firstJoin(
      row.profiles as { username: string | null } | { username: string | null }[] | null,
    );
    return {
      id: row.id,
      package_id: row.package_id,
      package_slug: pkg?.slug ?? null,
      reviewer_id: row.reviewer_id,
      reviewer_username: profile?.username ?? null,
      rating: row.rating,
      body: row.body,
      is_flagged: row.is_flagged,
      created_at: row.created_at,
    };
  });
}

export async function flagReview(reviewId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("package_reviews")
    .update({ is_flagged: true })
    .eq("id", reviewId);
  return !error;
}

export async function unflagReview(reviewId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("package_reviews")
    .update({ is_flagged: false })
    .eq("id", reviewId);
  return !error;
}

export async function deleteAdminReview(reviewId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("package_reviews").delete().eq("id", reviewId);
  return !error;
}

export async function banUserFromReviews(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_banned_from_reviews: true })
    .eq("id", userId);
  return !error;
}

export async function unbanUserFromReviews(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_banned_from_reviews: false })
    .eq("id", userId);
  return !error;
}

export async function getBannedReviewerIds(reviewerIds: string[]): Promise<Set<string>> {
  if (reviewerIds.length === 0) return new Set();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .in("id", reviewerIds)
    .eq("is_banned_from_reviews", true);

  if (error || !data) return new Set();
  return new Set(data.map((r) => r.id as string));
}
