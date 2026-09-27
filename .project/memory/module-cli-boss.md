---
type: project
name: module-cli-boss
description: Go-based Boss CLI engine providing CRA compliance, SBOM generation and package operations.
metadata:
  node_type: memory
  type: project
  modified: 2026-09-26T10:00:00Z
---

# Module: PubPascal CLI Engine (`cli/`)

## Architecture and Migration

The PubPascal CLI is powered by the Go-based Boss dependency engine (`HashLoad/boss`), replacing the legacy Delphi CLI (`pp.dpr`) entirely.
It compiles into a single, high-performance binary `boss.exe`.

## Commands and Features

1. **Package Lifecycle**:
   - `boss install <pkg>`: Downloads dependencies and updates `boss.json` and project search paths.
   - `boss remove <pkg>`: Removes package from dependencies.
   - `boss login --token <token>`: Authenticates developer against PubPascal portal.

2. **CRA & SBOM Native Governance**:
   - `boss cra`: Audits workspace against European Cyber Resilience Act requirements.
   - `boss sbom`: Generates standards-compliant CycloneDX and SPDX SBOM manifests.

3. **Dev-Flow (ADR 002)**:
   - `boss contribute <pkg>`: Prepares contribution branch and remote fork.
   - `boss contribute <pkg> --pr`: Pushes commits and creates upstream PR.

4. **Compilation and Build**:
   - Go toolchain script: `cli/scripts/build.ps1`.
   - Output binary: `Win64/Release/boss.exe` or `Win64/Debug/boss.exe`.

## Critical Invariants and Regressions

- [[boss-cleanempty-panic-unreleased]]: Slice bounds out-of-range bug in v3.0.13-v3.0.15 resolved in upstream PR.
- [[boss-missing-bossjson-install-abort]]: Dependency install abort when `boss.json` is missing; resolved via PR #281/#286.
- [[boss-fetch-failure-exit-code-open]]: Boss exits 0 on failed fetch to protect offline pipelines.

Related: [[workflow-dev-flow-contribution]], [[architecture-dual-manifest]], [[module-studio-core]].
