---
type: project
name: architecture-dual-manifest
description: Dual manifest coexistence model between boss.json and pubpascal.json for compiler and portal sync.
metadata:
  node_type: memory
  type: project
  modified: 2026-09-26T10:00:00Z
---

# Architecture: Dual Manifest Coexistence (`boss.json` and `pubpascal.json`)

## Intent and Business Goal

Garante a retrocompatibilidade entre boss e portal e gerencia dependencias e metadados.

Ensures 100% backward compatibility with the legacy Boss package manager while providing modern metadata governance, CRA compliance, and RAD Studio component installation capabilities required by the PubPascal Portal and Studio.

## Boundary and Ownership

1. **`boss.json` (Compilation & Physical Dependency Engine)**:
   - Consumer: Local CLI (`boss.exe`), Pascal build scripts.
   - Scope: Local dependency tree, Git repositories, branch/tag locks, and `mainsrc` search path injection for Delphi (`.dproj`, `.dpk`) and Lazarus (`.lpi`, `.lpk`).
   - Invariant: Zero AI or portal-specific governance tags allowed inside `boss.json`.

2. **`pubpascal.json` (Portal Governance & IDE Automation)**:
   - Consumer: PubPascal Portal Web, RAD Studio OTA Plugin (`ppota.bpl`), Desktop App (`ppdesktop.exe`).
   - Scope: Package categorization, license validation, SBOM (Software Bill of Materials) hashes, visual component registration metadata, designtime package lists.

## Decision and Resolution Flow

In `studio/core/PubPascal.View.pas` (`TPubPascalFrame._LoadDependencies`):
1. Frame checks workspace for `boss.json`.
2. If `boss.json` is missing, falls back to `pubpascal.json`.
3. If neither exists, displays `boss.json not found in workspace`.
4. When both exist, `boss.json` governs compilation dependencies while `pubpascal.json` governs portal display and component installation.

## Validation & References

- Documented in `docs/retrocompatibilidade.md`.
- Implemented in `studio/core/PubPascal.View.pas:110-120`.

Related: [[project-manifest-strategy]], [[module-studio-core]], [[module-cli-boss]].
