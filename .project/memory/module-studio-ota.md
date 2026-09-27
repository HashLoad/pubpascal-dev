---
type: project
name: module-studio-ota
description: RAD Studio Open Tools API (OTA) designtime plugin docking the Studio frame and injecting search paths.
metadata:
  node_type: memory
  type: project
  modified: 2026-09-26T10:00:00Z
---

# Module: PubPascal Studio OTA Plugin (`studio/ota/`)

## Purpose and IDE Integration

`studio/ota/` packages the shared `TPubPascalFrame` into a RAD Studio designtime package (`ppota.bpl`).
It registers under the RAD Studio **View > PubPascal Workspace** menu and docks a live frame inside the IDE docking manager.

## Key Implementations (`studio/ota/PubPascal.IDE.pas`)

1. **`TPubPascalDockable` (`INTACustomDockableForm`)**:
   - Implements `INTACustomDockableForm` to participate in RAD Studio docking layouts.
   - `GetFrameClass`: Returns `TPubPascalFrame` class from `studio/core/`.
   - `FrameCreated`: Passes `TIdeContext` to `SetContext` and invokes `Activate`.

2. **`TIdeContext` (`IPubPascalContext`)**:
   - `WorkspacePath`: Calls `ToolsAPI.GetActiveProject` to determine active `.dproj` directory dynamically.
   - `CliPath`: Resolves `boss.exe` colocated with the installed BPL.
   - `Installer`: Returns `TIdePackageInstaller`.

3. **`TIdePackageInstaller` (`IPackageInstaller`)**:
   - `_AddSearchPaths`: Inspects the active Delphi project (`IOTAProjectOptions`) and appends downloaded package source paths (`mainsrc`) to the unit search path without duplicates.

## Build and Packaging

- Project files: `studio/ota/ppota.dpk`, `studio/ota/ppota.dproj`.
- Automated build: `studio/ota/scripts/build.ps1` using Embarcadero `rsvars.bat` and `msbuild`.

Related: [[module-studio-core]], [[module-studio-desktop]], [[architecture-dual-manifest]].
