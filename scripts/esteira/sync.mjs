#!/usr/bin/env node
// Esteira sync — pulls pending packages from Supabase, runs the Demand 2/3 validator
// against each, writes back status + validation_report.
//
// CLI: node sync.mjs [--limit <n>] [--dry-run] [--cwd <dir>]
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (required unless --dry-run with --offline)

import { createClient } from "@supabase/supabase-js";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { argv, cwd, env, exit, stdout } from "node:process";

const SCHEMA_VERSION = 1;
const REPO_HOST_REGEX =
  /^https:\/\/(?:github|gitlab|bitbucket)\.(?:com|org)\/[^/]+\/[^/]+\/?$/i;
const GITHUB_OWNER_REGEX =
  /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i;

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

const CLONE_TIMEOUT_MS = 60_000;
const LIMIT_MIN = 1;
const LIMIT_MAX = 50;
const LIMIT_DEFAULT = 10;

const here = dirname(fileURLToPath(import.meta.url));
const validatorPath = resolve(here, "validate.mjs");

function parseArgs(args) {
  let limit = LIMIT_DEFAULT;
  let dryRun = false;
  let revalidate = false;
  let workingDir = cwd();
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--limit") {
      const raw = Number.parseInt(args[i + 1] ?? "", 10);
      if (Number.isFinite(raw)) {
        limit = Math.min(LIMIT_MAX, Math.max(LIMIT_MIN, raw));
      }
      i++;
    } else if (args[i] === "--dry-run") {
      dryRun = true;
    } else if (args[i] === "--revalidate") {
      // Re-run validation against ACTIVE packages and refresh validation_report
      // only (status is left untouched). Use to backfill Pub Points for packages
      // that became active without passing through the pending pipeline (seeds).
      revalidate = true;
    } else if (args[i] === "--cwd") {
      workingDir = resolve(args[i + 1] ?? cwd());
      i++;
    }
  }
  return { limit, dryRun, revalidate, cwd: workingDir };
}

export function mapVerdictToStatus(verdict) {
  switch (verdict) {
    case "approved":
    case "approved_with_warnings":
      return "active";
    case "rejected":
    case "not_supported":
      return "rejected";
    default:
      return "rejected";
  }
}

function syntheticReport({ slug, repositoryUrl, repoClonableOutcome, repoClonableDetail }) {
  const skippedDetail = "Skipped because repository was not cloned.";
  const FAIL_SEVERITY = new Set(["has_readme", "has_pascal_sources", "repo_clonable"]);
  const rules = RULE_ORDER.map((key) => {
    if (key === "repo_clonable") {
      return { key, outcome: repoClonableOutcome, detail: repoClonableDetail };
    }
    const outcome = FAIL_SEVERITY.has(key) ? "fail" : "warn";
    return { key, outcome, detail: skippedDetail };
  });

  let verdict;
  if (repoClonableOutcome === "not_supported") verdict = "not_supported";
  else verdict = "rejected";

  return {
    schema_version: SCHEMA_VERSION,
    slug,
    repository_url: repositoryUrl,
    generated_at: new Date().toISOString(),
    verdict,
    rules,
  };
}

function isGithubRepo(url) {
  return GITHUB_OWNER_REGEX.test(url ?? "");
}

function isAllowedHost(url) {
  return REPO_HOST_REGEX.test(url ?? "");
}

async function cloneRepo(repoUrl, dest) {
  return new Promise((resolveFn) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CLONE_TIMEOUT_MS);
    const child = spawn(
      "git",
      ["clone", "--depth=1", "--quiet", repoUrl, dest],
      { signal: controller.signal, stdio: "ignore" },
    );
    child.on("close", (code) => {
      clearTimeout(timer);
      resolveFn(code === 0);
    });
    child.on("error", () => {
      clearTimeout(timer);
      resolveFn(false);
    });
  });
}

async function runValidator(targetDir, slug, repositoryUrl, workingDir) {
  return new Promise((resolveFn) => {
    const child = spawn(
      process.execPath,
      [validatorPath, targetDir, slug, "--repo", repositoryUrl],
      {
        cwd: workingDir,
        env: { ...env, ESTEIRA_CLONE_STATUS: "ok" },
        stdio: "ignore",
      },
    );
    child.on("close", () => resolveFn(true));
    child.on("error", () => resolveFn(false));
  });
}

async function readReport(workingDir) {
  const reportPath = join(workingDir, "validation-report.json");
  const raw = await readFile(reportPath, "utf8");
  return JSON.parse(raw);
}

async function processRow(row, options) {
  const { workingDir } = options;
  const { slug, repository_url: repositoryUrl } = row;

  if (!isAllowedHost(repositoryUrl)) {
    return syntheticReport({
      slug,
      repositoryUrl,
      repoClonableOutcome: "not_supported",
      repoClonableDetail:
        "Repository host is not in the supported allow-list (github.com, gitlab.com, bitbucket.org).",
    });
  }

  if (!isGithubRepo(repositoryUrl)) {
    return syntheticReport({
      slug,
      repositoryUrl,
      repoClonableOutcome: "not_supported",
      repoClonableDetail: "Host is not supported by the Esteira (GitHub only in this cycle).",
    });
  }

  // Note: --dry-run still clones + validates so the operator sees a real verdict per row.
  // Only the DB UPDATE is skipped (handled in main()).
  const tempDir = await mkdtemp(join(tmpdir(), "esteira-"));
  try {
    const cloned = await cloneRepo(repositoryUrl, tempDir);
    if (!cloned) {
      return syntheticReport({
        slug,
        repositoryUrl,
        repoClonableOutcome: "fail",
        repoClonableDetail:
          "Clone step failed (repository missing, private, timed out, or network error).",
      });
    }

    await runValidator(tempDir, slug, repositoryUrl, workingDir);
    return await readReport(workingDir);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function redactedError(err) {
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/(SUPABASE_[A-Z_]*KEY)=\S+/gi, "$1=<redacted>");
}

function logSafe(message) {
  stdout.write(`${message}\n`);
}

async function selectByStatus(supabase, status, limit) {
  const { data, error } = await supabase
    .from("packages")
    .select("id, slug, name, repository_url")
    .eq("status", status)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Failed to read ${status} packages: ${error.message}`);
  return data ?? [];
}

// Revalidate mode: refresh validation_report on an ACTIVE package without
// touching its status (backfills Pub Points for seed-created packages).
async function updateReportOnly(supabase, row, report) {
  const { data, error } = await supabase
    .from("packages")
    .update({ validation_report: report, updated_at: new Date().toISOString() })
    .eq("id", row.id)
    .eq("status", "active")
    .select("id");

  if (error) throw new Error(`Failed to refresh report for ${row.slug}: ${error.message}`);
  return { newStatus: "active", updated: (data ?? []).length > 0 };
}

async function updatePackage(supabase, row, report) {
  const newStatus = mapVerdictToStatus(report.verdict);
  const { data, error } = await supabase
    .from("packages")
    .update({
      status: newStatus,
      validation_report: report,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("status", "pending")
    .select("id");

  if (error) throw new Error(`Failed to update package ${row.slug}: ${error.message}`);
  const updated = (data ?? []).length > 0;
  return { newStatus, updated };
}

async function main() {
  const options = parseArgs(argv.slice(2));
  const { limit, dryRun, revalidate, cwd: workingDir } = options;
  const status = revalidate ? "active" : "pending";

  const supabaseUrl = env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error(
      "Missing required environment: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.",
    );
    exit(2);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  let pending;
  try {
    pending = await selectByStatus(supabase, status, limit);
  } catch (err) {
    console.error(redactedError(err));
    exit(1);
  }

  logSafe(`Esteira sync — found ${pending.length} ${status} package(s) (limit=${limit}, dry_run=${dryRun}, revalidate=${revalidate}).`);

  const entries = [];
  let active = 0;
  let rejected = 0;
  let errors = 0;

  for (const row of pending) {
    const entry = {
      slug: row.slug,
      repository_url: row.repository_url,
      prior_status: status,
      new_status: null,
      verdict: null,
    };

    try {
      const report = await processRow(row, { dryRun, workingDir });
      entry.verdict = report.verdict;
      const targetStatus = mapVerdictToStatus(report.verdict);

      if (dryRun) {
        entry.new_status = targetStatus;
        logSafe(
          `  [dry-run] ${row.slug}: ${entry.prior_status} → ${targetStatus} (verdict=${report.verdict})`,
        );
      } else {
        const { newStatus, updated } = revalidate
          ? await updateReportOnly(supabase, row, report)
          : await updatePackage(supabase, row, report);
        entry.new_status = updated ? newStatus : null;
        if (!updated) {
          entry.error = `Row was no longer ${status}; UPDATE matched zero rows.`;
          logSafe(`  ${row.slug}: skipped (no longer ${status})`);
        } else {
          logSafe(
            `  ${row.slug}: ${entry.prior_status} → ${newStatus} (verdict=${report.verdict})`,
          );
        }
      }

      if (entry.error) {
        errors++;
      } else if (entry.new_status === "active") {
        active++;
      } else if (entry.new_status === "rejected") {
        rejected++;
      }
    } catch (err) {
      entry.error = redactedError(err);
      errors++;
      logSafe(`  ${row.slug}: ERROR — ${entry.error}`);
    }

    entries.push(entry);
  }

  const summary = {
    generated_at: new Date().toISOString(),
    batch_size: pending.length,
    dry_run: dryRun,
    totals: { active, rejected, errors },
    entries,
  };

  const summaryPath = join(workingDir, "esteira-sync-summary.json");
  await writeFile(summaryPath, JSON.stringify(summary, null, 2) + "\n", "utf8");

  logSafe(
    `Processed ${pending.length} row(s): {active: ${active}, rejected: ${rejected}, errors: ${errors}}`,
  );
  logSafe(`Summary written to ${summaryPath}`);
}

const invokedDirectly =
  argv[1] && resolve(argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().catch((err) => {
    console.error(redactedError(err));
    exit(1);
  });
}
