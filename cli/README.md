# PubPascal CLI (Boss Engine)

Official command-line client for the [PubPascal](https://pubpascal.dev) ecosystem — discover, publish, and consume Delphi / Lazarus packages with **CRA compliance and Software Bill of Materials (SBOM) built in**.

The CLI is powered by the custom Go-based **Boss** dependency manager. It replaces the legacy Delphi CLI (`pp.dpr`) and DPM integration entirely.

## 🚀 Key Features

* **CRA & SBOM Native:** Run `boss cra` to diagnose project security and policy compliance or `boss sbom` to generate CycloneDX/SPDX manifests instantly.
* **Workspace Management:** Clone, check status, and push changes across multi-repository projects integrated with the PubPascal Portal.
* **Modern Toolchain:** Project packaging (`boss pkg pack`), signature signing & verification (`boss pkg sign` / `boss pkg verify`), custom script execution (`boss run`), and project scaffolding (`boss new`).

## 📦 Building from Source

To compile the CLI executable (`boss.exe`) from the Go sources:

```powershell
# Navigate to the CLI directory
cd cli

# Run the build script (requires Go compiler on your PATH)
powershell -File scripts/build.ps1 -Config Release
```

The compiled binary will be placed at `cli/Win64/Release/boss.exe`.
