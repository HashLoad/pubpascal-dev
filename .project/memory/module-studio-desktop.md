---
type: project
name: module-studio-desktop
description: Standalone Windows desktop GUI executable hosting the shared PubPascal Studio frame.
metadata:
  node_type: memory
  type: project
  modified: 2026-09-26T10:00:00Z
---

# Module: PubPascal Studio Desktop (`studio/desktop/`)

## Overview

`studio/desktop/` compiles the standalone Windows executable `ppdesktop.exe`.
It provides the visual PubPascal workspace and dependency manager for developers working outside RAD Studio (e.g. Lazarus developers, CLI users, CI workstations).

## Implementation (`studio/desktop/PubPascal.HostForm.pas`)

1. **Host Form (`TMainForm`)**:
   - Simple top-level VCL form that instantiates and embeds `TPubPascalFrame` as client align.
   - Implements `IPubPascalContext` tailored for standalone operation:
     - Prompts user to select a workspace folder or defaults to current working directory.
     - Locates `boss.exe` in the application directory or system PATH.
     - Resolves portal base URL from `%USERPROFILE%\.pubpascal\config.json`.

2. **Build and Packaging**:
   - Project DPR: `studio/desktop/ppdesktop.dpr`.
   - Automation: `studio/desktop/scripts/build.ps1`.
   - Inno Setup installer scripts: `studio/installer/pubpascal.iss` and `PubPascalSetup.iss`.

Related: [[module-studio-core]], [[module-studio-ota]], [[module-cli-boss]].
