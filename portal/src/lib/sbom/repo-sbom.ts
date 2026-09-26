import "server-only";
import { cache } from "react";
import { parseSbom } from "@/app/api/packages/[slug]/[version]/sbom/parse";
import {
  fetchGithubRaw,
  listRepoDir,
  rawFileUrl,
} from "@/app/[lang]/packages/[slug]/github";

// Live SBOM reader. The SBOM is the REPO's responsibility, not our database:
// on every package-detail render we read it straight from the repo (like the
// SECURITY.md and "maintained" signals), classify the CRA "Software Bill of
// Materials" signal from that, and self-correct — an SBOM deleted in the repo
// flips the signal false on the next render. NO DB, NO service client; the
// underlying GitHub fetches are already Data-Cached for 1h. Fail-soft
// throughout: any GH/parse error yields null ("not detected"), never throws.

export type RepoSbom = {
  format: "cyclonedx" | "spdx";
  specVersion: string | null;
  author: string | null;
  version: string | null;
  timestamp: string | null;
  downloadUrl: string;
};

// Root-level SBOM filenames probed directly via the raw fetch (the contents API
// only lists the sbom/ directory). Conventional CycloneDX/SPDX drop names.
const ROOT_CANDIDATES = ["sbom.cdx.json", "sbom.spdx.json", "bom.json"];

const SEMVER_IN_NAME = /(\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?)/;

// The attested version: CycloneDX exposes it at metadata.component.version; SPDX
// has no single canonical package version, so fall back to the filename for
// both. Returns null when neither yields one.
function versionFromDocument(document: unknown, filename: string): string | null {
  const doc = document as Record<string, unknown> | null;
  if (doc && typeof doc === "object") {
    const meta = doc.metadata as Record<string, unknown> | undefined;
    const component = meta?.component as Record<string, unknown> | undefined;
    if (component && typeof component.version === "string" && component.version.trim()) {
      return component.version.trim();
    }
  }
  const m = SEMVER_IN_NAME.exec(filename);
  return m ? m[1] : null;
}

// CycloneDX metadata.timestamp when present, else null.
function timestampFromDocument(document: unknown): string | null {
  const doc = document as Record<string, unknown> | null;
  const meta = doc?.metadata as Record<string, unknown> | undefined;
  return typeof meta?.timestamp === "string" ? meta.timestamp : null;
}

// Compare two semver-ish strings; returns >0 when a sorts after b. Falls back to
// a lexical compare for non-numeric tails so anything still orders deterministically.
function compareSemver(a: string, b: string): number {
  const parse = (v: string) =>
    v
      .replace(/^[^\d]*/, "")
      .split(/[.+-]/)
      .map((p) => Number.parseInt(p, 10));
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const na = pa[i];
    const nb = pb[i];
    const aNum = Number.isFinite(na);
    const bNum = Number.isFinite(nb);
    if (aNum && bNum) {
      if (na !== nb) return na - nb;
    } else if (aNum !== bNum) {
      return aNum ? 1 : -1;
    }
  }
  return a.localeCompare(b);
}

type Candidate = { name: string; path: string; text: string };

async function fetchRepoSbomUncached(repoUrl: string): Promise<RepoSbom | null> {
  // Collect candidate (filename, path, raw-text) triples. Two discovery
  // channels: the sbom/ directory listed via the contents API, plus the
  // conventional root drop-names probed directly. Each fetch is fail-soft.
  const candidates: Candidate[] = [];

  try {
    const dirFiles = await listRepoDir(repoUrl, "sbom");
    const sbomFiles = dirFiles.filter(
      (f) => f.name.endsWith(".cdx.json") || f.name.endsWith(".spdx.json"),
    );
    for (const file of sbomFiles) {
      try {
        const fetched = await fetchGithubRaw(repoUrl, file.path);
        if (fetched.ok) candidates.push({ name: file.name, path: file.path, text: fetched.body });
      } catch {
        // skip this file
      }
    }
  } catch {
    // directory listing failed — fall through to the root probes
  }

  for (const name of ROOT_CANDIDATES) {
    try {
      const fetched = await fetchGithubRaw(repoUrl, name);
      if (fetched.ok) candidates.push({ name, path: name, text: fetched.body });
    } catch {
      // skip this candidate
    }
  }

  // Parse each; skip invalid. Keep the BEST: highest-semver version; ties (or no
  // version at all) keep the first valid one encountered.
  let best: RepoSbom | null = null;
  for (const candidate of candidates) {
    let body: unknown;
    try {
      body = JSON.parse(candidate.text);
    } catch {
      continue;
    }
    const parsed = parseSbom(null, body);
    if (parsed === null) continue;

    const version = versionFromDocument(parsed.document, candidate.name);
    const current: RepoSbom = {
      format: parsed.format,
      specVersion: parsed.specVersion,
      author: parsed.author,
      version,
      timestamp: timestampFromDocument(parsed.document),
      downloadUrl: rawFileUrl(repoUrl, candidate.path),
    };

    if (best === null) {
      best = current;
      continue;
    }
    if (
      current.version !== null &&
      (best.version === null || compareSemver(current.version, best.version) > 0)
    ) {
      best = current;
    }
  }

  return best;
}

// React-cache the export so repeated calls in one render dedupe.
export const fetchRepoSbom = cache(fetchRepoSbomUncached);
