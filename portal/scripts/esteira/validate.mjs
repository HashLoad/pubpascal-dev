#!/usr/bin/env node
// Esteira validation script — pure file-system inspection, Node 20 ESM.
// CLI: node validate.mjs <target-dir> <slug> [--repo <repository_url>]
// Env: ESTEIRA_CLONE_STATUS = ok | failed | not_supported   (default: ok)
// Always exits 0. The verdict is in `validation-report.json`.

import { readdir, readFile, stat } from "node:fs/promises";
import { join, basename, extname, resolve } from "node:path";
import { argv, cwd, env, exit } from "node:process";

const SCHEMA_VERSION = 1;
const README_MIN_BYTES = 200;
const MAX_DEPTH = 8;
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", "out"]);
const PASCAL_EXTS = new Set([
  ".pas",
  ".pp",
  ".lpr",
  ".dpr",
  ".dproj",
  ".lpi",
  ".lpk",
  ".bpl",
]);
const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"]);
const IMAGE_DIRS = ["images", "assets", "docs/images", "screenshots"];
const README_FILENAMES = ["readme.md", "readme.txt", "readme"];
const CHANGELOG_FILENAMES = ["changelog.md", "changes.md", "history.md"];
const EXAMPLE_FILENAMES = ["example.md", "examples.md"];
const INSTALL_FILENAMES = ["install.md", "installing.md"];
const INSTALL_README_HEADINGS = [
  "## install",
  "## installing",
  "## instalação",
];
const FAIL_SEVERITY_KEYS = new Set([
  "has_readme",
  "has_pascal_sources",
  "repo_clonable",
]);
const RULE_ORDER = [
  "has_readme",
  "has_changelog",
  "has_examples",
  "has_installing",
  "has_images",
  "has_pascal_sources",
  "has_license",
  "repo_clonable",
];

function parseArgs(args) {
  const positional = [];
  let repo = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--repo") {
      repo = args[i + 1] ?? null;
      i++;
    } else {
      positional.push(args[i]);
    }
  }
  return { positional, repo };
}

async function listEntries(dir) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function dirExists(path) {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function findInRoot(targetDir, candidates) {
  const entries = await listEntries(targetDir);
  const lower = candidates.map((c) => c.toLowerCase());
  for (const entry of entries) {
    if (entry.isFile() && lower.includes(entry.name.toLowerCase())) {
      return join(targetDir, entry.name);
    }
  }
  return null;
}

async function checkReadme(targetDir) {
  const path = await findInRoot(targetDir, README_FILENAMES);
  if (!path) {
    return {
      key: "has_readme",
      outcome: "fail",
      detail: "No README file found at the repository root.",
    };
  }
  try {
    const buf = await readFile(path);
    if (buf.byteLength < README_MIN_BYTES) {
      return {
        key: "has_readme",
        outcome: "fail",
        detail: `README is shorter than ${README_MIN_BYTES} bytes (${buf.byteLength}).`,
      };
    }
    return {
      key: "has_readme",
      outcome: "pass",
      detail: `Found ${basename(path)} (${buf.byteLength} bytes).`,
    };
  } catch (err) {
    return {
      key: "has_readme",
      outcome: "fail",
      detail: `Could not read README: ${err.message}`,
    };
  }
}

async function checkChangelog(targetDir) {
  const path = await findInRoot(targetDir, CHANGELOG_FILENAMES);
  if (path) {
    return {
      key: "has_changelog",
      outcome: "pass",
      detail: `Found ${basename(path)}.`,
    };
  }
  return {
    key: "has_changelog",
    outcome: "fail",
    detail: "No CHANGELOG / CHANGES / HISTORY file at the repository root.",
  };
}

async function checkExamples(targetDir) {
  const examplesDir = join(targetDir, "examples");
  if (await dirExists(examplesDir)) {
    const entries = await listEntries(examplesDir);
    if (entries.length > 0) {
      return {
        key: "has_examples",
        outcome: "pass",
        detail: `examples/ directory has ${entries.length} entries.`,
      };
    }
  }
  const path = await findInRoot(targetDir, EXAMPLE_FILENAMES);
  if (path) {
    return {
      key: "has_examples",
      outcome: "pass",
      detail: `Found ${basename(path)}.`,
    };
  }
  return {
    key: "has_examples",
    outcome: "fail",
    detail: "No examples/ directory or EXAMPLE(S).md file.",
  };
}

async function readmeHasInstallSection(targetDir) {
  const readmePath = await findInRoot(targetDir, README_FILENAMES);
  if (!readmePath) return false;
  try {
    const text = await readFile(readmePath, "utf8");
    const lowered = text.toLowerCase();
    return INSTALL_README_HEADINGS.some((h) =>
      lowered.split("\n").some((line) => line.trimStart().startsWith(h)),
    );
  } catch {
    return false;
  }
}

async function checkInstalling(targetDir) {
  const path = await findInRoot(targetDir, INSTALL_FILENAMES);
  if (path) {
    return {
      key: "has_installing",
      outcome: "pass",
      detail: `Found ${basename(path)}.`,
    };
  }
  if (await readmeHasInstallSection(targetDir)) {
    return {
      key: "has_installing",
      outcome: "pass",
      detail: "README contains an Install / Installing / Instalação section.",
    };
  }
  return {
    key: "has_installing",
    outcome: "fail",
    detail: "No INSTALL(ING).md and no install section in README.",
  };
}

async function checkImages(targetDir) {
  for (const subdir of IMAGE_DIRS) {
    const full = join(targetDir, ...subdir.split("/"));
    if (!(await dirExists(full))) continue;
    const found = await findImage(full, 0);
    if (found) {
      return {
        key: "has_images",
        outcome: "pass",
        detail: `Found ${found} under ${subdir}/.`,
      };
    }
  }
  return {
    key: "has_images",
    outcome: "fail",
    detail: "No image assets found under images/, assets/, docs/images/, or screenshots/.",
  };
}

async function findImage(dir, depth) {
  if (depth > MAX_DEPTH) return null;
  const entries = await listEntries(dir);
  for (const entry of entries) {
    if (entry.isFile()) {
      if (IMAGE_EXTS.has(extname(entry.name).toLowerCase())) {
        return entry.name;
      }
    } else if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
      const nested = await findImage(join(dir, entry.name), depth + 1);
      if (nested) return nested;
    }
  }
  return null;
}

async function findPascalSource(dir, depth) {
  if (depth > MAX_DEPTH) return null;
  const entries = await listEntries(dir);
  for (const entry of entries) {
    if (entry.isFile()) {
      if (PASCAL_EXTS.has(extname(entry.name).toLowerCase())) {
        return entry.name;
      }
    } else if (
      entry.isDirectory() &&
      !SKIP_DIRS.has(entry.name) &&
      !entry.isSymbolicLink()
    ) {
      const nested = await findPascalSource(join(dir, entry.name), depth + 1);
      if (nested) return nested;
    }
  }
  return null;
}

async function checkPascalSources(targetDir) {
  const found = await findPascalSource(targetDir, 0);
  if (found) {
    return {
      key: "has_pascal_sources",
      outcome: "pass",
      detail: `Found ${found}.`,
    };
  }
  return {
    key: "has_pascal_sources",
    outcome: "fail",
    detail: "No Pascal source files (.pas/.pp/.lpr/.dpr/.dproj/.lpi/.lpk/.bpl) found.",
  };
}

async function checkLicense(targetDir) {
  const entries = await listEntries(targetDir);
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const baseLower = entry.name.toLowerCase().split(".")[0];
    if (baseLower === "license" || baseLower === "licence") {
      return {
        key: "has_license",
        outcome: "pass",
        detail: `Found ${entry.name}.`,
      };
    }
  }
  return {
    key: "has_license",
    outcome: "fail",
    detail: "No LICENSE file at the repository root.",
  };
}

function repoClonableFromEnv() {
  const status = (env.ESTEIRA_CLONE_STATUS ?? "ok").toLowerCase();
  if (status === "not_supported") {
    return {
      key: "repo_clonable",
      outcome: "not_supported",
      detail: "Host is not supported by the Esteira (GitHub only in this cycle).",
    };
  }
  if (status === "failed") {
    return {
      key: "repo_clonable",
      outcome: "fail",
      detail: "Clone step failed (repository missing, private, or network error).",
    };
  }
  return {
    key: "repo_clonable",
    outcome: "pass",
    detail: "Repository cloned successfully.",
  };
}

function placeholderResult(key, outcome, detail) {
  return { key, outcome, detail };
}

function applyWarnSeverity(rule) {
  if (rule.outcome !== "fail") return rule;
  if (FAIL_SEVERITY_KEYS.has(rule.key)) return rule;
  return { ...rule, outcome: "warn" };
}

function aggregateVerdict(rules) {
  const clonable = rules.find((r) => r.key === "repo_clonable");
  if (clonable?.outcome === "not_supported") return "not_supported";
  if (rules.some((r) => r.outcome === "fail")) return "rejected";
  if (rules.some((r) => r.outcome === "warn")) return "approved_with_warnings";
  return "approved";
}

async function evaluateRules(targetDir, clonable) {
  if (clonable.outcome !== "pass") {
    return RULE_ORDER.map((key) => {
      if (key === "repo_clonable") return clonable;
      return placeholderResult(
        key,
        "fail",
        "Skipped because repository was not cloned.",
      );
    }).map(applyWarnSeverity);
  }

  const collected = await Promise.all([
    checkReadme(targetDir),
    checkChangelog(targetDir),
    checkExamples(targetDir),
    checkInstalling(targetDir),
    checkImages(targetDir),
    checkPascalSources(targetDir),
    checkLicense(targetDir),
  ]);

  const byKey = new Map();
  for (const rule of collected) byKey.set(rule.key, rule);
  byKey.set("repo_clonable", clonable);

  return RULE_ORDER.map((key) =>
    applyWarnSeverity(
      byKey.get(key) ?? placeholderResult(key, "fail", "Rule did not run."),
    ),
  );
}

async function writeReport(report) {
  const target = resolve(cwd(), "validation-report.json");
  const { writeFile } = await import("node:fs/promises");
  await writeFile(target, JSON.stringify(report, null, 2) + "\n", "utf8");
  return target;
}

async function main() {
  const { positional, repo } = parseArgs(argv.slice(2));
  const [targetArg, slug] = positional;

  if (!targetArg || !slug) {
    console.error(
      "Usage: node validate.mjs <target-dir> <slug> [--repo <repository_url>]",
    );
    exit(2);
  }

  const targetDir = resolve(cwd(), targetArg);
  const repositoryUrl = repo ?? "";
  const clonable = repoClonableFromEnv();

  let rules;
  try {
    rules = await evaluateRules(targetDir, clonable);
  } catch (err) {
    rules = RULE_ORDER.map((key) => {
      if (key === "repo_clonable") return clonable;
      return placeholderResult(
        key,
        "fail",
        `internal_error: ${err.message}`,
      );
    }).map(applyWarnSeverity);
  }

  const report = {
    schema_version: SCHEMA_VERSION,
    slug,
    repository_url: repositoryUrl,
    generated_at: new Date().toISOString(),
    verdict: aggregateVerdict(rules),
    rules,
  };

  const path = await writeReport(report);
  console.log(`Esteira report written to ${path}`);
  console.log(`Verdict: ${report.verdict}`);
  for (const rule of rules) {
    console.log(`  - ${rule.key}: ${rule.outcome} (${rule.detail})`);
  }
}

main().catch((err) => {
  console.error("Esteira fatal error:", err);
  exit(0);
});
