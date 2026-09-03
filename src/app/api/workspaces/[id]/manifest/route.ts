// GET /api/workspaces/[id]/manifest — workspace manifest v1 (ADR-073, ESP-002).
// Auth: session cookie (Demand 1/2) + CLI bearer token (Demand 2/2, ADR-077).
// Visibility: RLS gates session path; service-role + manual gate for headless path (AC-05).
// Cache: force-dynamic + no-store (per-viewer, auth-dependent).

import { NextResponse } from "next/server";
import { isUuid } from "@/utils/queries/admin-submissions";
import { getWorkspaceManifestData } from "./query";
import { buildManifest } from "@/lib/workspaces/manifest";
import { resolveViewerId } from "./auth";
import { hashToken, parseBearer } from "@/lib/cli-tokens/token";
import {
  checkRateLimit,
  clientIpFromForwardedFor,
  manifestIpKey,
  manifestTokenKey,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });
const methodNotAllowed = () =>
  NextResponse.json({ error: "Method not allowed" }, { status: 405 });

// 429 response with a `Retry-After` (seconds), derived from the limiter's reset
// timestamp (unix-ms). At least 1s so a client always backs off (AC-06).
function tooManyRequests(reset: number): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return NextResponse.json(
    { error: "Too many requests" },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  // UUID guard — malformed id → 404 (no existence leak, AC-11).
  if (!isUuid(id)) return notFound();

  const bearer = parseBearer(request.headers.get("authorization"));

  // Rate limit before any data fetch (ESP-002, AC-06): per-IP always, plus
  // per-token when a bearer is present, so one IP can't exhaust every token and
  // one token can't be replayed across IPs. Over-limit → 429 + Retry-After.
  // Fail-open (BR3): an Upstash hiccup resolves ok:true and never blocks.
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

  // Resolve viewer: bearer token → session cookie → anonymous (ADR-077, AC-10).
  const isHeadless = bearer !== null;
  const viewerId = await resolveViewerId(request);

  const data = await getWorkspaceManifestData(id, viewerId, isHeadless);
  if (!data) return notFound();

  const generatedAt = new Date().toISOString();
  const manifest = buildManifest({ ...data, generatedAt });

  return NextResponse.json(manifest, {
    headers: { "Cache-Control": "no-store" },
  });
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
