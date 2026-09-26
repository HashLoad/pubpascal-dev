import "server-only";
import { createServiceClient } from "@/utils/supabase/service";
import { parseGithubUrl, type GithubRepoInfo } from "@/utils/github";

// Turns whatever the CLI sent into a GitHub owner/repo pair.
//
// The contribute routes used to feed packageSlug straight into parseGithubUrl,
// which only understands a URL or "owner/repo". But the CLI — and the desktop
// app behind it — identify a package by its portal slug ("janus"), so every
// call failed with "Invalid repository format" before the fork was even
// attempted. The portal is the side that knows a slug's repository, so it
// resolves it here instead of demanding the client already know the URL.
export async function resolveRepoFromSlugOrUrl(
  slugOrUrl: string,
): Promise<GithubRepoInfo | null> {
  const direct = parseGithubUrl(slugOrUrl);
  if (direct) return direct;

  const slug = slugOrUrl.trim().toLowerCase();
  if (!slug || slug.includes("/")) return null;

  try {
    const svc = createServiceClient();
    const { data } = await svc
      .from("packages")
      .select("repository_url")
      .eq("slug", slug)
      .maybeSingle();

    const repoUrl = (data as { repository_url: string | null } | null)?.repository_url;

    return repoUrl ? parseGithubUrl(repoUrl) : null;
  } catch {
    return null;
  }
}
