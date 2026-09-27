# PubPascal CLI - Go-based build script.
#
# Compiles the custom Go-based Boss engine (which replaces the legacy Delphi CLI)
# into a single, highly performant boss.exe binary.
#
# Usage:
#   pwsh -File scripts/build.ps1                 # Debug
#   pwsh -File scripts/build.ps1 -Config Release
#   pwsh -File scripts/build.ps1 -Config Release -BossSourceDir "D:\Caminho\Para\Boss"

[CmdletBinding()]
param(
    [ValidateSet('Debug', 'Release')]
    [string] $Config = 'Debug',

    [string] $BossSourceDir = ""
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $root

$outDir = ".\Win64\$Config"
New-Item -ItemType Directory -Force $outDir | Out-Null

$exe = Join-Path $outDir 'boss.exe'

Write-Host "==> Go building boss.exe [$Config, Win64]"

# Set up build arguments
$goArgs = @('build')
if ($Config -eq 'Release') {
    $goArgs += '-ldflags'
    $goArgs += '-s -w' # Strip debugging symbols for a smaller binary
}

# Resolve the absolute path of the output exe before changing directory
$absoluteExePath = [System.IO.Path]::GetFullPath((Join-Path $root $exe))
if (Test-Path $absoluteExePath) {
    Remove-Item $absoluteExePath -Force
}
$goArgs += @('-o', $absoluteExePath, 'app.go')

# Run Go compiler
if (-not (Get-Command go -ErrorAction SilentlyContinue)) {
    # Check common Go location in DeveloperWeb if not on PATH
    if (Test-Path "D:\DeveloperWeb\go\go\bin\go.exe") {
        $env:PATH = "D:\DeveloperWeb\go\go\bin;$env:PATH"
    } else {
        throw "Go compiler ('go') not found on PATH. Install Go to compile the engine."
    }
}

# Determine Boss source directory
$candidates = @(
    $BossSourceDir,
    $env:BOSS_DIR,
    (Join-Path $root '.modules/boss'),
    "D:\DeveloperWeb\pubpascal-app\cli\.modules\boss",
    "D:\Delphi Tools\Boss"
)

$targetBossDir = $null
foreach ($c in $candidates) {
    if (-not [string]::IsNullOrWhiteSpace($c) -and (Test-Path (Join-Path $c "app.go"))) {
        $targetBossDir = Resolve-Path $c
        break
    }
}

if (-not $targetBossDir) {
    throw "Boss source directory not found. Please provide -BossSourceDir with path containing app.go or clone Boss into cli/.modules/boss"
}

Write-Host "Compiling Boss from: $targetBossDir..."
$prevDir = Get-Location
Set-Location $targetBossDir

try {
    & go $goArgs
} finally {
    Set-Location $prevDir
}

if (Test-Path $exe) {
    $mb = [math]::Round((Get-Item $exe).Length / 1MB, 2)
    Write-Host "==> Build OK: $exe ($mb MB)"
} else {
    throw "Build reported no errors but $exe is missing."
}
