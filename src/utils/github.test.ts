import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseGithubUrl, forkGithubRepo, createGithubPullRequest } from "./github";

describe("parseGithubUrl", () => {
  it("parses raw github slugs", () => {
    const res = parseGithubUrl("github.com/HashLoad/nidus");
    expect(res).not.toBeNull();
    expect(res?.owner).toBe("HashLoad");
    expect(res?.repo).toBe("nidus");
  });

  it("parses HTTPS repository URLs", () => {
    const res = parseGithubUrl("https://github.com/HashLoad/nidus");
    expect(res).not.toBeNull();
    expect(res?.owner).toBe("HashLoad");
    expect(res?.repo).toBe("nidus");
  });

  it("parses HTTP repository URLs", () => {
    const res = parseGithubUrl("http://github.com/ModernDelphiWorks/Janus");
    expect(res).not.toBeNull();
    expect(res?.owner).toBe("ModernDelphiWorks");
    expect(res?.repo).toBe("Janus");
  });

  it("parses Git SSH repository URLs", () => {
    const res = parseGithubUrl("git@github.com:HashLoad/horse.git");
    expect(res).not.toBeNull();
    expect(res?.owner).toBe("HashLoad");
    expect(res?.repo).toBe("horse");
  });

  it("parses Git SSH repository URLs without .git extension", () => {
    const res = parseGithubUrl("git@github.com:user/repo");
    expect(res).not.toBeNull();
    expect(res?.owner).toBe("user");
    expect(res?.repo).toBe("repo");
  });

  it("parses raw username/repo slugs", () => {
    const res = parseGithubUrl("owner/my-package");
    expect(res).not.toBeNull();
    expect(res?.owner).toBe("owner");
    expect(res?.repo).toBe("my-package");
  });

  it("returns null for non-github URLs", () => {
    const res = parseGithubUrl("https://gitlab.com/owner/repo");
    expect(res).toBeNull();
  });

  it("returns null for invalid strings", () => {
    expect(parseGithubUrl("")).toBeNull();
    expect(parseGithubUrl("just-a-string")).toBeNull();
  });
});

describe("GitHub API Integrations", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    global.fetch = originalFetch;
  });

  describe("forkGithubRepo", () => {
    it("returns clone URLs on success", async () => {
      const mockForkResponse = {
        clone_url: "https://github.com/my-user/nidus.git",
        ssh_url: "git@github.com:my-user/nidus.git",
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => mockForkResponse,
      } as Response);

      const result = await forkGithubRepo("HashLoad", "nidus", "test-token");
      
      expect(result.success).toBe(true);
      expect(result.cloneUrl).toBe(mockForkResponse.clone_url);
      expect(result.sshUrl).toBe(mockForkResponse.ssh_url);
      expect(result.error).toBeUndefined();
      
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/HashLoad/nidus/forks",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Authorization": "token test-token",
            "Accept": "application/vnd.github+json",
          }),
        })
      );
    });

    it("returns error message on GitHub API failure", async () => {
      const mockErrorResponse = {
        message: "Repository not found",
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => mockErrorResponse,
      } as Response);

      const result = await forkGithubRepo("missing-owner", "missing-repo", "test-token");
      
      expect(result.success).toBe(false);
      expect(result.cloneUrl).toBeUndefined();
      expect(result.error).toBe(mockErrorResponse.message);
    });
  });

  describe("createGithubPullRequest", () => {
    it("returns PR URL on success", async () => {
      const mockPrResponse = {
        html_url: "https://github.com/HashLoad/nidus/pull/12",
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockPrResponse,
      } as Response);

      const result = await createGithubPullRequest("HashLoad", "nidus", "test-token", {
        title: "Fix bug",
        body: "Fix description",
        head: "my-user:patch-1",
        base: "main",
      });
      
      expect(result.success).toBe(true);
      expect(result.prUrl).toBe(mockPrResponse.html_url);
      expect(result.error).toBeUndefined();
      
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.github.com/repos/HashLoad/nidus/pulls",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Authorization": "token test-token",
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            title: "Fix bug",
            body: "Fix description",
            head: "my-user:patch-1",
            base: "main",
          }),
        })
      );
    });

    it("returns error message on GitHub API failure", async () => {
      const mockErrorResponse = {
        message: "Field head is invalid",
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => mockErrorResponse,
      } as Response);

      const result = await createGithubPullRequest("HashLoad", "nidus", "test-token", {
        title: "Fix bug",
        body: "Fix description",
        head: "invalid-head",
        base: "main",
      });
      
      expect(result.success).toBe(false);
      expect(result.prUrl).toBeUndefined();
      expect(result.error).toBe(mockErrorResponse.message);
    });
  });
});
