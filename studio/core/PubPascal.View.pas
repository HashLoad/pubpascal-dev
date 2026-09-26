unit PubPascal.View;

// THE CORE — host-agnostic. All operability (native VCL dashboard, dependency list,
// login, package installation, and git contribution/PR flows via CLI execution)
// lives in this TFrame so the SAME code serves both hosts:
//   - standalone:  a TForm parents the frame (PubPascal.HostForm)
//   - IDE (OTA):   an INTACustomDockableForm whose GetFrameClass returns this
//                  frame class — the IDE docks it (PubPascal.IDE)
// Nothing here knows which host it is in. The host injects the workspace context
// (a folder standalone; the active project's dir inside the IDE) via SetContext.
//
// CLI calls run on a background thread and marshal their result back to the UI
// thread (TThread.Queue), so the window never freezes while the CLI runs.

interface

uses
  Winapi.Windows, Winapi.ShellAPI, System.SysUtils, System.Classes, System.IOUtils,
  System.JSON, Vcl.Controls, Vcl.Forms, Vcl.ExtCtrls, Vcl.StdCtrls,
  PubPascal.CliRunner, PubPascal.Installer;

type
  // The seam the host fills: where the workspace lives, which portal to show,
  // and where the bundled CLI is. Standalone returns a chosen folder + the exe
  // next to the app; the OTA host returns the active project's directory +
  // the exe next to the installed plugin. The frame never reaches for either.
  IPubPascalContext = interface
    ['{6B0C9A40-1D2E-4C7A-9E11-7B5F2A3D8C01}']
    function WorkspacePath: string;  // standalone: chosen folder | OTA: active project dir
    function ViewResource: string;   // embedded HTML to load: WORKSPACE_HTML | PACKAGE_MANAGER_HTML
    function CliPath: string;        // path to the CLI exe (host-resolved); '' -> resolve via PATH
    function Installer: IPackageInstaller; // host-provided: OTA wires into ToolsAPI, desktop reports
  end;

  TPubPascalFrame = class(TFrame)
    PanelLeft: TPanel;
    LabelTitle: TLabel;
    BtnOpenWeb: TButton;
    GroupBoxInstall: TGroupBox;
    LabelSlug: TLabel;
    EditPackageSlug: TEdit;
    BtnInstall: TButton;
    GroupBoxLogin: TGroupBox;
    LabelToken: TLabel;
    EditToken: TEdit;
    BtnLogin: TButton;
    PanelRight: TPanel;
    LabelDeps: TLabel;
    ListBoxDeps: TListBox;
    BtnRefreshDeps: TButton;
    BtnContribute: TButton;
    BtnSubmitPR: TButton;
    StatusBar: TPanel;
    procedure BtnOpenWebClick(Sender: TObject);
    procedure BtnInstallClick(Sender: TObject);
    procedure BtnLoginClick(Sender: TObject);
    procedure BtnRefreshDepsClick(Sender: TObject);
    procedure BtnContributeClick(Sender: TObject);
    procedure BtnSubmitPRClick(Sender: TObject);
  private
    FContext: IPubPascalContext;
    FCli: ICliRunner;  // the decoupled CLI executor (PubPascal.CliRunner)
    procedure _LoadDependencies;
    function _GetSelectedPackage(out APackage: string): Boolean;
    function _PortalBaseUrl: string;
  public
    // Called once by whichever host created the frame.
    procedure SetContext(const AContext: IPubPascalContext);
    procedure Activate;
  end;

implementation

{$R *.dfm}

procedure TPubPascalFrame.SetContext(const AContext: IPubPascalContext);
begin
  FContext := AContext;
end;

procedure TPubPascalFrame.Activate;
begin
  if FContext = nil then
    Exit;
  // Build the decoupled CLI runner from the host-resolved paths (exe + CWD).
  // The frame holds no process logic — it just drives PubPascal.CliRunner.
  FCli := TCliRunner.Create(FContext.CliPath, FContext.WorkspacePath);
  _LoadDependencies;
  StatusBar.Caption := '  ready';
end;

procedure TPubPascalFrame._LoadDependencies;
var
  LJsonPath: string;
  LJsonText: string;
  LRoot: TJSONValue;
  LDeps: TJSONValue;
  LObj: TJSONObject;
  LPair: TJSONPair;
begin
  ListBoxDeps.Items.BeginUpdate;
  try
    ListBoxDeps.Items.Clear;
    if FContext = nil then
    begin
      StatusBar.Caption := '  Error: Context is nil';
      Exit;
    end;
    
    LJsonPath := TPath.Combine(FContext.WorkspacePath, 'boss.json');
    if not TFile.Exists(LJsonPath) then
      LJsonPath := TPath.Combine(FContext.WorkspacePath, 'pubpascal.json');

    if not TFile.Exists(LJsonPath) then
    begin
      StatusBar.Caption := '  boss.json not found in workspace.';
      Exit;
    end;
    
    try
      LJsonText := TFile.ReadAllText(LJsonPath, TEncoding.UTF8);
      LRoot := TJSONObject.ParseJSONValue(LJsonText);
      if LRoot <> nil then
      try
        if LRoot is TJSONObject then
        begin
          LDeps := TJSONObject(LRoot).GetValue('dependencies');
          if (LDeps <> nil) and (LDeps is TJSONObject) then
          begin
            LObj := TJSONObject(LDeps);
            for LPair in LObj do
            begin
              ListBoxDeps.Items.Add(Format('%s: %s', [LPair.JsonString.Value, LPair.JsonValue.Value]));
            end;
            StatusBar.Caption := Format('  Loaded %d dependencies.', [ListBoxDeps.Items.Count]);
          end
          else
            StatusBar.Caption := '  No dependencies found in boss.json.';
        end;
      finally
        LRoot.Free;
      end;
    except
      on E: Exception do
        StatusBar.Caption := '  Error parsing boss.json: ' + E.Message;
    end;
  finally
    ListBoxDeps.Items.EndUpdate;
  end;
end;

function TPubPascalFrame._GetSelectedPackage(out APackage: string): Boolean;
var
  LText: string;
  LPos: Integer;
begin
  Result := False;
  APackage := '';
  if ListBoxDeps.ItemIndex = -1 then
    Exit;
  LText := ListBoxDeps.Items[ListBoxDeps.ItemIndex];
  LPos := Pos(':', LText);
  if LPos > 0 then
    APackage := Trim(Copy(LText, 1, LPos - 1))
  else
    APackage := Trim(LText);
  Result := APackage <> '';
end;

// Resolves the portal to open, honouring the portalBaseUrl the CLI was pointed
// at (a developer running the portal locally must not be sent to production).
// Mirrors the resolution already used by the desktop host.
function TPubPascalFrame._PortalBaseUrl: string;
var
  LHome, LConfigPath, LConfigText, LConfigured: string;
  LConfigJson: TJSONObject;
begin
  Result := 'https://www.pubpascal.dev';

  LHome := GetEnvironmentVariable('USERPROFILE');
  if LHome = '' then
    LHome := GetEnvironmentVariable('HOMEPATH');
  if LHome = '' then
    Exit;

  LConfigPath := TPath.Combine(TPath.Combine(LHome, '.pubpascal'), 'config.json');
  if not TFile.Exists(LConfigPath) then
    Exit;

  try
    LConfigText := TFile.ReadAllText(LConfigPath);
    LConfigJson := TJSONObject.ParseJSONValue(LConfigText) as TJSONObject;
    if LConfigJson = nil then
      Exit;
    try
      if LConfigJson.TryGetValue<string>('portalBaseUrl', LConfigured) and (Trim(LConfigured) <> '') then
        Result := Trim(LConfigured);
    finally
      LConfigJson.Free;
    end;
  except
    // An unreadable or malformed config is not worth failing the click over;
    // the default portal is still the right place to land.
  end;
end;

procedure TPubPascalFrame.BtnOpenWebClick(Sender: TObject);
var
  LUrl: string;
begin
  // This used to call `boss ui`, a command the Go engine has never had -- it
  // belonged to the retired Delphi CLI. Every click failed. Opening the
  // dashboard is a shell concern anyway, not a dependency-manager one.
  LUrl := _PortalBaseUrl;
  StatusBar.Caption := '  Opening ' + LUrl + ' ...';
  ShellExecute(0, 'open', PChar(LUrl), nil, nil, SW_SHOWNORMAL);
end;

procedure TPubPascalFrame.BtnInstallClick(Sender: TObject);
var
  LPkg: string;
begin
  if FCli = nil then
  begin
    StatusBar.Caption := '  Error: CLI runner is not initialized';
    Exit;
  end;
  LPkg := Trim(EditPackageSlug.Text);
  if LPkg = '' then
  begin
    StatusBar.Caption := '  Please enter a package slug.';
    Exit;
  end;
  
  BtnInstall.Enabled := False;
  StatusBar.Caption := Format('  Installing %s ...', [LPkg]);
  
  TThread.CreateAnonymousThread(
    procedure
    var
      LOut: string;
      LOk: Boolean;
    begin
      LOk := FCli.Run('install "' + LPkg + '"', LOut);
      TThread.Queue(nil,
        TThreadProcedure(procedure
        begin
          BtnInstall.Enabled := True;
          if LOk then
          begin
            StatusBar.Caption := Format('  Package %s installed successfully.', [LPkg]);
            _LoadDependencies;
          end
          else
            StatusBar.Caption := '  Installation failed: ' + Trim(LOut);
        end));
    end).Start;
end;

procedure TPubPascalFrame.BtnLoginClick(Sender: TObject);
var
  LToken: string;
begin
  if FCli = nil then
  begin
    StatusBar.Caption := '  Error: CLI runner is not initialized';
    Exit;
  end;
  LToken := Trim(EditToken.Text);
  if LToken = '' then
  begin
    StatusBar.Caption := '  Please enter a login token.';
    Exit;
  end;
  
  BtnLogin.Enabled := False;
  StatusBar.Caption := '  Logging in ...';
  
  TThread.CreateAnonymousThread(
    procedure
    var
      LOut: string;
      LOk: Boolean;
    begin
      LOk := FCli.Run('login --token ' + LToken, LOut);
      TThread.Queue(nil,
        TThreadProcedure(procedure
        begin
          BtnLogin.Enabled := True;
          if LOk and (Pos('successful', LowerCase(LOut)) > 0) then
          begin
            StatusBar.Caption := '  Login successful.';
            EditToken.Text := '';
          end
          else
            StatusBar.Caption := '  Login failed: ' + Trim(LOut);
        end));
    end).Start;
end;

procedure TPubPascalFrame.BtnRefreshDepsClick(Sender: TObject);
begin
  _LoadDependencies;
end;

procedure TPubPascalFrame.BtnContributeClick(Sender: TObject);
var
  LPkg: string;
begin
  if FCli = nil then
  begin
    StatusBar.Caption := '  Error: CLI runner is not initialized';
    Exit;
  end;
  if not _GetSelectedPackage(LPkg) then
  begin
    StatusBar.Caption := '  Error: Select a dependency from the list first.';
    Exit;
  end;

  BtnContribute.Enabled := False;
  BtnSubmitPR.Enabled := False;
  StatusBar.Caption := Format('  Setting up contribution for %s ...', [LPkg]);

  TThread.CreateAnonymousThread(
    procedure
    var
      LOut: string;
      LOk: Boolean;
    begin
      LOk := FCli.Run('contribute "' + LPkg + '"', LOut);
      TThread.Queue(nil,
        TThreadProcedure(procedure
        begin
          BtnContribute.Enabled := True;
          BtnSubmitPR.Enabled := True;
          if LOk then
            StatusBar.Caption := Format('  Contribution mode active for %s. Commit changes and submit PR.', [LPkg])
          else
            StatusBar.Caption := '  Failed to setup contribution: ' + Trim(LOut);
        end));
    end).Start;
end;

procedure TPubPascalFrame.BtnSubmitPRClick(Sender: TObject);
var
  LPkg: string;
begin
  if FCli = nil then
  begin
    StatusBar.Caption := '  Error: CLI runner is not initialized';
    Exit;
  end;
  if not _GetSelectedPackage(LPkg) then
  begin
    StatusBar.Caption := '  Error: Select a dependency from the list first.';
    Exit;
  end;

  BtnContribute.Enabled := False;
  BtnSubmitPR.Enabled := False;
  StatusBar.Caption := Format('  Submitting Pull Request for %s ...', [LPkg]);

  TThread.CreateAnonymousThread(
    procedure
    var
      LOut: string;
      LOk: Boolean;
    begin
      LOk := FCli.Run('contribute "' + LPkg + '" --pr', LOut);
      TThread.Queue(nil,
        TThreadProcedure(procedure
        var
          LPos: Integer;
          LUrl: string;
          LParts: TArray<string>;
        begin
          BtnContribute.Enabled := True;
          BtnSubmitPR.Enabled := True;
          if LOk then
          begin
            StatusBar.Caption := '  Pull Request submitted successfully!';
            
            // Look for the PR URL in the stdout and launch it
            LPos := Pos('https://github.com/', LOut);
            if LPos > 0 then
            begin
              LUrl := Copy(LOut, LPos, Length(LOut) - LPos + 1);
              LParts := LUrl.Split([#13, #10, ' ']);
              if Length(LParts) > 0 then
              begin
                LUrl := Trim(LParts[0]);
                ShellExecute(0, 'open', PChar(LUrl), nil, nil, SW_SHOWNORMAL);
                StatusBar.Caption := '  PR created. Opened in your browser: ' + LUrl;
              end;
            end;
          end
          else
            StatusBar.Caption := '  Failed to submit Pull Request: ' + Trim(LOut);
        end));
    end).Start;
end;

end.
