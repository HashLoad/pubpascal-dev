# Esteira — repository structure validator

The Esteira inspects a cloned package repository and decides whether its structure meets the
portal's publication policy. It is a pure file-system inspector: it never executes target
code, never makes network requests, and writes a single JSON report.

This directory is the operator surface for Demand 2/3 of Epic 3. Demand 3/3 wires the report
back into Supabase; until then, the workflow is dispatched manually.

## CLI signature

```
node scripts/esteira/validate.mjs <target-dir> <slug> [--repo <repository_url>]
```

- `<target-dir>` — path to the cloned package repository (or a fixture).
- `<slug>` — the package slug used to identify the report.
- `--repo` — optional repository URL recorded in the report.

Environment:

- `ESTEIRA_CLONE_STATUS` — one of `ok` (default), `failed`, `not_supported`. The workflow
  sets this based on how the upstream checkout step behaved. Local runs against fixtures
  should leave it unset.

The script always exits `0`. The verdict lives inside `validation-report.json`.

## Rule list and severity

| Rule | Severity | Definition |
|------|----------|------------|
| `has_readme` | **fail** | `README.md` / `README.txt` / `README` at the repo root with ≥ 200 bytes. |
| `has_changelog` | warn | `CHANGELOG.md` / `CHANGES.md` / `HISTORY.md` at the repo root. |
| `has_examples` | warn | Non-empty `examples/` directory, or `EXAMPLE.md` / `EXAMPLES.md`. |
| `has_installing` | warn | `INSTALL.md` / `INSTALLING.md` or a README section `## Install` / `## Installing` / `## Instalação`. |
| `has_images` | warn | Image asset (`.png .jpg .jpeg .gif .svg .webp`) under `images/`, `assets/`, `docs/images/`, or `screenshots/`. |
| `has_pascal_sources` | **fail** | At least one `.pas .pp .lpr .dpr .dproj .lpi .lpk .bpl` anywhere (skipping `.git/`, `node_modules/`, `dist/`, `build/`, `out/`). |
| `has_license` | warn | A file at the root whose basename is `LICENSE` or `LICENCE` (any extension). |
| `repo_clonable` | **fail** | The workflow successfully cloned the target repo. Set from `ESTEIRA_CLONE_STATUS`. |

**Severity rule:** a `fail`-severity rule that fails sets the overall verdict to `rejected`.
A `warn`-severity rule that fails becomes a `warn` outcome and the verdict stays
`approved_with_warnings`.

## Verdict aggregator

- `repo_clonable.not_supported` → `not_supported` (overrides everything else; non-GitHub
  hosts in this cycle).
- Any `fail`-severity rule failed → `rejected`.
- All `pass` → `approved`.
- Otherwise (warns present, no fails) → `approved_with_warnings`.

## Report schema (locked, `schema_version: 1`)

```jsonc
{
  "schema_version": 1,
  "slug": "<input.slug>",
  "repository_url": "<input.repository_url>",
  "generated_at": "<ISO 8601>",
  "verdict": "approved" | "approved_with_warnings" | "rejected" | "not_supported",
  "rules": [
    { "key": "has_readme",         "outcome": "pass" | "fail" | "warn" | "not_supported", "detail": "..." },
    { "key": "has_changelog",      "outcome": "...", "detail": "..." },
    { "key": "has_examples",       "outcome": "...", "detail": "..." },
    { "key": "has_installing",     "outcome": "...", "detail": "..." },
    { "key": "has_images",         "outcome": "...", "detail": "..." },
    { "key": "has_pascal_sources", "outcome": "...", "detail": "..." },
    { "key": "has_license",        "outcome": "...", "detail": "..." },
    { "key": "repo_clonable",      "outcome": "...", "detail": "..." }
  ]
}
```

The `rules` array is **always** length 8 in this exact order. Demand 3/3 may consume this
shape verbatim. Any change to keys, ordering, or the verdict vocabulary requires a new ADR
and a `schema_version` bump.

## Running fixtures locally

```
node scripts/esteira/run-local.mjs
```

The harness runs the validator against the three committed fixtures (`approved`,
`rejected-no-readme`, `warnings-only`) and compares the produced report against each
fixture's `expected.json` sidecar. Exit code `0` means every fixture matched; `1` means
at least one failed.

## Adding a new fixture

1. Create `scripts/esteira/__fixtures__/<name>/` with the files you want the validator to
   see.
2. Add an `expected.json` next to those files with the shape:
   ```json
   {
     "verdict": "<one of the four locked verdicts>",
     "rules": { "<rule_key>": "<expected outcome>", ... }
   }
   ```
3. Register the fixture in the `fixtures` array at the top of
   `scripts/esteira/run-local.mjs`.
4. Run `node scripts/esteira/run-local.mjs` to confirm the new fixture passes.

## How the workflow dispatches the script

1. The portal repo is checked out into `./portal` (gives the workflow access to
   `scripts/esteira/validate.mjs`).
2. `repository_url` is parsed; non-GitHub hosts skip the target clone and the
   `ESTEIRA_CLONE_STATUS` env var is set to `not_supported`.
3. `actions/checkout@v4` clones the target into `./target` for GitHub URLs only. A failed
   clone is `continue-on-error: true`, mapped to `ESTEIRA_CLONE_STATUS=failed`.
4. The validator runs against `./target` and writes `validation-report.json` to the
   workspace root.
5. `actions/upload-artifact@v4` publishes the report as `esteira-report-<slug>` (30-day
   retention).
6. A `bash` step parses the report with `jq` and appends the rule table to
   `$GITHUB_STEP_SUMMARY`.

The artifact is the **only** contract Demand 3/3 will consume. Logs and step summaries are
operator conveniences and may change without notice.

---

## Sync workflow (Demand 3/3 of Epic 3)

`scripts/esteira/sync.mjs` is the **scheduled batch surface** that drains the Supabase
`packages` table where `status='pending'`. It reuses the same validator (`validate.mjs`) the
manual `esteira.yml` workflow runs, and writes each verdict back to the row's `status` +
`validation_report` columns.

### Workflow trigger

`.github/workflows/esteira-sync.yml` declares:

- `schedule: "*/30 * * * *"` — every 30 minutes. Tunable per ADR-010; change to
  `"*/10 * * * *"` for tighter throughput or `"0 * * * *"` for hourly batches.
- `workflow_dispatch` with an optional `limit` input (default 10). Useful for catching up
  on a backlog manually.

`permissions: { contents: read }` strips the default `GITHUB_TOKEN` scopes.

### Required secrets

Before the first scheduled pulse, an operator MUST create these in **Settings → Secrets and
variables → Actions** on `isaquepinheiro/pubdelphi-dev`:

| Secret | Source | Notes |
|--------|--------|-------|
| `SUPABASE_URL` | Supabase project settings → Project URL | Same value as the front-end's `NEXT_PUBLIC_SUPABASE_URL`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project settings → API → `service_role` key | **Bypasses RLS.** Never commit, never echo. The script redacts it from error messages and never writes it to the summary artifact. |

Without these secrets, the script exits 2 with a clear error and the workflow run fails
visibly.

### Verdict → status mapping

| Verdict | New status | Behavior |
|---------|-----------|----------|
| `approved` | `active` | Package becomes publicly visible in `/packages`. |
| `approved_with_warnings` | `active` | Same as `approved`. Warnings surface inside `validation_report` for the publisher's awareness. |
| `rejected` | `rejected` | Package stays invisible. `validation_report` captures the failing rule(s). |
| `not_supported` | `rejected` | Repository host is not on the allow-list. The publisher must re-submit on a supported host. |

`mapVerdictToStatus` is exported from `sync.mjs` and exercised by the fixture harness
(`PASS verdict-mapping`).

### CLI flags

```
node scripts/esteira/sync.mjs [--limit <n>] [--dry-run] [--cwd <dir>]
```

- `--limit <n>` — batch size (default 10, clamped to `[1, 50]`). Out-of-range values are
  silently clamped.
- `--dry-run` — performs the SELECT and prints the planned UPDATE per row, but does not
  touch the DB. Useful for an operator's first sanity check.
- `--cwd <dir>` — override the working directory (the directory where
  `validation-report.json` and `esteira-sync-summary.json` are written). Defaults to
  `process.cwd()`.

### Per-row isolation

A single failure — clone timeout, validator crash, DB update error, malformed row — is
captured as an `error` entry in the summary and the loop continues. The whole batch never
aborts mid-way.

### Idempotency

The UPDATE includes `.eq('status', 'pending')` so any row that left `pending` between the
SELECT and the UPDATE (parallel run, manual admin action) becomes a no-op. The summary
records the `prior_status` from the SELECT, the `new_status` only when the UPDATE
succeeded, and an `error: "Row was no longer pending; UPDATE matched zero rows."` when it
did not.

### Summary artifact

`esteira-sync-summary.json` is uploaded as `esteira-sync-summary-<run_number>` with a
14-day retention. Shape:

```jsonc
{
  "generated_at": "<ISO 8601>",
  "batch_size": 10,
  "dry_run": false,
  "totals": { "active": 7, "rejected": 2, "errors": 1 },
  "entries": [
    {
      "slug": "horse",
      "repository_url": "https://github.com/HashLoad/horse",
      "prior_status": "pending",
      "new_status": "active",
      "verdict": "approved"
    },
    /* ... */
  ]
}
```

### Local dry-run

```bash
SUPABASE_URL='https://<project>.supabase.co' \
SUPABASE_SERVICE_ROLE_KEY='<paste service_role key>' \
  node scripts/esteira/sync.mjs --dry-run --limit 5
```

Sample output:

```
Esteira sync — found 3 pending package(s) (limit=5, dry_run=true).
  [dry-run] horse: pending → active (verdict=approved)
  [dry-run] gl-foo: pending → rejected (verdict=not_supported)
  [dry-run] no-readme-pkg: pending → rejected (verdict=rejected)
Processed 3 row(s): {active: 1, rejected: 2, errors: 0}
Summary written to <cwd>/esteira-sync-summary.json
```

The dry-run never connects to GitHub and never clones — it walks the host regex and
short-circuits with synthetic schema-v1 reports per ADR-010.

