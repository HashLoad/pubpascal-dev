unit PubPascal.IDE;

// OTA HOST (the evolution) — docks the SAME TPubPascalFrame inside RAD Studio.
// This unit compiles in a DESIGNTIME PACKAGE (requires designide.dcp / ToolsAPI),
// NOT in the standalone exe. The whole point: GetFrameClass returns the shared
// frame, so every bit of operability built for the standalone app works docked
// in the IDE with ZERO duplication. Only the shell + the context differ.
//
// To ship: put this unit in a designtime-only package, add a `Register` call,
// install the package (Components > Install Packages). A "PubPascal Workspace"
// item appears under the View menu and opens the dockable graph.

interface

procedure Register;

implementation

uses
  System.SysUtils, System.Classes, System.IOUtils,
  Vcl.Forms, Vcl.ActnList, Vcl.ImgList, Vcl.Menus, Vcl.ComCtrls,
  System.IniFiles,
  ToolsAPI, DeskUtil, DesignIntf,
  PubPascal.View, PubPascal.Installer;

type
  // The real installer — the OTA's reason to exist. Once the CLI has fetched a
  // package into modules/, this wires it into the running IDE via ToolsAPI, by
  // kind. Lives in the OTA (designtime) package because ONLY here is ToolsAPI
  // linkable; the core reaches it through the IPackageInstaller seam (DIP).
  TIdePackageInstaller = class(TInterfacedObject, IPackageInstaller)
  private
    // Adds APaths to the active project's base-configuration unit search path,
    // skipping ones already present. Returns how many were added; AProjectName is
    // '' when there is no active project. This is the per-project install (each
    // project pins its own version) — the central case from the design.
    function _AddSearchPaths(const APaths: TArray<string>;
      out AProjectName: string): Integer;
    class function _PathListHas(const AList: TArray<string>;
      const AItem: string): Boolean; static;
  public
    function Install(const ARequest: TInstallRequest): TInstallOutcome;
  end;

  // IDE context: the workspace is the ACTIVE PROJECT's directory (from ToolsAPI),
  // and the view is the live portal graph. The frame asks for these via the same
  // IPubPascalContext seam the standalone host fills — it never touches ToolsAPI.
  TIdeContext = class(TInterfacedObject, IPubPascalContext)
  public
    function WorkspacePath: string;
    function ViewResource: string;
    function CliPath: string;
    function Installer: IPackageInstaller;
  end;

  // The dockable form descriptor. INTACustomDockableForm tells the IDE how to
  // build/dock the window; GetFrameClass is the bridge to the shared core.
  TPubPascalDockable = class(TInterfacedObject, INTACustomDockableForm)
  public
    function GetCaption: string;
    function GetFrameClass: TCustomFrameClass;
    procedure FrameCreated(AFrame: TCustomFrame);
    function GetIdentifier: string;
    function GetMenuActionList: TCustomActionList;
    function GetMenuImageList: TCustomImageList;
    procedure CustomizePopupMenu(PopupMenu: TPopupMenu);
    function GetToolBarActionList: TCustomActionList;
    function GetToolBarImageList: TCustomImageList;
    procedure CustomizeToolBar(ToolBar: TToolBar);
    procedure SaveWindowState(Desktop: TCustomIniFile; const Section: string; IsProject: Boolean);
    procedure LoadWindowState(Desktop: TCustomIniFile; const Section: string);
    function GetEditState: TEditState;
    function EditAction(Action: TEditAction): Boolean;
  end;

type
  // TMenuItem.OnClick is a TNotifyEvent (method-of-object); a plain/anonymous
  // procedure can't be assigned to it, so the handler lives on this object.
  TMenuHook = class
    procedure Click(Sender: TObject);
  end;

var
  FDock: TCustomForm;     // the single docked instance
  GMenuHook: TMenuHook;
  GMenuItem: TMenuItem;   // our menu entry, freed on package unload

{ TIdeContext }

function TIdeContext.WorkspacePath: string;
var
  LProj: IOTAProject;
begin
  Result := GetCurrentDir;
  LProj := (BorlandIDEServices as IOTAModuleServices).GetActiveProject;
  if LProj <> nil then
    Result := ExtractFileDir(LProj.FileName); // the open project IS the workspace
end;

function TIdeContext.ViewResource: string;
begin
  Result := 'PACKAGE_MANAGER_HTML';  // the OTA is the in-IDE package-manager cockpit
end;

function TIdeContext.CliPath: string;
begin
  // OTA: prefer boss.exe next to the installed plugin BPL — NOT next to bds.exe
  // (that was the standalone-only assumption). GetModuleName(HInstance) resolves
  // THIS package's own path. Fall back to PATH so a dev test works even when the
  // exe is not sitting beside the bpl (the installer puts the CLI on PATH).
  Result := TPath.Combine(ExtractFilePath(GetModuleName(HInstance)), 'boss.exe');
  if not TFile.Exists(Result) then
    Result := 'boss.exe';
end;

function TIdeContext.Installer: IPackageInstaller;
begin
  Result := TIdePackageInstaller.Create;
end;

{ TIdePackageInstaller }

class function TIdePackageInstaller._PathListHas(const AList: TArray<string>;
  const AItem: string): Boolean;
var
  LEntry: string;
begin
  for LEntry in AList do
    if SameText(LEntry.Trim, AItem.Trim) then
      Exit(True);
  Result := False;
end;

function TIdePackageInstaller._AddSearchPaths(const APaths: TArray<string>;
  out AProjectName: string): Integer;
var
  LProject: IOTAProject;
  LConfigs: IOTAProjectOptionsConfigurations;
  LBase: IOTABuildConfiguration;
  LCurrent, LPath: string;
  LExisting: TArray<string>;
begin
  Result := 0;
  AProjectName := '';
  LProject := (BorlandIDEServices as IOTAModuleServices).GetActiveProject;
  if LProject = nil then
    Exit;
  AProjectName := ExtractFileName(LProject.FileName);
  // The base configuration applies across every platform/config, so the path is
  // pinned for the whole project regardless of the active target.
  if not Supports(LProject.ProjectOptions, IOTAProjectOptionsConfigurations, LConfigs) then
    Exit;
  LBase := LConfigs.BaseConfiguration;
  LCurrent := LBase.Value['DCC_UnitSearchPath'];
  LExisting := LCurrent.Split([';']);
  for LPath in APaths do
    if not _PathListHas(LExisting, LPath) then
    begin
      if LCurrent.Trim = '' then
        LCurrent := LPath
      else
        LCurrent := LCurrent + ';' + LPath;
      Inc(Result);
    end;
  if Result > 0 then
  begin
    LBase.Value['DCC_UnitSearchPath'] := LCurrent;
    LProject.MarkModified;  // flag dirty so the user can save the .dproj
  end;
end;

function TIdePackageInstaller.Install(const ARequest: TInstallRequest): TInstallOutcome;
var
  LAdded: Integer;
  LProjName, LWhat: string;
begin
  LWhat := ARequest.Package;
  if ARequest.Version <> '' then
    LWhat := LWhat + '@' + ARequest.Version;

  case ARequest.Kind of
    ikSource:
      begin
        if Length(ARequest.SourcePaths) = 0 then
          Exit(TInstallOutcome.Done(Format(
            'fetched %s — but pubpascal.json declares no sources to add.', [LWhat])));
        LAdded := _AddSearchPaths(ARequest.SourcePaths, LProjName);
        if LProjName = '' then
          Exit(TInstallOutcome.Fail(Format(
            'fetched %s — open a project first, then Install to add its search path.', [LWhat])));
        if LAdded = 0 then
          Exit(TInstallOutcome.Done(Format(
            '%s already on %s search path.', [LWhat, LProjName])));
        Result := TInstallOutcome.Done(Format(
          'installed %s -> +%d path(s) on %s (Project > Options > Search path; save to keep).',
          [LWhat, LAdded, LProjName]));
      end;
    ikDesigntime:
      Result := TInstallOutcome.Done(Format(
        'fetched %s (design-time) into modules/ — registering its .bpl in the IDE is the next increment.',
        [LWhat]));
    ikInstaller:
      Result := TInstallOutcome.Done(Format(
        'fetched %s (installer) into modules/ — running the vendor installer is the next increment.',
        [LWhat]));
  else
    Result := TInstallOutcome.Fail('unknown install kind.');
  end;
end;

{ TPubPascalDockable — the key methods; the rest are required stubs }

function TPubPascalDockable.GetCaption: string;
begin
  Result := 'PubPascal Workspace';
end;

function TPubPascalDockable.GetIdentifier: string;
begin
  Result := 'PubPascal.Workspace.Dockable';
end;

// THE bridge to the shared core — the IDE builds this exact frame.
function TPubPascalDockable.GetFrameClass: TCustomFrameClass;
begin
  Result := TPubPascalFrame;
end;

// Inject the IDE context + activate — same two calls the standalone host makes.
procedure TPubPascalDockable.FrameCreated(AFrame: TCustomFrame);
begin
  (AFrame as TPubPascalFrame).SetContext(TIdeContext.Create);
  (AFrame as TPubPascalFrame).Activate;
end;

function TPubPascalDockable.GetMenuActionList: TCustomActionList; begin Result := nil; end;
function TPubPascalDockable.GetMenuImageList: TCustomImageList; begin Result := nil; end;
procedure TPubPascalDockable.CustomizePopupMenu(PopupMenu: TPopupMenu); begin end;
function TPubPascalDockable.GetToolBarActionList: TCustomActionList; begin Result := nil; end;
function TPubPascalDockable.GetToolBarImageList: TCustomImageList; begin Result := nil; end;
procedure TPubPascalDockable.CustomizeToolBar(ToolBar: TToolBar); begin end;
procedure TPubPascalDockable.SaveWindowState(Desktop: TCustomIniFile; const Section: string; IsProject: Boolean); begin end;
procedure TPubPascalDockable.LoadWindowState(Desktop: TCustomIniFile; const Section: string); begin end;
function TPubPascalDockable.GetEditState: TEditState; begin Result := []; end;
function TPubPascalDockable.EditAction(Action: TEditAction): Boolean; begin Result := False; end;

procedure ShowWorkspace;
begin
  if FDock = nil then
    FDock := (BorlandIDEServices as INTAServices).CreateDockableForm(TPubPascalDockable.Create);
  FDock.Show;
end;

procedure TMenuHook.Click(Sender: TObject);
begin
  ShowWorkspace;
end;

procedure Register;
var
  LServices: INTAServices;
begin
  LServices := BorlandIDEServices as INTAServices;
  if GMenuHook = nil then
    GMenuHook := TMenuHook.Create;
  GMenuItem := TMenuItem.Create(nil);
  GMenuItem.Caption := 'PubPascal Workspace';
  GMenuItem.OnClick := GMenuHook.Click;
  // Attach directly to the IDE menu bar. We do NOT use AddActionMenu('<name>')
  // because the named main-menu items vary across RAD Studio versions (the old
  // 'ViewMainMenu' guess does not exist in BDS 37) — MainMenu itself is always
  // present, so a top-level item is version-proof.
  LServices.MainMenu.Items.Add(GMenuItem);
end;

initialization

finalization
  // The package can be unloaded (Install Packages > uncheck) — remove our menu
  // entry and hook so nothing dangles on the IDE menu bar.
  FreeAndNil(GMenuItem);
  FreeAndNil(GMenuHook);

end.
