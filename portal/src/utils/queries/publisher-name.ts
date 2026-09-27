import "server-only";
import { createClient } from "@/utils/supabase/server";

export type PublisherProfile = {
  username: string | null;
  full_name: string | null;
};

// Card/sidebar publisher precedence (ADR-037): full_name → username → null.
// Centralizes the resolution the detail page already uses inline.
export function resolvePublisherName(
  p: PublisherProfile | null | undefined,
): string | null {
  return p?.full_name || p?.username || null;
}

// Single batched profiles fetch keyed by the publisher_id set — avoids N+1 on
// card lists (ADR-037). Returns only ids that resolve to a non-empty name.
export async function getPublisherNames(
  ids: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (unique.length === 0) return new Map();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name")
    .in("id", unique);

  const map = new Map<string, string>();
  if (error || !data) return map;
  for (const row of data as {
    id: string;
    username: string | null;
    full_name: string | null;
  }[]) {
    const name = resolvePublisherName(row);
    if (name) map.set(row.id, name);
  }
  return map;
}
