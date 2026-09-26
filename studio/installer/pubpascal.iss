; Inno Setup script for the PubPascal apps (CLI + IDE desktop).
; Stage the binaries into .\stage\ first (see build.ps1), then:
;   ISCC.exe pubpascal.iss
; Output: .\Output\PubPascal-Setup-<version>.exe

#define AppName "PubPascal"
#define AppVersion "0.1.0"
#define AppPublisher "Isaque Pinheiro"
#define AppURL "https://www.pubpascal.dev"
#define DesktopExe "ppdesktop.exe"
#define OtaBpl "ppota.bpl"
#define BdsVer "37.0"

[Setup]
AppId={{B8E5F1A0-7C3D-4E2B-9F61-2A4D6C8E0B13}
AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppURL}/download
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
OutputDir=Output
OutputBaseFilename=PubPascal-Setup-{#AppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
UninstallDisplayIcon={app}\{#DesktopExe}
; Program Files + system PATH need admin.
PrivilegesRequired=admin

[Languages]
Name: "pt"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"
Name: "en"; MessagesFile: "compiler:Default.isl"

[CustomMessages]
en.AddToPath=Add the pp CLI to PATH (recommended)
pt.AddToPath=Adicionar o CLI pp ao PATH (recomendado)
en.CmdGroup=Command line:
pt.CmdGroup=Linha de comando:
en.WebView2Missing=The Microsoft Edge WebView2 runtime was not detected. The IDE app requires it.%n%nDownload it from: https://developer.microsoft.com/microsoft-edge/webview2/
pt.WebView2Missing=O runtime do Microsoft Edge WebView2 não foi detectado. O app IDE precisa dele.%n%nBaixe em: https://developer.microsoft.com/microsoft-edge/webview2/

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "addtopath"; Description: "{cm:AddToPath}"; GroupDescription: "{cm:CmdGroup}"

[Files]
Source: "stage\{#DesktopExe}";          DestDir: "{app}"; Flags: ignoreversion
Source: "stage\boss.exe";      DestDir: "{app}"; Flags: ignoreversion
; workspace-graph.html is embedded in ppdesktop.exe (RCDATA) — not shipped loose.
Source: "stage\README.txt";         DestDir: "{app}"; Flags: ignoreversion isreadme
; RAD Studio IDE plugin (OTA) — shipped always, installed only when Delphi 13 (BDS 37) is present.
Source: "stage\{#OtaBpl}";          DestDir: "{app}"; Flags: ignoreversion; Check: HasRadStudio('{#BdsVer}')

[Icons]
Name: "{group}\PubPascal Desktop"; Filename: "{app}\{#DesktopExe}"
Name: "{group}\{cm:UninstallProgram,{#AppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\PubPascal Desktop"; Filename: "{app}\{#DesktopExe}"; Tasks: desktopicon

[Registry]
; Append {app} to the system PATH so `pubpascal` works in any terminal.
Root: HKLM; Subkey: "SYSTEM\CurrentControlSet\Control\Session Manager\Environment"; \
  ValueType: expandsz; ValueName: "Path"; ValueData: "{olddata};{app}"; \
  Check: NeedsAddPath('{app}'); Tasks: addtopath
; Register the design-time package so the IDE loads the "PubPascal Workspace" panel on next start.
Root: HKCU; Subkey: "Software\Embarcadero\BDS\{#BdsVer}\Known Packages"; \
  ValueType: string; ValueName: "{app}\{#OtaBpl}"; ValueData: "PubPascal Workspace"; \
  Check: HasRadStudio('{#BdsVer}'); Flags: uninsdeletevalue

[Run]
Filename: "{app}\{#DesktopExe}"; Description: "{cm:LaunchProgram,PubPascal Desktop}"; \
  Flags: nowait postinstall skipifsilent

[Code]
// True when the given RAD Studio (BDS) version is installed for the current user.
function HasRadStudio(Ver: string): Boolean;
begin
  Result := RegKeyExists(HKEY_CURRENT_USER, 'Software\Embarcadero\BDS\' + Ver);
end;

// Only append to PATH when our dir isn't already there (idempotent).
function NeedsAddPath(Param: string): Boolean;
var
  OrigPath: string;
begin
  if not RegQueryStringValue(HKEY_LOCAL_MACHINE,
    'SYSTEM\CurrentControlSet\Control\Session Manager\Environment',
    'Path', OrigPath) then
  begin
    Result := True;
    Exit;
  end;
  Result := Pos(';' + ExpandConstant(Param) + ';', ';' + OrigPath + ';') = 0;
end;

// Warn (don't block) if the WebView2 runtime isn't detected — the IDE app needs
// it. It ships with modern Edge, so this is rare.
function WebView2Installed(): Boolean;
var
  V: string;
begin
  Result :=
    RegQueryStringValue(HKEY_LOCAL_MACHINE,
      'SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', V) or
    RegQueryStringValue(HKEY_CURRENT_USER,
      'SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}', 'pv', V);
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if (CurStep = ssPostInstall) and (not WebView2Installed()) then
    MsgBox(ExpandConstant('{cm:WebView2Missing}'), mbInformation, MB_OK);
end;
