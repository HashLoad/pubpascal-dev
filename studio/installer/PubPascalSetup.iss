; PubPascal — installer (Inno Setup) — SCAFFOLD
; ONE installer, three components: the CLI, the standalone app, and the IDE
; plugin. The plugin component only enables when a supported RAD Studio is found.
;
; Build the artifacts first, then compile this .iss with Inno Setup (ISCC.exe):
;   - bin\boss.exe              (the CLI — Release build)
;   - bin\ppdesktop.exe           (the standalone app)
;   - bin\WebView2Loader.dll         (needed by TEdgeBrowser at runtime)
;   - bin\D120\ppota.bpl      (the designtime package, built for Delphi 12)
;     (add bin\D110\... etc. for more IDE versions)

#define AppName "PubPascal"
#define AppVer  "0.18.0"

[Setup]
AppName={#AppName}
AppVersion={#AppVer}
DefaultDirName={autopf}\PubPascal
DefaultGroupName=PubPascal
OutputBaseFilename=PubPascalSetup
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=lowest
; lowest → installs per-user; the IDE Known-Packages key lives under HKCU anyway.

[Components]
Name: "cli";    Description: "PubPascal CLI (boss.exe + PATH)";        Types: full compact custom; Flags: fixed
Name: "app";    Description: "Desktop app (workspace graph)";              Types: full
Name: "plugin"; Description: "RAD Studio IDE plugin (docked panel)";       Types: full; Check: HasAnyRadStudio

[Files]
; --- CLI ---
Source: "..\..\cli\Win64\Release\boss.exe"; DestDir: "{app}"; Components: cli; Flags: ignoreversion
; --- standalone app (+ its web view + the WebView2 loader) ---
Source: "bin\ppdesktop.exe";   DestDir: "{app}"; Components: app;            Flags: ignoreversion
Source: "..\workspace-graph.html"; DestDir: "{app}"; Components: app;           Flags: ignoreversion
Source: "bin\WebView2Loader.dll"; DestDir: "{app}"; Components: app plugin;     Flags: ignoreversion
; --- IDE plugin (.bpl per IDE version) ---
Source: "bin\D120\ppota.bpl"; DestDir: "{app}\D120"; Components: plugin; Flags: ignoreversion; Check: HasRadStudio('23.0')

[Registry]
; Register the designtime package so the IDE loads it on next start.
Root: HKCU; Subkey: "Software\Embarcadero\BDS\23.0\Known Packages"; \
  ValueType: string; ValueName: "{app}\D120\ppota.bpl"; ValueData: "PubPascal Workspace"; \
  Components: plugin; Check: HasRadStudio('23.0'); Flags: uninsdeletevalue
; Put the CLI on PATH (per-user).
Root: HKCU; Subkey: "Environment"; ValueType: expandsz; ValueName: "Path"; \
  ValueData: "{olddata};{app}"; Components: cli; Check: NeedsPath('{app}')

[Icons]
Name: "{group}\PubPascal (desktop)"; Filename: "{app}\ppdesktop.exe"; Components: app

[Code]
function HasRadStudio(Ver: string): Boolean;
begin
  // A RAD Studio version is present if its BDS registry key exists.
  Result := RegKeyExists(HKCU, 'Software\Embarcadero\BDS\' + Ver);
end;

function HasAnyRadStudio: Boolean;
begin
  // Extend this list as more versions get a built .bpl (22.0=11, 23.0=12, ...).
  Result := HasRadStudio('23.0');
end;

function NeedsPath(Param: string): Boolean;
var
  P: string;
begin
  if not RegQueryStringValue(HKCU, 'Environment', 'Path', P) then P := '';
  Result := Pos(';' + ExpandConstant(Param) + ';', ';' + P + ';') = 0;
end;
