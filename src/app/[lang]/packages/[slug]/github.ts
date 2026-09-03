import { cache } from "react";
import { SECURITY_POLICY_CANDIDATES } from "@/lib/cra/readiness";

const FETCH_TIMEOUT_MS = 5_000;
const MAX_BYTES = 200 * 1024;

const GITHUB_REPO_REGEX =
  /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i;

export type FetchResult =
  | { ok: true; body: string }
  | {
      ok: false;
      reason: "timeout" | "http" | "too-large" | "not-github" | "unknown";
    };

function parseGithubRepo(repositoryUrl: string): { owner: string; repo: string } | null {
  const match = GITHUB_REPO_REGEX.exec(repositoryUrl.trim());
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

export function repoTreeUrl(repositoryUrl: string, path: string): string {
  const parsed = parseGithubRepo(repositoryUrl);
  if (!parsed) return repositoryUrl;
  return `https://github.com/${parsed.owner}/${parsed.repo}/tree/HEAD/${path}`;
}

// Raw download URL for a file in the repo (the same endpoint `fetchGithubRaw`
// reads from). Used to link the live SBOM to its source in the repo. Falls back
// to the repo URL when the input isn't a parseable GitHub repo.
export function rawFileUrl(repositoryUrl: string, path: string): string {
  const parsed = parseGithubRepo(repositoryUrl);
  if (!parsed) return repositoryUrl;
  return `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/HEAD/${path}`;
}

async function readWithCap(
  response: Response,
  cap: number,
): Promise<{ ok: true; body: string } | { ok: false; reason: "too-large" | "unknown" }> {
  const reader = response.body?.getReader();
  if (!reader) {
    try {
      const text = await response.text();
      if (text.length > cap) return { ok: false, reason: "too-large" };
      return { ok: true, body: text };
    } catch {
      return { ok: false, reason: "unknown" };
    }
  }

  const decoder = new TextDecoder("utf-8");
  let received = 0;
  let body = "";

  while (true) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try {
      chunk = await reader.read();
    } catch {
      return { ok: false, reason: "unknown" };
    }
    if (chunk.done) break;
    received += chunk.value.byteLength;
    if (received > cap) {
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
      return { ok: false, reason: "too-large" };
    }
    body += decoder.decode(chunk.value, { stream: true });
  }
  body += decoder.decode();
  return { ok: true, body };
}

async function fetchUncached(
  repositoryUrl: string,
  filename: string,
): Promise<FetchResult> {
  const parsed = parseGithubRepo(repositoryUrl);
  if (!parsed) return { ok: false, reason: "not-github" };

  const url = `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/HEAD/${filename}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "text/plain, text/markdown, */*;q=0.5" },
      cache: "no-store",
    });

    if (!response.ok) {
      return { ok: false, reason: "http" };
    }

    const read = await readWithCap(response, MAX_BYTES);
    if (!read.ok) return read;
    return { ok: true, body: read.body };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, reason: "timeout" };
    }
    return { ok: false, reason: "unknown" };
  } finally {
    clearTimeout(timer);
  }
}

export const fetchGithubRaw = cache(fetchUncached);

// CRA signal: does the repo publish a security/vulnerability-disclosure policy?
// Probes the conventional SECURITY.md locations through the raw fetch. Soft —
// any non-ok result (404 / non-GitHub / error) simply means "not detected".
async function fetchSecurityPolicyUncached(repositoryUrl: string): Promise<boolean> {
  // Probe the candidates in parallel so a repo without a policy costs one
  // round-trip's latency, not three. Each fetch is itself cached (1h).
  const results = await Promise.all(
    SECURITY_POLICY_CANDIDATES.map((c) => fetchGithubRaw(repositoryUrl, c)),
  );
  return results.some((r) => r.ok);
}

export const fetchSecurityPolicyPresence = cache(fetchSecurityPolicyUncached);

export type RepoMeta = {
  stars: number | null;
  forks: number | null;
  license: string | null;
  // Last push to the default branch — the maintenance signal (CRA-readiness).
  pushed_at: string | null;
};

// Live repo metadata (stars + SPDX license) from the GitHub API. Cached at the
// Data Cache layer for 1h, so even a busy detail page makes at most one API call
// per repo per hour — keeps us comfortably inside the unauthenticated rate limit
// without a token. `GITHUB_TOKEN`, if present, simply raises that ceiling.
async function fetchRepoMetaUncached(repositoryUrl: string): Promise<RepoMeta | null> {
  const parsed = parseGithubRepo(repositoryUrl);
  if (!parsed) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const response = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
      { signal: controller.signal, headers, next: { revalidate: 3600 } },
    );
    if (!response.ok) return null;

    const json = await response.json();
    const spdx = json?.license?.spdx_id;
    return {
      stars: Number.isFinite(json?.stargazers_count) ? json.stargazers_count : null,
      forks: Number.isFinite(json?.forks_count) ? json.forks_count : null,
      // "NOASSERTION" = GitHub could not detect a recognized license
      license: spdx && spdx !== "NOASSERTION" ? spdx : null,
      pushed_at: typeof json?.pushed_at === "string" ? json.pushed_at : null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export const fetchGithubRepoMeta = cache(fetchRepoMetaUncached);

export type RepoVersion = {
  version: string;
  date: string | null;
  notes: string | null;
  url: string | null;
  zip: string | null;
};

function ghHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return headers;
}

// Versions for the detail page's Versions tab — fetched only when that tab is
// opened. Prefers GitHub Releases (tag + date + notes); falls back to plain Tags
// so tagged-but-unreleased versions still show. 1h Data Cache.
async function fetchVersionsUncached(repositoryUrl: string): Promise<RepoVersion[] | null> {
  const parsed = parseGithubRepo(repositoryUrl);
  if (!parsed) return null;
  const base = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`;

  const archiveZip = (tag: string) =>
    `https://github.com/${parsed.owner}/${parsed.repo}/archive/refs/tags/${encodeURIComponent(tag)}.zip`;

  try {
    const rel = await fetch(`${base}/releases?per_page=30`, {
      headers: ghHeaders(),
      next: { revalidate: 3600 },
    });
    if (rel.ok) {
      const arr = await rel.json();
      if (Array.isArray(arr) && arr.length > 0) {
        return arr.map((x) => {
          const tag = String(x?.tag_name || x?.name || "—");
          return {
            version: tag,
            date: x?.published_at ?? null,
            notes: x?.body ?? null,
            url: x?.html_url ?? null,
            zip: x?.tag_name ? archiveZip(x.tag_name) : null,
          };
        });
      }
    }

    const tags = await fetch(`${base}/tags?per_page=30`, {
      headers: ghHeaders(),
      next: { revalidate: 3600 },
    });
    if (tags.ok) {
      const arr = await tags.json();
      if (Array.isArray(arr)) {
        return arr.map((x) => {
          const tag = String(x?.name || "—");
          return {
            version: tag,
            date: null,
            notes: null,
            url: `https://github.com/${parsed.owner}/${parsed.repo}/releases/tag/${encodeURIComponent(tag)}`,
            zip: x?.name ? archiveZip(x.name) : null,
          };
        });
      }
    }
    return [];
  } catch {
    return null;
  }
}

export const fetchGithubVersions = cache(fetchVersionsUncached);

// A dependency declared in the repo's pubpascal.json (our own manifest).
export type ManifestDependency = { key: string; version: string };

// Reads the declared `dependencies` from the repo's pubpascal.json. Returns null
// when it is absent (the package hasn't adopted our manifest yet) or it can't be
// parsed. Metadata-only, raw fetch. 1h cache.
async function fetchManifestDepsUncached(
  repositoryUrl: string,
): Promise<ManifestDependency[] | null> {
  const fetched = await fetchGithubRaw(repositoryUrl, "pubpascal.json");
  if (!fetched.ok) return null;
  try {
    const manifest = JSON.parse(fetched.body) as {
      dependencies?: Record<string, string>;
    };
    return Object.entries(manifest.dependencies ?? {}).map(([key, version]) => ({
      key,
      version: String(version ?? ""),
    }));
  } catch {
    return null;
  }
}

export const fetchManifestDependencies = cache(fetchManifestDepsUncached);

// Host-agnostic repo identity (owner/repo) so a manifest dep key ("owner/repo")
// matches a package's repository_url ("https://github.com/owner/repo").
export function repoSlugFromUrl(url: string): string {
  const norm = url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^git@/, "")
    .replace(/:/g, "/")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");
  const parts = norm.split("/").filter(Boolean);
  return parts.length >= 2 ? parts.slice(-2).join("/") : norm;
}

export function isGithubRepo(repositoryUrl: string | null | undefined): boolean {
  if (!repositoryUrl) return false;
  return parseGithubRepo(repositoryUrl) !== null;
}

// A file entry from the GitHub contents API listing of a directory.
export type RepoContentFile = { name: string; path: string };

// Lists the files in a repo directory via the GitHub contents API
// (api.github.com/repos/<owner>/<repo>/contents/<dir>). Returns only file
// entries (type === "file"). Soft — any non-ok result (404 / non-GitHub / error)
// yields an empty array, so a repo without the directory simply lists nothing.
// `GITHUB_TOKEN`, if present, raises the unauthenticated rate-limit ceiling.
async function listRepoDirUncached(
  repositoryUrl: string,
  dir: string,
): Promise<RepoContentFile[]> {
  const parsed = parseGithubRepo(repositoryUrl);
  if (!parsed) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/${dir}`,
      { signal: controller.signal, headers: ghHeaders(), next: { revalidate: 3600 } },
    );
    if (!response.ok) return [];
    const json = await response.json();
    if (!Array.isArray(json)) return [];
    return json
      .filter((x) => x && x.type === "file" && typeof x.name === "string")
      .map((x) => ({ name: String(x.name), path: String(x.path ?? x.name) }));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export const listRepoDir = cache(listRepoDirUncached);
