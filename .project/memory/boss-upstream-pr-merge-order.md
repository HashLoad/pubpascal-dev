---
type: project
name: boss-upstream-pr-merge-order
description: Upstream PR merge sequence and dependencies between HashLoad/boss and pubpascal features.
metadata:
  node_type: memory
  type: project
  modified: 2026-09-26T10:00:00Z
---

# Upstream PR Merge Sequence for Boss Engine

## Context and Dependency Chain

PubPascal CLI depends directly on the Go-based Boss engine located in upstream `HashLoad/boss`.
Multiple PRs have been submitted to resolve regressions and deliver CRA/SBOM features:

1. **PR #263 (`feature/pubpascal-cra-compliance`)**:
   - Upstream repo: `HashLoad/boss`.
   - Adds CRA compliance and CycloneDX/SPDX SBOM generation commands (`boss cra`, `boss sbom`).
   - Pinned SHA in CLI submodule: `ae9d612` (`refs/pull/263/head`).
   - Submodule reference in `cli/.modules/boss`.

2. **PR #270 (Auth & Fetch hardening)**:
   - Removes `invalid auth method` failure causes during package retrieval.
   - Note: Failed fetches currently log warnings and exit 0 by design policy ([[boss-fetch-failure-exit-code-open]]).

3. **PR #281 & PR #286 (Missing boss.json abort fix)**:
   - Upstream fix #281 (by Spelt) resolves panic on dependencies lacking `boss.json`.
   - Regression test suite #286 validates clean install across nested Git repos.

## Merge Precedence Rules

- PR #263 MUST merge before repinning submodule to `main`.
- Never execute force-push or merge against `feature/pubpascal-cra-compliance` without validating clean build in `cli/scripts/build.ps1`.
- Always validate behavior in testbed fork before requesting upstream review ([[validate-in-fork-before-upstream-pr]]).

Related: [[boss-fetch-failure-exit-code-open]], [[boss-local-test-environment]], [[boss-work-links]], [[module-cli-boss]].
