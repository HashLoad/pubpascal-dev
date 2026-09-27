import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { resolveViewerId } from "@/app/api/workspaces/[id]/manifest/auth";
import { forkGithubRepo } from "@/utils/github";
import { resolveRepoFromSlugOrUrl } from "../resolveRepo";

export const dynamic = "force-dynamic";

const methodNotAllowed = () =>
  NextResponse.json({ error: "Method not allowed" }, { status: 405 });

// Helper to fetch GitHub username if missing in database
async function fetchGithubUsername(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `token ${accessToken}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "PubPascal-Portal",
      },
    });
    if (res.ok) {
      const data = await res.json();
      return data.login || null;
    }
  } catch {}
  return null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const viewerId = await resolveViewerId(request);
  if (!viewerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { packageSlug } = await request.json();

    if (!packageSlug) {
      return NextResponse.json({ error: "Missing required field: packageSlug" }, { status: 400 });
    }

    // Parse the repository URL/slug
    const repoInfo = await resolveRepoFromSlugOrUrl(packageSlug);
    if (!repoInfo) {
      return NextResponse.json(
        { error: `Could not resolve "${packageSlug}" to a GitHub repository. Pass a published package slug, or an owner/repo pair.` },
        { status: 400 }
      );
    }

    // Fetch the user's GitHub integration token
    const svc = createServiceClient();
    const { data: integration, error: dbError } = await svc
      .from("user_integrations")
      .select("access_token, provider_user")
      .eq("user_id", viewerId)
      .eq("provider", "github")
      .maybeSingle();

    if (dbError) {
      return NextResponse.json({ error: `Database error: ${dbError.message}` }, { status: 500 });
    }

    if (!integration || !integration.access_token) {
      return NextResponse.json(
        { error: "GitHub integration not found. Please link your GitHub account in your PubPascal Portal profile first." },
        { status: 400 }
      );
    }

    // Call GitHub API to fork the repository
    const forkResult = await forkGithubRepo(repoInfo.owner, repoInfo.repo, integration.access_token);
    if (!forkResult.success) {
      return NextResponse.json({ error: forkResult.error || "Failed to fork repository on GitHub" }, { status: 500 });
    }

    // Resolve GitHub username (use stored one, or query API as fallback)
    let githubUsername = integration.provider_user;
    if (!githubUsername) {
      githubUsername = await fetchGithubUsername(integration.access_token);
      if (githubUsername) {
        // Asynchronously update the username in database for future requests
        void Promise.resolve(
          svc
            .from("user_integrations")
            .update({ provider_user: githubUsername })
            .eq("user_id", viewerId)
            .eq("provider", "github")
        ).catch(() => undefined);
      }
    }

    return NextResponse.json({
      success: true,
      clone_url: forkResult.cloneUrl,
      ssh_url: forkResult.sshUrl,
      github_username: githubUsername || "unknown",
      upstream_owner: repoInfo.owner,
      upstream_repo: repoInfo.repo,
    });
  } catch (err) {
    const message = err instanceof Error && err.message ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(): Promise<NextResponse> { return methodNotAllowed(); }
export async function PUT(): Promise<NextResponse> { return methodNotAllowed(); }
export async function PATCH(): Promise<NextResponse> { return methodNotAllowed(); }
export async function DELETE(): Promise<NextResponse> { return methodNotAllowed(); }
