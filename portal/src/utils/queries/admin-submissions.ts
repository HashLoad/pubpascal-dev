import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export const HIGHLIGHT_LEVELS = ["none", "bronze", "silver", "gold"] as const;
export type HighlightLevel = (typeof HIGHLIGHT_LEVELS)[number];

export const SUBMISSION_STATUSES = [
  "pending",
  "validating",
  "rejected",
  "all",
] as const;
export type SubmissionStatusFilter = (typeof SUBMISSION_STATUSES)[number];

export type SubmissionRow = {
  id: string;
  name: string;
  slug: string;
  status: "pending" | "validating" | "active" | "rejected";
  highlight_level: HighlightLevel;
  validation_report: unknown;
  created_at: string;
  publisher_username: string | null;
};

type AdminAssertion =
  | { ok: true; userId: string }
  | { ok: false; reason: "anonymous" | "forbidden" };

export async function assertAdmin(): Promise<AdminAssertion> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, reason: "anonymous" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { ok: false, reason: "forbidden" };
  return { ok: true, userId: user.id };
}

/**
 * Throws via redirect (anon) or Error (forbidden). Use inside Server Actions
 * where the page-layout 403 path does not apply.
 */
export async function requireAdminOrThrow(): Promise<string> {
  const result = await assertAdmin();
  if (result.ok) return result.userId;
  if (result.reason === "anonymous") redirect("/login?next=/admin");
  throw new Error("forbidden");
}

export async function listSubmissions({
  status,
}: {
  status: SubmissionStatusFilter;
}): Promise<SubmissionRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("packages")
    .select(
      "id, name, slug, status, highlight_level, validation_report, created_at, profiles:publisher_id(username)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (status === "all") {
    query = query.in("status", ["pending", "validating", "rejected"]);
  } else {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((row) => {
    const profileJoin = row.profiles as
      | { username: string | null }
      | { username: string | null }[]
      | null;
    const username = Array.isArray(profileJoin)
      ? profileJoin[0]?.username ?? null
      : profileJoin?.username ?? null;

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      highlight_level: row.highlight_level,
      validation_report: row.validation_report,
      created_at: row.created_at,
      publisher_username: username,
    };
  });
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

export function isHighlightLevel(value: string): value is HighlightLevel {
  return (HIGHLIGHT_LEVELS as readonly string[]).includes(value);
}

export function extractEsteiraVerdict(report: unknown): string | null {
  if (!report || typeof report !== "object") return null;
  const verdict = (report as Record<string, unknown>).verdict;
  return typeof verdict === "string" && verdict.length > 0 ? verdict : null;
}
