// Live repo-SBOM reader unit suite. Node env (no DOM). The GitHub fetch seams
// (directory listing + raw file fetch) are stubbed; rawFileUrl is exercised for
// real. A repo shipping a CycloneDX SBOM is detected + classified live (no DB);
// a repo with no SBOM yields null and never throws. Best-pick prefers the
// highest semver across multiple candidates.
import { describe, it, expect, vi, beforeEach } from "vitest";

// `server-only` is a Next.js bundler marker with no Node entry point; stub it so
// the module is importable under the node test runner.
vi.mock("server-only", () => ({}));

const listRepoDir = vi.fn();
const fetchGithubRaw = vi.fn();
vi.mock("@/app/[lang]/packages/[slug]/github", () => ({
  listRepoDir: (...args: unknown[]) => listRepoDir(...args),
  fetchGithubRaw: (...args: unknown[]) => fetchGithubRaw(...args),
  rawFileUrl: (repoUrl: string, path: string) => {
    const m = /github\.com\/([^/]+)\/([^/]+)/.exec(repoUrl);
    if (!m) return repoUrl;
    return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/HEAD/${path}`;
  },
}));

import { fetchRepoSbom } from "./repo-sbom";

const cdx = (version: string, timestamp?: string) =>
  JSON.stringify({
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    metadata: {
      ...(timestamp ? { timestamp } : {}),
      component: { name: "demo", version },
      tools: [{ vendor: "DPM", name: "dpm" }],
    },
  });

beforeEach(() => {
  listRepoDir.mockReset();
  fetchGithubRaw.mockReset();
});

describe("fetchRepoSbom", () => {
  it("detects + classifies a CycloneDX SBOM live from the repo", async () => {
    listRepoDir.mockResolvedValue([{ name: "bom.cdx.json", path: "sbom/bom.cdx.json" }]);
    fetchGithubRaw.mockImplementation(async (_url: string, path: string) =>
      path === "sbom/bom.cdx.json"
        ? { ok: true, body: cdx("2.1.0", "2026-01-02T03:04:05Z") }
        : { ok: false, reason: "http" },
    );

    const result = await fetchRepoSbom("https://github.com/o/r");

    expect(result).toEqual({
      format: "cyclonedx",
      specVersion: "1.5",
      author: "DPM dpm",
      version: "2.1.0",
      timestamp: "2026-01-02T03:04:05Z",
      downloadUrl: "https://raw.githubusercontent.com/o/r/HEAD/sbom/bom.cdx.json",
    });
  });

  it("returns null without throwing when the repo ships no SBOM", async () => {
    listRepoDir.mockResolvedValue([]);
    fetchGithubRaw.mockResolvedValue({ ok: false, reason: "http" });

    await expect(fetchRepoSbom("https://github.com/o/r")).resolves.toBeNull();
  });

  it("picks the highest-semver SBOM among multiple candidates", async () => {
    listRepoDir.mockResolvedValue([
      { name: "old.cdx.json", path: "sbom/old.cdx.json" },
      { name: "new.cdx.json", path: "sbom/new.cdx.json" },
    ]);
    fetchGithubRaw.mockImplementation(async (_url: string, path: string) => {
      if (path === "sbom/old.cdx.json") return { ok: true, body: cdx("1.0.0") };
      if (path === "sbom/new.cdx.json") return { ok: true, body: cdx("2.3.4") };
      return { ok: false, reason: "http" };
    });

    const result = await fetchRepoSbom("https://github.com/o/r");
    expect(result?.version).toBe("2.3.4");
    expect(result?.downloadUrl).toBe(
      "https://raw.githubusercontent.com/o/r/HEAD/sbom/new.cdx.json",
    );
  });

  it("skips invalid JSON / non-SBOM bodies and falls back to the root probe", async () => {
    listRepoDir.mockResolvedValue([{ name: "junk.cdx.json", path: "sbom/junk.cdx.json" }]);
    fetchGithubRaw.mockImplementation(async (_url: string, path: string) => {
      if (path === "sbom/junk.cdx.json") return { ok: true, body: "{ not json" };
      if (path === "sbom.cdx.json") return { ok: true, body: cdx("3.0.0") };
      return { ok: false, reason: "http" };
    });

    const result = await fetchRepoSbom("https://github.com/o/r");
    expect(result?.version).toBe("3.0.0");
  });
});
