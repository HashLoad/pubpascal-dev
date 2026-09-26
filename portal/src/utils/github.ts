export interface GithubRepoInfo {
  owner: string;
  repo: string;
}

// Parses GitHub slugs, HTTPS URLs, and SSH URLs into owner and repository name.
export function parseGithubUrl(urlOrSlug: string): GithubRepoInfo | null {
  if (!urlOrSlug) return null;

  let clean = urlOrSlug.trim();
  
  // Remove protocol and prefixes
  clean = clean.replace(/^https?:\/\//i, "");
  clean = clean.replace(/^git@/i, "");
  
  // Remove .git suffix
  clean = clean.replace(/\.git$/i, "");
  
  // Replace colon with slash (standard for SSH: git@github.com:owner/repo)
  clean = clean.replace(":", "/");
  
  const parts = clean.split("/");
  
  // Standard format: [ "github.com", "owner", "repo" ]
  if (parts.length >= 3 && parts[0].toLowerCase().includes("github.com")) {
    return {
      owner: parts[1],
      repo: parts[2],
    };
  }
  
  // Fallback for slugs without github.com prefix: "owner/repo"
  if (parts.length === 2 && !parts[0].includes(".")) {
    return {
      owner: parts[0],
      repo: parts[1],
    };
  }

  return null;
}

export interface ForkResult {
  success: boolean;
  cloneUrl?: string;
  sshUrl?: string;
  error?: string;
}

// Calls GitHub API to fork the repository on behalf of the user.
export async function forkGithubRepo(
  owner: string,
  repo: string,
  accessToken: string
): Promise<ForkResult> {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/forks`, {
      method: "POST",
      headers: {
        "Authorization": `token ${accessToken}`,
        "Accept": "application/vnd.github+json",
        "User-Agent": "PubPascal-Portal",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `GitHub API error: ${response.status}`,
      };
    }

    return {
      success: true,
      cloneUrl: data.clone_url,
      sshUrl: data.ssh_url,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error && err.message ? err.message : "Network error while connecting to GitHub",
    };
  }
}

export interface PullRequestDetails {
  title: string;
  body: string;
  head: string; // e.g. "my-github-user:branch-name"
  base: string; // e.g. "main"
}

export interface PullRequestResult {
  success: boolean;
  prUrl?: string;
  error?: string;
}

// Calls GitHub API to create a Pull Request on the upstream repository.
export async function createGithubPullRequest(
  owner: string,
  repo: string,
  accessToken: string,
  details: PullRequestDetails
): Promise<PullRequestResult> {
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: "POST",
      headers: {
        "Authorization": `token ${accessToken}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "PubPascal-Portal",
      },
      body: JSON.stringify({
        title: details.title,
        body: details.body,
        head: details.head,
        base: details.base,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `GitHub API error: ${response.status}`,
      };
    }

    return {
      success: true,
      prUrl: data.html_url,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error && err.message ? err.message : "Network error while connecting to GitHub",
    };
  }
}
