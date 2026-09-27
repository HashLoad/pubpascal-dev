#!/usr/bin/env node
// Esteira local fixture harness. Runs validate.mjs against each committed fixture and
// compares the resulting report to the fixture's expected.json sidecar. Exits 0 on full
// success, 1 on the first failure.

import { spawnSync } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { cwd, exit } from "node:process";
import { mapVerdictToStatus } from "./sync.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const validator = join(here, "validate.mjs");
const fixturesDir = join(here, "__fixtures__");
const reportPath = resolve(cwd(), "validation-report.json");

const fixtures = [
  { name: "approved", slug: "approved-fixture" },
  { name: "rejected-no-readme", slug: "rejected-fixture" },
  { name: "warnings-only", slug: "warnings-fixture" },
];

function logResult(name, ok, message) {
  const tag = ok ? "PASS" : "FAIL";
  console.log(`${tag} ${name}${message ? ` — ${message}` : ""}`);
}

async function runOne(fixture) {
  const fixturePath = join(fixturesDir, fixture.name);
  const expectedPath = join(fixturePath, "expected.json");

  try {
    await rm(reportPath, { force: true });
  } catch {
    // ignore
  }

  const result = spawnSync(
    process.execPath,
    [validator, fixturePath, fixture.slug, "--repo", "https://github.com/local/fixture"],
    { stdio: "pipe", encoding: "utf8" },
  );

  if (result.status !== 0) {
    logResult(fixture.name, false, `validate.mjs exited ${result.status}`);
    return false;
  }

  let report;
  try {
    report = JSON.parse(await readFile(reportPath, "utf8"));
  } catch (err) {
    logResult(fixture.name, false, `failed to read validation-report.json: ${err.message}`);
    return false;
  }

  let expected;
  try {
    expected = JSON.parse(await readFile(expectedPath, "utf8"));
  } catch (err) {
    logResult(fixture.name, false, `missing expected.json: ${err.message}`);
    return false;
  }

  if (report.verdict !== expected.verdict) {
    logResult(
      fixture.name,
      false,
      `verdict mismatch — expected "${expected.verdict}", got "${report.verdict}"`,
    );
    return false;
  }

  for (const [key, expectedOutcome] of Object.entries(expected.rules)) {
    const actual = report.rules.find((r) => r.key === key);
    if (!actual) {
      logResult(fixture.name, false, `rule "${key}" missing from report`);
      return false;
    }
    if (actual.outcome !== expectedOutcome) {
      logResult(
        fixture.name,
        false,
        `rule "${key}" outcome mismatch — expected "${expectedOutcome}", got "${actual.outcome}"`,
      );
      return false;
    }
  }

  logResult(fixture.name, true);
  return true;
}

async function runVerdictMapping() {
  const mappingPath = join(fixturesDir, "sync", "mapping.json");
  let pairs;
  try {
    pairs = JSON.parse(await readFile(mappingPath, "utf8"));
  } catch (err) {
    logResult("verdict-mapping", false, `failed to read mapping.json: ${err.message}`);
    return false;
  }

  for (const pair of pairs) {
    const got = mapVerdictToStatus(pair.verdict);
    if (got !== pair.expected_status) {
      logResult(
        "verdict-mapping",
        false,
        `verdict "${pair.verdict}" → expected "${pair.expected_status}", got "${got}"`,
      );
      return false;
    }
  }

  logResult("verdict-mapping", true);
  return true;
}

async function main() {
  let allOk = true;
  for (const fixture of fixtures) {
    const ok = await runOne(fixture);
    if (!ok) allOk = false;
  }

  const mappingOk = await runVerdictMapping();
  if (!mappingOk) allOk = false;

  try {
    await rm(reportPath, { force: true });
  } catch {
    // ignore
  }

  if (!allOk) {
    console.error("\nOne or more fixtures failed.");
    exit(1);
  }
  console.log("\nAll fixtures passed.");
}

main().catch((err) => {
  console.error("Harness fatal error:", err);
  exit(1);
});
