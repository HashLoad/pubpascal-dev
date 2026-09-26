# PubPascal Studio — the GUI apps (desktop + IDE/OTA)

Two products that share one core. The **same** WebView2 frame (the workspace
graph + the two-way bridge that drives the CLI) is hosted two ways:

- **Desktop** — a standalone Windows app you run on its own.
- **IDE (OTA)** — the same panel docked inside RAD Studio via the Open Tools API.

Neither duplicates the other: all the operability lives in the shared frame, and
each host only supplies a thin shell + its context (where the workspace is, which
view URL to show, where `pp.exe` is).

## Layout

```
studio/
├─ core/        THE shared frame — host-agnostic. Knows nothing about its host.
│   ├─ PubPascal.View.pas/.dfm   the TFrame: WebView2 + bridge + CLI driving
│   └─ PubPascal.CliRunner.pas   pure CLI executor (spawns pp.exe)
│
├─ desktop/     Standalone host (today's shipping app).
│   ├─ ppdesktop.dpr          the program (links core + this host; NOT ota)
│   ├─ ppdesktop.rc           program resource
│   ├─ PubPascal.HostForm.pas/.dfm   thin TForm that parents the core frame
│   ├─ workspace-graph.html      the web view (local file; live portal in prod)
│   ├─ package-manager.html      the package-manager mockup
│   └─ scripts/build.ps1         headless dcc64 build -> Win64\Release\ppdesktop.exe
│
├─ ota/         RAD Studio plugin host (the evolution).
│   └─ PubPascal.IDE.pas         INTACustomDockableForm whose GetFrameClass
│                                returns the SAME core frame. Goes in a
│                                designtime package (uses ToolsAPI), not the exe.
│
└─ installer/   Inno Setup — bundles the CLI + the desktop app.
    ├─ pubpascal.iss             the ACTIVE installer (CLI + desktop, pt/en)
    ├─ build.ps1                 stages binaries + compiles pubpascal.iss
    └─ PubPascalSetup.iss        OLDER scaffold (also wires the OTA .bpl) — not
                                 used by build.ps1; consolidate when OTA ships.
```

## The seam (why core knows nothing about its host)

`core` asks for its environment through an interface the host fills:

```pascal
IPubPascalContext = interface
  function WorkspacePath: string;  // desktop: chosen folder | OTA: active project (ToolsAPI)
  function ViewUrl: string;        // desktop: local HTML     | OTA: live portal
  function CliPath: string;        // full path to pp.exe (host-resolved)
end;
```

- **Desktop** (`TStandaloneContext`, in `desktop/`): current folder + bundled HTML.
- **OTA** (`TIdeContext`, in `ota/`): the active project's dir via
  `IOTAModuleServices.GetActiveProject` + the live portal flow.

## The flow (two-way), identical in both hosts

1. the web clicks an action on a node → `postMessage(json)`
2. `EdgeWebMessageReceived` → runs the **real `pp.exe`** (CreateProcess,
   CWD = `WorkspacePath`, the user's git credentials) off the UI thread
3. `Edge.PostWebMessageAsString(result)` → the web updates the node's badge

**No server, no Docker, no localhost.** It runs as the user, on their files, with
their git. `pp.exe` (the CLI, built from `../cli`) is dropped next to the app.

## Build

- **Desktop:** `pwsh -File desktop/scripts/build.ps1` → `desktop/Win64/Release/ppdesktop.exe`.
  Needs RAD Studio's dcc64 (Studio 37.0 by default; pass `-BdsVersion`). RTL/VCL +
  Vcl.Edge come from `$BDS` — no vendored `.modules` (unlike the CLI).
- **OTA plugin:** build `ota/PubPascal.IDE.pas` (+ `core`) into a **designtime
  package** in RAD Studio (Components ▸ Install Packages). Not built headless.
- **Installer:** `pwsh -File installer/build.ps1` (needs Inno Setup 6 + a fresh
  desktop exe + CLI exe) → `installer/Output/PubPascal-Setup-<ver>.exe`.
