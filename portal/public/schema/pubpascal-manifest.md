# `pubpascal.json` — the PubPascal package manifest

PubPascal's **own** manifest. It is the single source of truth the CLI and the
desktop/IDE app read. It is **not** `boss.json`: PubPascal does not depend on
Boss. `boss.json` (and `.dproj`, and a scaffold) are only **importers** that can
*generate* a `pubpascal.json` — once generated, nothing reads `boss.json` at
runtime.

> Why our own? Two reasons. (1) Decoupling — depending on `boss.json` ties us to
> Boss's roadmap. (2) `boss.json` cannot express what we need — notably the
> package **kind** (does installing it just add search paths, or must we build
> and register a design-time BPL in the IDE?), the design-time entry point, and
> supported platforms.

## Location

A `pubpascal.json` lives at the **repository root** of a package.

## Fields

| Field | Req | Type | Meaning |
|---|---|---|---|
| `name` | ✅ | string | Package name (matches the portal slug source). |
| `version` | ✅ | string | SemVer of this package. |
| `kind` | ✅ | enum | `runtime` · `designtime` · `installer` — **decides what "install" does** (see below). |
| `sources` | cond | string[] | Unit folders, **relative to the repo root** — added to `DCC_UnitSearchPath`. Required for `runtime` and `designtime` (not `installer` — the installer owns the wiring). |
| `dependencies` | – | object | `"<owner>/<repo>": "<version-range>"`. PURLs (`pkg:github/owner/repo@ver`) are derived from these for the SBOM. |
| `platforms` | – | string[] | `Win32` `Win64` `Linux64` `OSX64` `Android` `iOS`. Default: `["Win32","Win64"]`. |
| `compilers` | – | string[] | Supported RAD Studio compiler versions (e.g. `["13.0","12.0"]`). |
| `design` | cond | object | **Required when `kind` is `designtime`.** `{ "package": "<path/to.dpk>", "registerUnit": "<Unit.Register>" }` — the design-time BPL to build + register in the IDE. |
| `install` | cond | object | **Required when `kind` is `installer`.** Describes the vendor installer PubPascal downloads + runs — `{ "type": "exe"\|"msi", "url", "silentArgs"?, "interactive"?, "sha256"?, "signedBy"? }`. See [Commercial / installer packages](#commercial--installer-packages). |
| `description` `homepage` `license` | – | string | Metadata (mirror the portal; optional). |

## `kind` — what "install" does

| `kind` | Install = | Where it can run |
|---|---|---|
| `runtime` | add `sources` to the project search path — the library you use in code (the common case) | standalone **or** IDE |
| `designtime` | add paths **+ build & register the design-time BPL** — its components appear on the IDE palette | **IDE only** (ToolsAPI) |
| `installer` | **download + run the vendor's `install.exe`/`.msi`**, then step back (the installer owns paths/BPL/registry/licensing) | standalone or IDE |

The desktop app shows a single **"Install"** button for every kind — the kind
badge (`runtime` / ⚙ `designtime` / ⤓ `installer`) plus a one-line legend already
convey what it will do. A `designtime` install is disabled outside RAD Studio; a
commercial `installer` surfaces purchase + publisher trust first.

> Dropped from an earlier draft: `source` (folded into `runtime`) and `mixed`
> (a package with design-time components is just `designtime`). Three kinds map
> cleanly to the Delphi developer's mental model.

## Importers (how a `pubpascal.json` is born)

Generated once, then committed by the author — never read at runtime:

1. **From `boss.json`** — maps `name`/`version`/`mainsrc`→`sources`/`dependencies`. `kind` defaults to `runtime` (the author confirms/edits). *This is the portal's import-graph convenience; the button is enabled only when the repo actually has a `boss.json`.*
2. **From the `.dproj`/`.dpk`** — infers `sources`, platforms, and (from `{$DESIGNONLY}`) the `kind`/`design` block.
3. **`boss pkg spec`** — scaffolds a starter manifest by scanning source folders.

## Example — `Colligo` (a runtime library)

```json
{
  "$schema": "https://www.pubpascal.dev/schema/pubpascal.schema.json",
  "name": "Colligo",
  "version": "0.3.0",
  "kind": "runtime",
  "description": "LINQ-style fluent collections & DB query library for Object Pascal",
  "homepage": "https://github.com/ModernDelphiWorks/Colligo",
  "license": "MIT",
  "sources": ["Source/"],
  "platforms": ["Win32", "Win64"],
  "dependencies": {
    "ModernDelphiWorks/DataEngine": "^0"
  }
}
```

## Example — a design-time component package

```json
{
  "name": "AcmeGrid",
  "version": "2.1.0",
  "kind": "designtime",
  "sources": ["Source/", "Source/DesignTime/"],
  "platforms": ["Win32", "Win64"],
  "dependencies": {},
  "design": {
    "package": "Packages/AcmeGridDesign.dpk",
    "registerUnit": "AcmeGrid.Register"
  }
}
```

## Example — a commercial package that ships its own installer

```json
{
  "name": "AcmeReportSuite",
  "version": "12.4.0",
  "kind": "installer",
  "platforms": ["Win32", "Win64"],
  "install": {
    "type": "exe",
    "url": "https://downloads.acme.dev/reportsuite/12.4.0/setup.exe",
    "silentArgs": "/VERYSILENT /NORESTART",
    "interactive": true,
    "sha256": "9f2c…",
    "signedBy": "Acme Software Ltd"
  }
}
```

## Commercial / installer packages

Many paid component suites ship a **proprietary installer** rather than plain
sources. For these, PubPascal does **not** wire paths or register BPLs itself —
it downloads the vendor installer and runs it, then steps back. Two concerns ride
on top of the plain mechanism:

**Licensing (paid).** Pricing and entitlement are a **portal** concern, not the
repo manifest. For a paid package the manifest's `install.url` may be a
placeholder (or absent); the **portal resolves the real, authorized download URL
only after purchase** and serves the *effective* `install` descriptor to the app.
So the install descriptor the app acts on can come from two origins:

- the package's `pubpascal.json` (open packages), or
- the **portal record**, filled by the publisher at publish time and **license-gated** (commercial packages).

The app always reads the effective descriptor from the portal API; it never needs
to know which origin it came from.

**Trust (running third-party code).** An installer is an opaque executable. Before
running it the app **verifies `sha256`** (integrity) and checks that the file's
Authenticode signature matches **`signedBy`**, then surfaces it to the user —
*"This package runs an installer from **Acme Software Ltd** (signed ✓). Proceed?"*
This reuses the trust layer the portal already builds for CRA-readiness (SBOM +
signature + maintained). An unsigned or mismatched installer is a hard warning,
not a silent run.
