# PubPascal Desktop app — headless build via dcc64 (no IDE required).
#
# Compiles ppdesktop.dpr (the standalone WebView2 host) for Win64. RTL/VCL and
# Vcl.Edge (WebView2) come from $BDS — no vendored .modules needed (unlike the
# CLI). The program resource ({$R *.res}) is generated from ppdesktop.rc with
# brcc32 when missing (cgrc needs the Windows SDK rc.exe, which may be absent).
#
# Usage:
#   pwsh -File scripts/build.ps1                 # Release
#   pwsh -File scripts/build.ps1 -Config Debug
#   pwsh -File scripts/build.ps1 -BdsVersion 23.0

[CmdletBinding()]
param(
    [ValidateSet('Debug', 'Release')]
    [string] $Config = 'Release',
    [string] $BdsVersion = '37.0'
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $root

$bds = "C:\Program Files (x86)\Embarcadero\Studio\$BdsVersion"
if (-not (Test-Path "$bds\bin\dcc64.exe")) {
    throw "dcc64 not found at $bds\bin. Pass -BdsVersion with an installed Studio version."
}
$env:BDS = $bds
$env:PATH = "$bds\bin;$bds\bin64;$env:PATH"

# Copy the VCL Style file dynamically to embed it as a resource
$styleSource = Join-Path $bds "Redist\styles\vcl\Windows10Dark.vsf"
if (Test-Path $styleSource) {
    Copy-Item $styleSource .\Windows10Dark.vsf -Force
    Write-Host "==> Copied VCL Style: Windows10Dark.vsf from RAD Studio Redist"
} else {
    Write-Warning "VCL Style Windows10Dark.vsf not found at $styleSource!"
}

try {
    # Compiles a .rc, falling back to brcc32 when cgrc cannot reach the Windows
    # SDK's rc.exe. This used to swallow the failure: cgrc printed "Unable to
    # invoke rc.exe", the build carried on, and the exe silently kept the
    # previously embedded HTML -- so edits to workspace-graph.html appeared to
    # do nothing. A resource that cannot be built is now a hard error.
    function Build-Resource([string] $RcFile, [switch] $Required) {
        $res = [System.IO.Path]::ChangeExtension($RcFile, '.res')

        # The two compilers are complementary: cgrc handles the program resource
        # (modern icon, version info) but needs the Windows SDK's rc.exe, which
        # is not always installed; brcc32 has no such dependency and compiles the
        # RCDATA web views, but dies with "Allocate failed" on the large icon.
        # A failed attempt can leave the .res deleted or truncated -- brcc32
        # creates the output first and then dies on the large icon -- so keep a
        # copy and put it back rather than leaving the tree worse than we found it.
        $backup = $null
        if (Test-Path $res) {
            $backup = "$res.bak"
            Copy-Item $res $backup -Force
        }

        foreach ($tool in @('cgrc.exe', 'brcc32.exe')) {
            $exe = Join-Path "$bds\bin" $tool
            if (-not (Test-Path $exe)) { continue }

            & $exe $RcFile 2>&1 | Out-Null
            if (($LASTEXITCODE -eq 0) -and (Test-Path $res)) {
                Write-Host "==> Resource OK ($tool): $RcFile"
                if ($backup) { Remove-Item $backup -Force -EA SilentlyContinue }
                return
            }
        }

        # Last resort: drop the ICON line and retry. brcc32 dies with
        # "Allocate failed" on a modern multi-resolution icon, but the rest of
        # the script matters -- ppdesktop.rc also carries the VCLSTYLE the form
        # requires, and without it the app opens on
        # "Style 'Windows10 Dark' not found". Losing the icon is cosmetic;
        # losing the style stops the program.
        $brcc = Join-Path "$bds\bin" 'brcc32.exe'
        if ((Test-Path $brcc) -and (Select-String -Path $RcFile -Pattern '^\s*MAINICON\s+ICON' -Quiet)) {
            $reduced = [System.IO.Path]::ChangeExtension($RcFile, '.noicon.rc')
            (Get-Content $RcFile) | Where-Object { $_ -notmatch '^\s*MAINICON\s+ICON' } | Set-Content $reduced -Encoding Ascii

            & $brcc $reduced 2>&1 | Out-Null
            $reducedRes = [System.IO.Path]::ChangeExtension($reduced, '.res')
            if (($LASTEXITCODE -eq 0) -and (Test-Path $reducedRes)) {
                Move-Item $reducedRes $res -Force
                Remove-Item $reduced -Force -EA SilentlyContinue
                if ($backup) { Remove-Item $backup -Force -EA SilentlyContinue }
                Write-Warning "Compiled $RcFile without its icon (brcc32 cannot handle it); version info and VCL style are present."
                return
            }
            Remove-Item $reduced, $reducedRes -Force -EA SilentlyContinue
        }

        if ($backup) {
            Copy-Item $backup $res -Force
            Remove-Item $backup -Force -EA SilentlyContinue
        }

        if ($Required) {
            throw "Could not compile $RcFile -- the binary would embed an outdated web view."
        }

        Write-Warning "Could not compile $RcFile (icon/version info only); continuing."
    }

    # Program resource: cosmetic (icon + version info). Optional.
    Build-Resource 'ppdesktop.rc'

    # Shared embedded web view: this IS the UI. Compiled from core/ so the RCDATA
    # path resolves to core\workspace-graph.html. A stale one ships a stale app.
    Push-Location '..\core'
    try { Build-Resource 'PubPascalView.rc' -Required } finally { Pop-Location }

    # RTL namespaces so unqualified unit names (Forms, Edge, ...) resolve.
    $NS = 'System;Xml;Data;Datasnap;Web;Soap;Winapi;System.Win;Vcl;Vcl.Imaging'

    $outDir = ".\Win64\$Config"
    New-Item -ItemType Directory -Force $outDir | Out-Null

    $dccArgs = @("-NS$NS", "-NU$outDir", "-E$outDir")
    if ($Config -eq 'Release') { $dccArgs += '-$O+'; $dccArgs += '-DRELEASE' }
    else { $dccArgs += '-V'; $dccArgs += '-DDEBUG' }

    Write-Host "==> dcc64 ($BdsVersion) building ppdesktop.dpr [$Config, Win64]"
    $out = & "$bds\bin\dcc64.exe" @dccArgs 'ppdesktop.dpr' 2>&1
    $errors = $out | Select-String -Pattern 'Error|Fatal|E\d{4}|F\d{4}'
    if ($errors) {
        $errors | Select-Object -First 30 | ForEach-Object { Write-Host $_ }
        throw "Build FAILED."
    }

    $exe = Join-Path $outDir 'ppdesktop.exe'
    if (Test-Path $exe) {
        $mb = [math]::Round((Get-Item $exe).Length / 1MB, 2)
        Write-Host "==> Build OK: $exe ($mb MB)"
        # The web view is embedded in the exe now (RCDATA) — no loose HTML needed.
        # For a runnable dev build, drop the CLI beside it; the shipped app also
        # finds boss.exe on PATH (the installer puts it there).
        $cli = Join-Path $root '..\..\cli\Win64\Release\boss.exe'
        if (Test-Path $cli) {
            Copy-Item $cli $outDir -Force
            Write-Host "    Dropped boss.exe beside the exe (dev convenience; PATH also works)."
        }
    } else {
        throw "Build reported no errors but $exe is missing."
    }
} finally {
    if (Test-Path .\Windows10Dark.vsf) {
        Remove-Item .\Windows10Dark.vsf -Force
        Write-Host "==> Cleaned up temporary VCL style file."
    }
}

