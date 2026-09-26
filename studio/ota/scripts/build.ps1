# PubPascal OTA plugin — headless design-time package build via dcc32.
#
# Compiles ppota.dpk into a Win32 .bpl (design-time packages load into
# the 32-bit RAD Studio IDE). REQUIRES designide (ToolsAPI/DeskUtil) + vclwinx
# (Vcl.Edge / WebView2). The .dcp dependencies come from $BDS\lib\win32\release.
#
# NOTE: a clean dcc32 compile proves the package links; whether it docks
# correctly is only fully verifiable inside RAD Studio (Install Packages).
#
# Usage:
#   pwsh -File scripts/build.ps1
#   pwsh -File scripts/build.ps1 -BdsVersion 23.0

[CmdletBinding()]
param(
    [string] $BdsVersion = '37.0'
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $root

$bds = "C:\Program Files (x86)\Embarcadero\Studio\$BdsVersion"
if (-not (Test-Path "$bds\bin\dcc32.exe")) {
    throw "dcc32 not found at $bds\bin. Pass -BdsVersion with an installed Studio version."
}
$env:BDS = $bds
$env:PATH = "$bds\bin;$bds\bin64;$env:PATH"

$outDir = ".\Win32\Release"
New-Item -ItemType Directory -Force $outDir | Out-Null

# Shared embedded web view: compiled in core/, linked via {$R} in PubPascal.View
# (runs brcc32 from core/ so the RCDATA path resolves to core\workspace-graph.html).
Push-Location '..\core'
& "$bds\bin\brcc32.exe" 'PubPascalView.rc' | Out-Null
Pop-Location

# Our source: the OTA host (here) + the shared core. The .dcp libs (rtl, vcl,
# vclwinx, designide) live in the BDS Win32 release lib.
$lib = "$bds\lib\win32\release"
$U   = @('.', '..\core', $lib) -join ';'
$NS  = 'System;Xml;Data;Datasnap;Web;Soap;Winapi;System.Win;Vcl;Vcl.Imaging'

$dccArgs = @("-U$U", "-NS$NS", "-LE$outDir", "-LN$outDir", "-NU$outDir", "-NB$outDir", "-NH$outDir", '-$O+', '-DRELEASE')

Write-Host "==> dcc32 ($BdsVersion) building ppota.dpk [Win32 design-time package]"
$out = & "$bds\bin\dcc32.exe" @dccArgs 'ppota.dpk' 2>&1
$out | ForEach-Object { Write-Host $_ }
$errors = $out | Select-String -Pattern 'Error|Fatal|E\d{4}|F\d{4}'
if ($errors) { throw "Build FAILED." }

$bpl = Join-Path $outDir 'ppota.bpl'
if (Test-Path $bpl) {
    $mb = [math]::Round((Get-Item $bpl).Length / 1MB, 2)
    Write-Host "==> Build OK: $bpl ($mb MB)"
} else {
    throw "Build reported no errors but $bpl is missing."
}
