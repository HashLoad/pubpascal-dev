#!/usr/bin/env node
// Sponsorship expiry — finds packages whose sponsorship_ends_at has passed,
// resets highlight_level='none' and sponsorship_ends_at=NULL, and flips
// matching subscriptions.status to 'expired' for audit.
//
// CLI: node expiry.mjs [--dry-run]
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (required)
// Exit codes: 0 = clean, 1 = partial row errors, 2 = missing env vars

import { createClient } from "@supabase/supabase-js";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { argv, env, exit, stdout } from "node:process";

const here = dirname(fileURLToPath(import.meta.url));
const SUMMARY_FILE = join(here, "..", "..", "expiry-summary.json");

function parseArgs(args) {
  let dryRun = false;
  for (const arg of args) {
    if (arg === "--dry-run") dryRun = true;
  }
  return { dryRun };
}

function redactedError(err) {
  const message = err instanceof Error ? err.message : String(err);
  return message.replace(/(SUPABASE_[A-Z_]*KEY)=\S+/gi, "$1=<redacted>");
}

function logSafe(message) {
  stdout.write(`${message}\n`);
}

function readEnv() {
  const supabaseUrl = env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error(
      "Missing required environment: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.",
    );
    exit(2);
  }
  return { supabaseUrl, serviceKey };
}

async function expirePackages(supabase, dryRun) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("packages")
    .select("id, slug, publisher_id, highlight_level, sponsorship_ends_at")
    .not("sponsorship_ends_at", "is", null)
    .lt("sponsorship_ends_at", now)
    .neq("highlight_level", "none");

  if (error) throw new Error(`Failed to query expired packages: ${error.message}`);

  const rows = data ?? [];
  logSafe(`Expired packages found: ${rows.length} (dry_run=${dryRun})`);

  const entries = [];
  let count = 0;
  let errors = 0;

  for (const row of rows) {
    const entry = {
      type: "package",
      id: row.id,
      slug: row.slug,
      prior_highlight_level: row.highlight_level,
      prior_sponsorship_ends_at: row.sponsorship_ends_at,
    };

    try {
      if (dryRun) {
        logSafe(`  [dry-run] package ${row.slug}: highlight_level=${row.highlight_level} → none, sponsorship_ends_at → NULL`);
        entry.action = "would_expire";
        count++;
      } else {
        const { error: updateError } = await supabase
          .from("packages")
          .update({ highlight_level: "none", sponsorship_ends_at: null })
          .eq("id", row.id)
          .neq("highlight_level", "none");

        if (updateError) throw new Error(updateError.message);
        logSafe(`  package ${row.slug}: expired (highlight_level → none)`);
        entry.action = "expired";
        count++;
      }
    } catch (err) {
      entry.error = redactedError(err);
      errors++;
      logSafe(`  package ${row.slug}: ERROR — ${entry.error}`);
    }

    entries.push(entry);
  }

  return { count, errors, entries };
}

async function expireSubscriptions(supabase, dryRun) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("id, package_id, publisher_id, sponsorship_ends_at")
    .eq("status", "active")
    .not("sponsorship_ends_at", "is", null)
    .lt("sponsorship_ends_at", now);

  if (error) throw new Error(`Failed to query expired subscriptions: ${error.message}`);

  const rows = data ?? [];
  logSafe(`Expired subscriptions found: ${rows.length} (dry_run=${dryRun})`);

  const entries = [];
  let count = 0;
  let errors = 0;

  for (const row of rows) {
    const entry = {
      type: "subscription",
      id: row.id,
      package_id: row.package_id,
      prior_status: "active",
      prior_sponsorship_ends_at: row.sponsorship_ends_at,
    };

    try {
      if (dryRun) {
        logSafe(`  [dry-run] subscription ${row.id}: status=active → expired`);
        entry.action = "would_expire";
        count++;
      } else {
        const { error: updateError } = await supabase
          .from("subscriptions")
          .update({ status: "expired" })
          .eq("id", row.id)
          .eq("status", "active");

        if (updateError) throw new Error(updateError.message);
        logSafe(`  subscription ${row.id}: expired (status → expired)`);
        entry.action = "expired";
        count++;
      }
    } catch (err) {
      entry.error = redactedError(err);
      errors++;
      logSafe(`  subscription ${row.id}: ERROR — ${entry.error}`);
    }

    entries.push(entry);
  }

  return { count, errors, entries };
}

async function writeSummary(data) {
  await writeFile(SUMMARY_FILE, JSON.stringify(data, null, 2) + "\n", "utf8");
  logSafe(`Summary written to ${SUMMARY_FILE}`);
}

async function main() {
  const { dryRun } = parseArgs(argv.slice(2));
  const { supabaseUrl, serviceKey } = readEnv();

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  logSafe(`Sponsorship expiry — dry_run=${dryRun}`);

  let pkgResult;
  let subResult;

  try {
    pkgResult = await expirePackages(supabase, dryRun);
  } catch (err) {
    console.error(redactedError(err));
    exit(1);
  }

  try {
    subResult = await expireSubscriptions(supabase, dryRun);
  } catch (err) {
    console.error(redactedError(err));
    exit(1);
  }

  const totalErrors = pkgResult.errors + subResult.errors;

  const summary = {
    generated_at: new Date().toISOString(),
    dry_run: dryRun,
    expired_packages: pkgResult.count,
    expired_subscriptions: subResult.count,
    errors: totalErrors,
    entries: [...pkgResult.entries, ...subResult.entries],
  };

  await writeSummary(summary);

  logSafe(
    `Processed: packages=${pkgResult.count} subscriptions=${subResult.count} errors=${totalErrors}`,
  );

  exit(totalErrors > 0 ? 1 : 0);
}

const invokedDirectly =
  argv[1] && fileURLToPath(import.meta.url) === argv[1];

if (invokedDirectly) {
  main().catch((err) => {
    console.error(redactedError(err));
    exit(1);
  });
}
