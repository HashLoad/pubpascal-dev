import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { resolveViewerId } from "../../workspaces/[id]/manifest/auth";

export const dynamic = "force-dynamic";

const methodNotAllowed = () =>
  NextResponse.json({ error: "Method not allowed" }, { status: 405 });

// GET /api/profile/integrations - List active integrations (provider and provider_user only)
export async function GET(request: Request): Promise<NextResponse> {
  const viewerId = await resolveViewerId(request);
  if (!viewerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const svc = createServiceClient();
    const { data, error } = await svc
      .from("user_integrations")
      .select("provider, provider_user")
      .eq("user_id", viewerId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ integrations: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const message = err instanceof Error && err.message ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/profile/integrations - Create or update an integration token
export async function POST(request: Request): Promise<NextResponse> {
  const viewerId = await resolveViewerId(request);
  if (!viewerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { provider, accessToken, providerUser } = await request.json();

    if (!provider || !accessToken) {
      return NextResponse.json({ error: "Missing required fields: provider, accessToken" }, { status: 400 });
    }

    if (provider !== "github" && provider !== "gitlab") {
      return NextResponse.json({ error: "Invalid provider. Supported: github, gitlab" }, { status: 400 });
    }

    const svc = createServiceClient();
    const { error } = await svc
      .from("user_integrations")
      .upsert(
        {
          user_id: viewerId,
          provider,
          access_token: accessToken,
          provider_user: providerUser || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,provider",
        }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error && err.message ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/profile/integrations - Revoke an integration
export async function DELETE(request: Request): Promise<NextResponse> {
  const viewerId = await resolveViewerId(request);
  if (!viewerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { provider } = await request.json();
    if (!provider) {
      return NextResponse.json({ error: "Missing provider" }, { status: 400 });
    }

    const svc = createServiceClient();
    const { error } = await svc
      .from("user_integrations")
      .delete()
      .eq("user_id", viewerId)
      .eq("provider", provider);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error && err.message ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(): Promise<NextResponse> {
  return methodNotAllowed();
}

export async function PATCH(): Promise<NextResponse> {
  return methodNotAllowed();
}
