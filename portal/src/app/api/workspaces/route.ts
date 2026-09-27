// GET /api/workspaces — list the authenticated viewer's workspaces (id + name).
// Auth: CLI bearer token or session cookie (same resolver the manifest route
// uses, ADR-077). Powers the PubPascal IDE app's workspace selector so the user
// can switch between their workspaces. Per-viewer, no-store, rate-limited.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { resolveViewerId } from "./[id]/manifest/auth";
import { hashToken, parseBearer } from "@/lib/cli-tokens/token";
import {
  checkRateLimit,
  clientIpFromForwardedFor,
  manifestIpKey,
  manifestTokenKey,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const methodNotAllowed = () =>
  NextResponse.json({ error: "Method not allowed" }, { status: 405 });

function tooManyRequests(reset: number): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export async function GET(request: Request): Promise<NextResponse> {
  const bearer = parseBearer(request.headers.get("authorization"));

  // Reuse the manifest limiter family: per-IP always, per-token when present.
  const ipRate = await checkRateLimit(
    "manifest-ip",
    manifestIpKey(clientIpFromForwardedFor(request.headers.get("x-forwarded-for"))),
  );
  if (!ipRate.ok) return tooManyRequests(ipRate.reset);
  if (bearer !== null) {
    const tokenRate = await checkRateLimit(
      "manifest-token",
      manifestTokenKey(hashToken(bearer)),
    );
    if (!tokenRate.ok) return tooManyRequests(tokenRate.reset);
  }

  // Bearer token → session cookie → anonymous. Anonymous gets an empty list
  // rather than an error (the selector simply shows nothing to switch to).
  const viewerId = await resolveViewerId(request);
  if (!viewerId) {
    return NextResponse.json({ workspaces: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  // Service-role: the headless (token) path can't read the rows via session RLS.
  // Ownership is enforced explicitly by the owner_id filter. Soft-fail to empty.
  let workspaces: { id: string; name: string }[] = [];
  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from("workspaces")
      .select("id, name")
      .eq("owner_id", viewerId)
      .order("name", { ascending: true });
    workspaces = (data as { id: string; name: string }[] | null) ?? [];
  } catch {
    workspaces = [];
  }

  return NextResponse.json({ workspaces }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(): Promise<NextResponse> {
  return methodNotAllowed();
}

export async function PUT(): Promise<NextResponse> {
  return methodNotAllowed();
}

export async function PATCH(): Promise<NextResponse> {
  return methodNotAllowed();
}

export async function DELETE(): Promise<NextResponse> {
  return methodNotAllowed();
}
