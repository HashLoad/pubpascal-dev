---
type: project
name: module-studio-core
description: Host-agnostic shared Delphi VCL frame and decoupled CLI runner used by Desktop and OTA.
metadata:
  node_type: memory
  type: project
  modified: 2026-09-26T10:00:00Z
---

# Module: PubPascal Studio Core (`studio/core/`)

## Architecture and Seam Design

`studio/core/` contains the shared, host-agnostic logic powering both the standalone Desktop application (`ppdesktop.exe`) and the RAD Studio OTA dockable plugin (`ppota.bpl`).
Neither host contains duplicated UI or execution logic; both host the same `TPubPascalFrame`.

## Known Failures and Historical Symptoms

- `boss ui` retired command: Anteriormente o clique em abrir portal chamava `boss ui`, um comando legado da CLI em Delphi inexistente no motor Go, fazendo com que every click failed. Corrigido abrindo diretamente a URL resolvida no shell.

## Key Interfaces and Components

1. **`IPubPascalContext` (`studio/core/PubPascal.View.pas:27-33`)**:
   - `WorkspacePath`: Returns chosen folder (desktop) or active project directory (OTA ToolsAPI).
   - `ViewResource`: Returns embedded HTML resource name.
   - `CliPath`: Host-resolved path to `boss.exe` (next to exe in desktop; next to BPL in OTA; or empty for system PATH).
   - `Installer`: Injects `IPackageInstaller` implementation.

2. **`TPubPascalFrame` (`studio/core/PubPascal.View.pas:35-70`)**:
   - VCL Frame containing package slug input, installation trigger, token authentication, and dependency list view.
   - `_LoadDependencies`: Parses `boss.json` and `pubpascal.json` dependencies.
   - `_PortalBaseUrl`: Resolves active portal URL, inspecting `%USERPROFILE%\.pubpascal\config.json` before falling back to `https://www.pubpascal.dev`.

3. **`TCliRunner` (`studio/core/PubPascal.CliRunner.pas:20-60`)**:
   - Decoupled process spawner executing `boss.exe` via Windows API pipes (`CreateProcessW`).
   - Supports synchronous `Run(args, out)` and streaming `RunStreaming(args, onProgress, out)` with background threads.
   - Zero VCL and zero ToolsAPI dependencies.

4. **`IPackageInstaller` (`studio/core/PubPascal.Installer.pas`)**:
   - Decouples component installation requests (`TInstallRequest`) from specific host capabilities.

Related: [[module-studio-desktop]], [[module-studio-ota]], [[module-cli-boss]], [[architecture-dual-manifest]].
