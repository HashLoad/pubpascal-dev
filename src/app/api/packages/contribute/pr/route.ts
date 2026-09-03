import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { resolveViewerId } from "@/app/api/workspaces/[id]/manifest/auth";
import { createGithubPullRequest } from "@/utils/github";
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

// Helper to fetch the default branch of the upstream repository dynamically
async function fetchDefaultBranch(owner: string, repo: string, accessToken: string): Promise<string> {
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        "Authorization": `token ${accessToken}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "PubPascal-Portal",
      },
    });
    if (res.ok) {
      const data = await res.json();
      return data.default_branch || "main";
    }
  } catch {}
  return "main"; // Fallback to main
}

export async function POST(request: Request): Promise<NextResponse> {
  const viewerId = await resolveViewerId(request);
  if (!viewerId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { packageSlug, branch, title, body } = await request.json();

    if (!packageSlug || !branch || !title) {
      return NextResponse.json(
        { error: "Missing required fields: packageSlug, branch, title" },
        { status: 400 }
      );
    }

    // Parse the repository URL/slug
    const repoInfo = await resolveRepoFromSlugOrUrl(packageSlug);
    if (!repoInfo) {
      return NextResponse.json(
        { error: "Invalid repository format. Only GitHub repositories are supported for pull requests." },
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

    // Resolve GitHub username (use stored one, or query API as fallback)
    let githubUsername = integration.provider_user;
    if (!githubUsername) {
      githubUsername = await fetchGithubUsername(integration.access_token);
      if (!githubUsername) {
        return NextResponse.json({ error: "Failed to resolve GitHub username from token" }, { status: 400 });
      }
      
      // Asynchronously update the username in database for future requests
      void Promise.resolve(
        svc
          .from("user_integrations")
          .update({ provider_user: githubUsername })
          .eq("user_id", viewerId)
          .eq("provider", "github")
      ).catch(() => undefined);
    }

    // Query upstream default branch dynamically (e.g., 'main' or 'master')
    const defaultBranch = await fetchDefaultBranch(repoInfo.owner, repoInfo.repo, integration.access_token);

    // Formulate the PR details
    // head format for cross-repository pull requests: 'username:branch'
    const prDetails = {
      title,
      body: body || "Contribution made via PubPascal Dev-Flow",
      head: `${githubUsername}:${branch}`,
      base: defaultBranch,
    };

    // Call GitHub API to create the Pull Request
    const prResult = await createGithubPullRequest(
      repoInfo.owner,
      repoInfo.repo,
      integration.access_token,
      prDetails
    );

    if (!prResult.success) {
      return NextResponse.json({ error: prResult.error || "Failed to create Pull Request on GitHub" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      pr_url: prResult.prUrl,
      head: prDetails.head,
      base: prDetails.base,
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
