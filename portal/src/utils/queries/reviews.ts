import "server-only";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";

export type ReviewRow = {
  id: string;
  package_id: string;
  reviewer_id: string;
  rating: number;
  body: string | null;
  is_flagged: boolean;
  created_at: string;
  updated_at: string;
  reviewer_username: string | null;
  reviewer_avatar: string | null;
};

export type RatingSummary = { avg: number | null; count: number };

export async function getPackageReviews(packageId: string): Promise<ReviewRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("package_reviews")
    .select(
      "id, package_id, reviewer_id, rating, body, is_flagged, created_at, updated_at, profiles(username, avatar_url)",
    )
    .eq("package_id", packageId)
    .eq("is_flagged", false)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.id,
      package_id: row.package_id,
      reviewer_id: row.reviewer_id,
      rating: row.rating,
      body: row.body,
      is_flagged: row.is_flagged,
      created_at: row.created_at,
      updated_at: row.updated_at,
      reviewer_username: (profile as { username?: string | null } | null)?.username ?? null,
      reviewer_avatar: (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null,
    };
  });
}

// Counts FLAGGED (RLS-hidden) reviews, so it must bypass RLS — done with the
// service-role client here rather than a public SECURITY DEFINER RPC, so the
// function no longer needs to be reachable by anon/authenticated (Supabase
// linter 0028/0029). Fail-soft to 0.
export async function getFlaggedReviewCount(packageId: string): Promise<number> {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("get_flagged_review_count", {
      p_package_id: packageId,
    });
    if (error || data == null) return 0;
    return Number(data) || 0;
  } catch {
    return 0;
  }
}

export async function getUserReview(
  packageId: string,
  userId: string,
): Promise<ReviewRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("package_reviews")
    .select(
      "id, package_id, reviewer_id, rating, body, is_flagged, created_at, updated_at, profiles(username, avatar_url)",
    )
    .eq("package_id", packageId)
    .eq("reviewer_id", userId)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
  return {
    id: data.id,
    package_id: data.package_id,
    reviewer_id: data.reviewer_id,
    rating: data.rating,
    body: data.body,
    is_flagged: data.is_flagged,
    created_at: data.created_at,
    updated_at: data.updated_at,
    reviewer_username: (profile as { username?: string | null } | null)?.username ?? null,
    reviewer_avatar: (profile as { avatar_url?: string | null } | null)?.avatar_url ?? null,
  };
}

export async function getPackageRatingSummary(packageId: string): Promise<RatingSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("package_reviews")
    .select("rating")
    .eq("package_id", packageId)
    .eq("is_flagged", false);

  if (error || !data || data.length === 0) return { avg: null, count: 0 };

  return computeRatingSummary(data.map((r) => r.rating as number));
}

function computeRatingSummary(ratings: number[]): RatingSummary {
  const count = ratings.length;
  if (count === 0) return { avg: null, count: 0 };
  const avg = ratings.reduce((s, r) => s + r, 0) / count;
  return { avg: Math.round(avg * 10) / 10, count };
}

export async function getPackageRatings(
  packageIds: string[],
): Promise<Map<string, RatingSummary>> {
  if (packageIds.length === 0) return new Map();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("package_reviews")
    .select("package_id, rating")
    .in("package_id", packageIds)
    .eq("is_flagged", false);

  if (error || !data) return new Map();

  return aggregateRatingsByPackage(data as { package_id: string; rating: number }[]);
}

function aggregateRatingsByPackage(
  rows: { package_id: string; rating: number }[],
): Map<string, RatingSummary> {
  const grouped = new Map<string, number[]>();
  for (const row of rows) {
    const list = grouped.get(row.package_id) ?? [];
    list.push(row.rating);
    grouped.set(row.package_id, list);
  }

  const result = new Map<string, RatingSummary>();
  for (const [id, ratings] of grouped) {
    result.set(id, computeRatingSummary(ratings));
  }
  return result;
}
