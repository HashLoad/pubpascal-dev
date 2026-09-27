# Build the PubPascal installer (Inno Setup).
#   pwsh -File build.ps1
# Stages the latest binaries into .\stage\, then compiles pubpascal.iss into
# .\Output\PubPascal-Setup-<version>.exe.
#
# Needs:
#   - Inno Setup 6  (winget install JRSoftware.InnoSetup)
#   - a fresh ppdesktop.exe (desktop\scripts\build.ps1), boss.exe (CLI),
#     and ppota.bpl (ota\scripts\build.ps1).

[CmdletBinding()]
param(
  [string] $DesktopExe = (Join-Path $PSScriptRoot "..\desktop\Win64\Release\ppdesktop.exe"),
  [string] $CliExe = (Join-Path $PSScriptRoot "..\..\cli\Win64\Release\boss.exe"),
  [string] $OtaBpl = (Join-Path $PSScriptRoot "..\ota\Win32\Release\ppota.bpl"),
  [string] $Iscc   = "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
)

$ErrorActionPreference = "Stop"
$root  = $PSScriptRoot
$stage = Join-Path $root "stage"

foreach ($f in @($DesktopExe, $CliExe, $OtaBpl, $Iscc)) {
  if (-not (Test-Path $f)) { throw "Not found: $f" }
}

New-Item -ItemType Directory -Force $stage | Out-Null
Copy-Item $DesktopExe $stage -Force
Copy-Item $CliExe $stage -Force
Copy-Item $OtaBpl $stage -Force

@"
PubPascal v0.1.0

- ppdesktop.exe  -> the desktop app (workspace graph + live git)
- boss.exe       -> the CLI (added to PATH if you checked the option)
- ppota.bpl      -> the RAD Studio plugin (installed only if Delphi 13 is present)

1. Open PubPascal Desktop (Start menu).
2. Paste your token (pdv_...) on the login screen.

Requires: Windows 10/11 + WebView2 runtime (ships with Edge) + git on PATH.
Token: https://www.pubpascal.dev/profile/tokens
"@ | Out-File (Join-Path $stage "README.txt") -Encoding utf8

Write-Host "==> ISCC compiling pubpascal.iss"
& $Iscc (Join-Path $root "pubpascal.iss")

$out = Get-ChildItem (Join-Path $root "Output\*.exe") -ErrorAction SilentlyContinue | Select-Object -First 1
if ($out) {
  Write-Host "==> Build OK: $($out.FullName) ($([math]::Round($out.Length/1MB,2)) MB)"
} else {
  throw "ISCC reported success but no Output\*.exe found."
}
