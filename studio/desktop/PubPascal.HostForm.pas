unit PubPascal.HostForm;

// STANDALONE HOST — a thin TForm that parents the reusable TPubPascalFrame and
// injects a folder-based context. The OTA host (PubPascal.IDE) is the same idea
// with a different shell and an IDE-project-based context; the frame is shared.
//
// In this hybrid version, the Standalone Host Form dynamically embeds TEdgeBrowser
// to render the rich dependency graph (workspace-graph.html) on the right side,
// while the IDE plugin remains 100% native VCL for safety and zero footprint.

interface

uses
  System.SysUtils, System.Classes, System.IOUtils, System.JSON,
  System.Net.HttpClient, System.Net.URLClient,
  Winapi.Windows, Winapi.Messages, Winapi.ActiveX, Winapi.ShellAPI,
  Vcl.Controls, Vcl.Forms, Vcl.FileCtrl, Vcl.ExtCtrls, Vcl.StdCtrls, Vcl.Edge, Vcl.Graphics,
  Vcl.Buttons,
  PubPascal.View, PubPascal.Installer, PubPascal.CliRunner;

type
  // The desktop is NOT an IDE, so it cannot wire a package into a project. It
  // fetches and reports where the package landed, telling the user to open it in
  // the IDE plugin (which auto-wires). Satisfies the IPackageInstaller seam so the
  // shared core links here too, without any ToolsAPI dependency.
  TReportInstaller = class(TInterfacedObject, IPackageInstaller)
  public
    function Install(const ARequest: TInstallRequest): TInstallOutcome;
  end;

  // Standalone context: the workspace is the current folder; the CLI is found
  // next to the exe or on PATH. The web view itself is embedded in core.
  TStandaloneContext = class(TInterfacedObject, IPubPascalContext)
  private
    FWorkspace: string;
  public
    constructor Create(const AWorkspace: string);
    function WorkspacePath: string;
    // Desktop context resource: loads the interactive workspaces and git-management graph
    function ViewResource: string;
    function CliPath: string;
    // Standalone installer: reports package landing location to the user
    function Installer: IPackageInstaller;
  end;

  THostForm = class(TForm)
    procedure FormCreate(Sender: TObject);
  private
    FView: TPubPascalFrame;
    FPanelLeft: TPanel;
    FSplitter: TSplitter;
    FContext: IPubPascalContext;
    FCli: ICliRunner;
    FWorkspaceRoot: string;
    FCurrentWorkspaceId: string;
    FDlgFolderEdit: TEdit;
    FEdge: TEdgeBrowser;
    FPanelWeb: TPanel;
    FPanelFallback: TPanel;

    // Custom Title Bar Controls
    FTitlePanel: TPanel;
    FTitleLabel: TLabel;
    FTitleButtons: TPanel;
    FBtnMin: TSpeedButton;
    FBtnMax: TSpeedButton;
    FBtnClose: TSpeedButton;


    // WebView Event Handlers
    procedure _OnEdgeReady(Sender: TCustomEdgeBrowser; AResult: HRESULT);
    procedure _OnWebMessageReceived(Sender: TCustomEdgeBrowser; Args: TWebMessageReceivedEventArgs);
    procedure _LoadGraphHtml;
    function _LoadViewHtml(const AName: string): string;
    
    // WebView Bridge Commands
    procedure _LoadWorkspaces;
    procedure _RefreshStatus(const AWorkspaceId: string);
    procedure _SweepStatus(const AIds: TArray<string>);
    procedure _CloneWorkspace(const AWorkspaceId: string; const AFolder: string = '');
    procedure _SearchCatalog(const AQuery: string);
    procedure _FetchPackageDetail(const APackId: string);
    procedure _RunNodeAction(const AAction, ANode: string);
    procedure _DoLogin(const AToken: string);
    procedure _PullWorkspace;
    procedure _CommitWorkspace(const AMsg: string);
    procedure _ShowDiff;
    procedure _ContributeNode(const APackage: string);
    procedure _PRNode(const APackage: string);
    procedure _DoLogout;
    procedure _ShowSkinnedLoginDialog;
    function _PubPascalConfigPath: string;
    function _StudioSettingsPath: string;
    function _LoadWorkspaceRoot: string;
    procedure _SaveWorkspaceRoot(const APath: string);
    procedure _ApplyWorkspaceRoot(const APath: string);
    procedure _BrowseWorkspaceFolder(Sender: TObject);
    function _PortalBaseUrl: string;
    function _HasGitHubIntegration(out AError: string): Boolean;
    function _ShowGitHubConnectDialog: Boolean;
    function _EnsureGitHubIntegration: Boolean;
    function _ReadPubPascalToken: string;
    function _IsConnected: Boolean;
    function _GetConnectedUserEmail: string;
    procedure _UpdateWebViewUserStatus;
    procedure WMGetMinMaxInfo(var Message: TWMGetMinMaxInfo); message WM_GETMINMAXINFO;
    procedure WMNCHitTest(var Message: TWMNCHitTest); message WM_NCHITTEST;
    procedure CreateParams(var Params: TCreateParams); override;
    procedure _CreateCustomTitleBar;
    procedure TitlePanelMouseDown(Sender: TObject; Button: TMouseButton; Shift: TShiftState; X, Y: Integer);
    procedure BtnMinClick(Sender: TObject);
    procedure BtnMaxClick(Sender: TObject);
    procedure BtnCloseClick(Sender: TObject);
    
    // Styling
    procedure _ApplyDarkStyle(AFrame: TPubPascalFrame);
    
    // Helpers
    function _ExtractJson(const AText: string): string;
    function _StatusState(const AJson: string): string;
    function _ParseWorkspaceIds(const AJson: string): TArray<string>;
    function _ResolvePackageSlug(const ANode: string): string;
    procedure LogStatus(const AMsg: string);
    function _GetResizeDirection(X, Y: Integer): Integer;
  protected
    procedure MouseDown(Button: TMouseButton; Shift: TShiftState; X, Y: Integer); override;
    procedure MouseMove(Shift: TShiftState; X, Y: Integer); override;
  end;

var
  HostForm: THostForm;

implementation

{$R *.dfm}
{$R ..\core\PubPascalView.res}

{ TStandaloneContext }

constructor TStandaloneContext.Create(const AWorkspace: string);
begin
  inherited Create;
  FWorkspace := AWorkspace;
end;

function TStandaloneContext.WorkspacePath: string;
begin
  Result := FWorkspace;
end;

function TStandaloneContext.ViewResource: string;
begin
  Result := 'WORKSPACE_HTML';  // The desktop is git workspace management (the graph)
end;

function TStandaloneContext.CliPath: string;
begin
  // Prefer boss.exe next to the app; otherwise let CreateProcess resolve it
  // on PATH (the installer puts the CLI on PATH) — no loose file required.
  Result := TPath.Combine(ExtractFilePath(ParamStr(0)), 'boss.exe');
  if not TFile.Exists(Result) then
    Result := 'boss.exe';
end;

function TStandaloneContext.Installer: IPackageInstaller;
begin
  Result := TReportInstaller.Create;
end;

{ TReportInstaller }

function TReportInstaller.Install(const ARequest: TInstallRequest): TInstallOutcome;
var
  LWhat: string;
begin
  LWhat := ARequest.Package;
  if ARequest.Version <> '' then
    LWhat := LWhat + '@' + ARequest.Version;
  Result := TInstallOutcome.Done(Format(
    'fetched %s into %s — open it in the IDE plugin to auto-wire the search path.',
    [LWhat, ARequest.ModuleDir]));
end;

{ THostForm }

procedure THostForm.FormCreate(Sender: TObject);
var
  LLabelFallback: TLabel;
begin
  // Setup Premium Form Dimensions
  Self.BorderStyle := bsNone;
  Self.ClientWidth := 1250;
  Self.ClientHeight := 720;
  Self.Caption := 'PubPascal Studio Desktop';
  Self.Color := $0020120B; // Matches dark slate background
  
  // Set padding on all 4 sides to create a border frame (moldura) effect
  Self.Padding.Left := 6;
  Self.Padding.Right := 6;
  Self.Padding.Top := 6;
  Self.Padding.Bottom := 6;

  Self.WindowState := wsMaximized;

  // Build Premium Skinned Custom Title Bar
  _CreateCustomTitleBar;

  // Instantiate Standalone Context and CLI runner for the Host Form
  FWorkspaceRoot := _LoadWorkspaceRoot;
  if FWorkspaceRoot = '' then
    FWorkspaceRoot := GetCurrentDir;
  FContext := TStandaloneContext.Create(FWorkspaceRoot);
  FCli := TCliRunner.Create(FContext.CliPath, FContext.WorkspacePath);

  // 1. Left Panel (Hosts the reusable native VCL Frame) - starts invisible
  FPanelLeft := TPanel.Create(Self);
  FPanelLeft.Parent := Self;
  FPanelLeft.Align := alLeft;
  FPanelLeft.Width := 460;
  FPanelLeft.BevelOuter := bvNone;
  FPanelLeft.Caption := '';
  FPanelLeft.Color := $0020120B;
  FPanelLeft.StyleElements := [seBorder]; // Let background use custom color
  FPanelLeft.Visible := False;

  FView := TPubPascalFrame.Create(Self);
  FView.Parent := FPanelLeft;
  FView.Align := alClient;
  FView.SetContext(FContext);
  FView.Activate;

  // Apply Beautiful Dark Style to the native VCL controls
  _ApplyDarkStyle(FView);

  // 2. Splitter for resizable panels - starts invisible
  FSplitter := TSplitter.Create(Self);
  FSplitter.Parent := Self;
  FSplitter.Align := alLeft;
  FSplitter.Width := 5;
  FSplitter.Color := $001E120B; // Matches modern dark theme
  FSplitter.Visible := False;

  // 3. Right Panel (Web View container)
  FPanelWeb := TPanel.Create(Self);
  FPanelWeb.Parent := Self;
  FPanelWeb.Align := alClient;
  FPanelWeb.BevelOuter := bvNone;
  FPanelWeb.Caption := '';
  FPanelWeb.Color := $0020120B;
  FPanelWeb.StyleElements := [seBorder]; // Let background use custom color

  // 4. Fallback Panel (displayed when WebView2 Runtime is not installed)
  FPanelFallback := TPanel.Create(Self);
  FPanelFallback.Parent := FPanelWeb;
  FPanelFallback.Align := alClient;
  FPanelFallback.BevelOuter := bvNone;
  FPanelFallback.Color := $001A0F0F;
  FPanelFallback.StyleElements := [seBorder];
  FPanelFallback.Caption := '';
  FPanelFallback.Visible := False;

  LLabelFallback := TLabel.Create(Self);
  LLabelFallback.Parent := FPanelFallback;
  LLabelFallback.Align := alClient;
  LLabelFallback.Alignment := taCenter;
  LLabelFallback.Layout := tlCenter;
  LLabelFallback.Font.Name := 'Segoe UI';
  LLabelFallback.Font.Size := 11;
  LLabelFallback.Font.Color := $00CCCCCC;
  LLabelFallback.Caption := 'Interactive Web Viewer Unavailable.' + sLineBreak + 
                             'Please install the Microsoft Edge WebView2 Runtime to view the recursive dependency graph.';

  // 5. Embed TEdgeBrowser Dynamically
  FEdge := TEdgeBrowser.Create(Self);
  FEdge.Parent := FPanelWeb;
  FEdge.Align := alClient;
  // Redirect WebView2 User Data Cache to Local AppData to prevent administrative write permission failures
  FEdge.UserDataFolder := TPath.Combine(TPath.GetCachePath, 'PubPascal\WebView2');
  FEdge.OnCreateWebViewCompleted := _OnEdgeReady;
  FEdge.OnWebMessageReceived := _OnWebMessageReceived;

  // Trigger Edge Browser initialization
  FEdge.CreateWebView;
end;

procedure THostForm._ApplyDarkStyle(AFrame: TPubPascalFrame);
var
  LDarkBg: TColor;
  LDarkPanel: TColor;
  LTextWhite: TColor;
  LBrandBlue: TColor;
begin
  // Color palette matching the webview workspace-graph.html theme
  LDarkBg := $0020120B;     // #0b1220 (Dark slate blue)
  LDarkPanel := $002A170F;  // #0f172a (Slightly lighter dark panel)
  LTextWhite := $00F0E8E2;  // #e2e8f0 (Light gray text)
  LBrandBlue := $00F6823B;  // #3b82f6 (Brand blue)

  AFrame.Color := LDarkBg;

  // Style Left VCL Sidebar Panel
  AFrame.PanelLeft.Color := LDarkBg;
  AFrame.PanelLeft.ParentBackground := False;
  AFrame.PanelLeft.BevelOuter := bvNone;
  AFrame.PanelLeft.StyleElements := [seBorder];

  if AFrame.PanelRight <> nil then
  begin
    AFrame.PanelRight.Color := LDarkBg;
    AFrame.PanelRight.ParentBackground := False;
    AFrame.PanelRight.BevelOuter := bvNone;
    AFrame.PanelRight.StyleElements := [seBorder];
  end;

  // Style Title and Input Labels
  AFrame.LabelTitle.Font.Color := LBrandBlue;
  AFrame.LabelSlug.Font.Color := LTextWhite;
  AFrame.LabelToken.Font.Color := LTextWhite;
  AFrame.LabelDeps.Font.Color := LTextWhite;

  // Style GroupBoxes
  AFrame.GroupBoxInstall.Font.Color := LBrandBlue;
  AFrame.GroupBoxInstall.ParentBackground := False;
  AFrame.GroupBoxInstall.Color := LDarkBg;
  AFrame.GroupBoxInstall.StyleElements := [seBorder];

  AFrame.GroupBoxLogin.Font.Color := LBrandBlue;
  AFrame.GroupBoxLogin.ParentBackground := False;
  AFrame.GroupBoxLogin.Color := LDarkBg;
  AFrame.GroupBoxLogin.StyleElements := [seBorder];

  // Style Input Edit boxes (Removing style elements allows manual coloring in VCL)
  AFrame.EditPackageSlug.StyleElements := [seBorder];
  AFrame.EditPackageSlug.Color := LDarkPanel;
  AFrame.EditPackageSlug.Font.Color := LTextWhite;

  AFrame.EditToken.StyleElements := [seBorder];
  AFrame.EditToken.Color := LDarkPanel;
  AFrame.EditToken.Font.Color := LTextWhite;

  AFrame.ListBoxDeps.StyleElements := [seBorder];
  AFrame.ListBoxDeps.Color := LDarkPanel;
  AFrame.ListBoxDeps.Font.Color := LTextWhite;

  // Style status bar
  AFrame.StatusBar.Color := $001A0F0F;
  AFrame.StatusBar.Font.Color := clLime;
  AFrame.StatusBar.ParentBackground := False;
  AFrame.StatusBar.StyleElements := [seBorder];
end;


procedure THostForm._OnEdgeReady(Sender: TCustomEdgeBrowser; AResult: HRESULT);
begin
  if Succeeded(AResult) then
  begin
    FPanelFallback.Visible := False;
    FEdge.Visible := True;
    _LoadGraphHtml;
  end
  else
  begin
    FPanelFallback.Visible := True;
    FEdge.Visible := False;
    LogStatus('Edge WebView2 initialization failed. Running in native VCL mode only.');
  end;
end;

procedure THostForm._LoadGraphHtml;
var
  LHtml: string;
begin
  LHtml := _LoadViewHtml(FContext.ViewResource);
  if LHtml <> '' then
    FEdge.NavigateToString(LHtml)
  else
    LogStatus('Error: Failed to load workspace HTML resource.');
end;

function THostForm._LoadViewHtml(const AName: string): string;
var
  LRes: TResourceStream;
  LStr: TStringStream;
  LPath: string;
begin
  Result := '';
  // 1. Try to load from local file system first (development hot-reload helper)
  LPath := TPath.Combine(ExtractFilePath(ParamStr(0)), 'workspace-graph.html');
  if not TFile.Exists(LPath) then
    LPath := TPath.Combine(TPath.Combine(ExtractFilePath(ParamStr(0)), '..'), 'workspace-graph.html');
  if not TFile.Exists(LPath) then
    LPath := TPath.Combine(TPath.Combine(TPath.Combine(ExtractFilePath(ParamStr(0)), '..'), '..'), 'workspace-graph.html');
  if not TFile.Exists(LPath) then
    LPath := TPath.Combine(TPath.Combine(TPath.Combine(TPath.Combine(ExtractFilePath(ParamStr(0)), '..'), '..'), 'core'), 'workspace-graph.html');

  if TFile.Exists(LPath) then
  begin
    Result := TFile.ReadAllText(LPath, TEncoding.UTF8);
    Exit;
  end;

  // 2. Fallback: try to load from embedded RCDATA resource
  if FindResource(HInstance, PChar(AName), RT_RCDATA) <> 0 then
  begin
    LRes := TResourceStream.Create(HInstance, AName, RT_RCDATA);
    try
      LStr := TStringStream.Create('', TEncoding.UTF8);
      try
        LStr.CopyFrom(LRes, LRes.Size);
        Result := LStr.DataString;
        Exit;
      finally
        LStr.Free;
      end;
    finally
      LRes.Free;
    end;
  end;
end;

procedure THostForm._OnWebMessageReceived(Sender: TCustomEdgeBrowser; Args: TWebMessageReceivedEventArgs);
var
  LRoot: TJSONValue;
  LAction, LNode, LFolder, LMsg: string;
  LRaw: PWideChar;
begin
  LMsg := '';
  if Succeeded(Args.ArgsInterface.TryGetWebMessageAsString(LRaw)) and (LRaw <> nil) then
  begin
    LMsg := LRaw;
    CoTaskMemFree(LRaw);
  end;
  
  LRoot := TJSONObject.ParseJSONValue(LMsg);
  if LRoot = nil then
    Exit;
    
  try
    if not (LRoot is TJSONObject) then
      Exit;
      
    LAction := TJSONObject(LRoot).GetValue<string>('action');
    if not TJSONObject(LRoot).TryGetValue<string>('node', LNode) then
      LNode := '';
    if not TJSONObject(LRoot).TryGetValue<string>('folder', LFolder) then
      LFolder := '';

    if SameText(LAction, 'ready') then
    begin
      _LoadWorkspaces;
      _UpdateWebViewUserStatus;
      FEdge.ExecuteScript(Format('if (window.setWorkspaceRoot) window.setWorkspaceRoot(%s);', [TJSONString.Create(FWorkspaceRoot).ToJSON]));
    end
    else if SameText(LAction, 'refresh-status') then
    begin
      var LTargetWs := LNode;
      if LTargetWs = '' then
        LTargetWs := FCurrentWorkspaceId;
      _RefreshStatus(LTargetWs);
    end
    else if SameText(LAction, 'switch-workspace') then
    begin
      FCurrentWorkspaceId := LNode;
      _RefreshStatus(FCurrentWorkspaceId);
    end
    else if SameText(LAction, 'clone-workspace') then
      _CloneWorkspace(LNode, LFolder)
    else if SameText(LAction, 'browse-folder') then
    begin
      var LDir := LNode;
      if (LDir = '') or (not TDirectory.Exists(LDir)) then
        LDir := FWorkspaceRoot;
      if (LDir = '') or (not TDirectory.Exists(LDir)) then
        LDir := GetCurrentDir;
      if Vcl.FileCtrl.SelectDirectory('Select Workspace Destination Folder', '', LDir, [sdNewUI, sdNewFolder]) then
      begin
        FEdge.ExecuteScript(Format('if (window.setCloneFolder) window.setCloneFolder(%s);', [TJSONString.Create(LDir).ToJSON]));
      end;
    end
    else if SameText(LAction, 'pull-all') then
      _PullWorkspace
    else if SameText(LAction, 'commit-all') then
      _CommitWorkspace(LNode)
    else if SameText(LAction, 'diff-all') then
      _ShowDiff
    else if SameText(LAction, 'catalog-search') then
      _SearchCatalog(LNode)
    else if SameText(LAction, 'package-detail') then
      _FetchPackageDetail(LNode)
    else if SameText(LAction, 'login') then
      _DoLogin(LNode)
    else if SameText(LAction, 'open-login-dialog') then
      _ShowSkinnedLoginDialog
    else if SameText(LAction, 'logout') then
      _DoLogout
    else if SameText(LAction, 'contribute-node') then
      _ContributeNode(LNode)
    else if SameText(LAction, 'pr-node') then
      _PRNode(LNode)
    else if SameText(LAction, 'setup') then
    begin
      FPanelLeft.Visible := not FPanelLeft.Visible;
      FSplitter.Visible := FPanelLeft.Visible;
    end
    else
      _RunNodeAction(LAction, LNode);
  finally
    LRoot.Free;
  end;
end;

procedure THostForm._LoadWorkspaces;
begin
  if FCli = nil then
    Exit;
  TThread.CreateAnonymousThread(
    procedure
    var
      LOut, LJson: string;
      LOk: Boolean;
      LIds: TArray<string>;
    begin
      LOk := FCli.Run('workspace list --json', LOut);
      LJson := _ExtractJson(LOut);
      if LOk and (LJson <> '') then
      begin
        LIds := _ParseWorkspaceIds(LJson);
        if (FCurrentWorkspaceId = '') and (Length(LIds) > 0) then
          FCurrentWorkspaceId := LIds[0];
        TThread.Queue(nil,
          System.Classes.TThreadProcedure(procedure
          begin
            FEdge.ExecuteScript('window.loadWorkspaces(' + LJson + ')');
            _UpdateWebViewUserStatus;
          end));
        _RefreshStatus(FCurrentWorkspaceId);
        _SweepStatus(LIds);
      end
      else
      begin
        TThread.Queue(nil,
          System.Classes.TThreadProcedure(procedure
          begin
            FEdge.ExecuteScript('window.loadWorkspaces([])');
            _UpdateWebViewUserStatus;
          end));
      end;
    end).Start;
end;

procedure THostForm._RefreshStatus(const AWorkspaceId: string);
var
  LArgs: string;
begin
  if FCli = nil then
    Exit;
    
  if AWorkspaceId = '' then
    LArgs := 'workspace status --json'
  else
    LArgs := 'workspace status ' + AWorkspaceId + ' --json';
    
  LogStatus('Running workspace status check...');
  
  TThread.CreateAnonymousThread(
    procedure
    var
      LOut, LJson: string;
      LOk: Boolean;
    begin
      LOk := FCli.Run(LArgs, LOut);
      LJson := _ExtractJson(LOut);
      TThread.Queue(nil,
        System.Classes.TThreadProcedure(procedure
        begin
          if LOk and (LJson <> '') then
          begin
            FEdge.ExecuteScript('window.loadGraph(' + LJson + ')');
            LogStatus('Workspace status loaded.');
          end
          else
            LogStatus('Status load failed (ensure you are logged in).');
          _UpdateWebViewUserStatus;
        end));
    end).Start;
end;

procedure THostForm._SweepStatus(const AIds: TArray<string>);
begin
  if (FCli = nil) or (Length(AIds) = 0) then
    Exit;
    
  TThread.CreateAnonymousThread(
    procedure
    var
      LId, LOut, LJson, LState, LScript: string;
    begin
      LScript := '';
      for LId in AIds do
      begin
        if FCli.Run('workspace status ' + LId + ' --json', LOut) then
        begin
          LJson := _ExtractJson(LOut);
          LState := _StatusState(LJson);
          if LState <> '' then
            LScript := LScript + Format('window.setWorkspaceDot("%s","%s");', [LId, LState]);
        end;
      end;
      
      if LScript <> '' then
      begin
        TThread.Queue(nil,
          System.Classes.TThreadProcedure(procedure
          begin
            FEdge.ExecuteScript(LScript);
          end));
      end;
    end).Start;
end;

procedure THostForm._SearchCatalog(const AQuery: string);
begin
  if FCli = nil then
    Exit;
    
  TThread.CreateAnonymousThread(
    procedure
    var
      LOut, LJson: string;
      LOk: Boolean;
    begin
      LOk := FCli.Run('workspace search "' + AQuery + '"', LOut);
      LJson := _ExtractJson(LOut);
      TThread.Queue(nil,
        System.Classes.TThreadProcedure(procedure
        begin
          if LOk and (LJson <> '') then
            FEdge.ExecuteScript('window.loadCatalog(' + LJson + ')')
          else
            LogStatus('Catalog search failed.');
        end));
    end).Start;
end;

procedure THostForm._FetchPackageDetail(const APackId: string);
begin
  TThread.CreateAnonymousThread(
    procedure
    var
      LClient: THTTPClient;
      LResponse: IHTTPResponse;
      LUrl, LJson, LConfigPath, LConfigText, LPortalUrl: string;
      LHome: string;
      LConfigJson: TJSONObject;
    begin
      LPortalUrl := 'https://www.pubpascal.dev';
      // Attempt to load portalBaseUrl from ~/.pubpascal/config.json
      LHome := GetEnvironmentVariable('USERPROFILE');
      if LHome = '' then
        LHome := GetEnvironmentVariable('HOMEPATH');
      if LHome <> '' then
      begin
        LConfigPath := TPath.Combine(TPath.Combine(LHome, '.pubpascal'), 'config.json');
        if TFile.Exists(LConfigPath) then
        begin
          try
            LConfigText := TFile.ReadAllText(LConfigPath, TEncoding.UTF8);
            LConfigJson := TJSONObject.ParseJSONValue(LConfigText) as TJSONObject;
            if LConfigJson <> nil then
            begin
              try
                if not LConfigJson.TryGetValue<string>('portalBaseUrl', LPortalUrl) then
                  LConfigJson.TryGetValue<string>('PortalBaseUrl', LPortalUrl);
                LPortalUrl := LPortalUrl.TrimRight(['/']);
              finally
                LConfigJson.Free;
              end;
            end;
          except
            // Fallback to default
          end;
        end;
      end;

      LUrl := Format('%s/api/packages/%s/detail', [LPortalUrl, APackId]);
      LClient := THTTPClient.Create;
      try
        try
          LResponse := LClient.Get(LUrl);
          if LResponse.StatusCode = 200 then
          begin
            LJson := LResponse.ContentAsString(TEncoding.UTF8);
            TThread.Queue(nil,
              System.Classes.TThreadProcedure(procedure
              begin
                FEdge.ExecuteScript('window.loadPackageDetail(' + LJson + ');');
              end));
          end
          else
          begin
            TThread.Queue(nil,
              System.Classes.TThreadProcedure(procedure
              begin
                FEdge.ExecuteScript('window.loadPackageDetail(null);');
              end));
          end;
        except
          TThread.Queue(nil,
            System.Classes.TThreadProcedure(procedure
            begin
              FEdge.ExecuteScript('window.loadPackageDetail(null);');
            end));
        end;
      finally
        LClient.Free;
      end;
    end).Start;
end;

procedure THostForm._CloneWorkspace(const AWorkspaceId: string; const AFolder: string = '');
var
  LTargetFolder: string;
begin
  if FCli = nil then
    Exit;
    
  LTargetFolder := Trim(AFolder);
  if LTargetFolder <> '' then
  begin
    try
      if not TDirectory.Exists(LTargetFolder) then
        TDirectory.CreateDirectory(LTargetFolder);
      _SaveWorkspaceRoot(LTargetFolder);
      _ApplyWorkspaceRoot(LTargetFolder);
    except
      on E: Exception do
        LogStatus('Target directory warning: ' + E.Message);
    end;
  end;

  LogStatus(Format('Cloning workspace %s into %s...', [AWorkspaceId, FWorkspaceRoot]));
  
  TThread.CreateAnonymousThread(
    procedure
    var
      LOut: string;
      LOk: Boolean;
    begin
      LOk := FCli.RunStreaming('workspace clone ' + AWorkspaceId,
        procedure(AProgress: string)
        var
          LParts: TArray<string>;
          LLine: string;
          LI: Integer;
        begin
          LParts := AProgress.Split([#13, #10], TStringSplitOptions.ExcludeEmpty);
          LLine := '';
          for LI := High(LParts) downto 0 do
          begin
            if LParts[LI].TrimLeft.StartsWith('[') then
            begin
              LLine := LParts[LI].Trim;
              Break;
            end;
          end;
          
          if LLine <> '' then
          begin
            TThread.Queue(nil,
              System.Classes.TThreadProcedure(procedure
              begin
                LogStatus('Cloning: ' + LLine);
              end));
          end;
        end, LOut);
        
      TThread.Queue(nil,
        System.Classes.TThreadProcedure(procedure
        var
          LParts: TArray<string>;
          LLine, LMsg: string;
        begin
          if LOk then
          begin
            LMsg := 'Clone complete';
            LParts := LOut.Split([#13, #10], TStringSplitOptions.ExcludeEmpty);
            for LLine in LParts do
              if LLine.TrimLeft.StartsWith('Summary:') then
                LMsg := LLine.Trim;
            LogStatus(LMsg);
            _LoadWorkspaces;
            _RefreshStatus(AWorkspaceId);
          end
          else
            LogStatus('Clone failed (verify login token and git on PATH).');
        end));
    end).Start;
end;

procedure THostForm._RunNodeAction(const AAction, ANode: string);
begin
  if FCli = nil then
    Exit;
    
  LogStatus(Format('Running %s on %s...', [AAction, ANode]));
  
  TThread.CreateAnonymousThread(
    procedure
    var
      LOut, LFirstLine: string;
      LOk: Boolean;
      LParts: TArray<string>;
    begin
      LOk := FCli.Run('workspace ' + AAction, LOut); // runs on the current workspace context
      LParts := LOut.Split([#13, #10], TStringSplitOptions.ExcludeEmpty);
      if Length(LParts) > 0 then
        LFirstLine := LParts[0]
      else
        LFirstLine := '(no output)';
        
      TThread.Queue(nil,
        System.Classes.TThreadProcedure(procedure
        begin
          if LOk then
          begin
            LogStatus(Format('%s completed: %s', [AAction, LFirstLine]));
            FEdge.DefaultInterface.PostWebMessageAsString(PWideChar(Format(
              '{"type":"result","node":"%s","action":"%s","ok":true}', [ANode, AAction])));
          end
          else
            LogStatus(Format('%s failed.', [AAction]));
        end));
    end).Start;
end;

procedure THostForm._DoLogin(const AToken: string);
begin
  if FCli = nil then
    Exit;
    
  LogStatus('Signing in...');
  
  TThread.CreateAnonymousThread(
    procedure
    var
      LOut: string;
      LOk: Boolean;
    begin
      LOk := FCli.Run('login --token ' + AToken, LOut);
      TThread.Queue(nil,
        System.Classes.TThreadProcedure(procedure
        begin
          if LOk and (Pos('successful', LowerCase(LOut)) > 0) then
          begin
            LogStatus('Login successful.');
            FEdge.ExecuteScript('window.clearError();');
            _LoadWorkspaces;
            _RefreshStatus('');
          end
          else
          begin
            LogStatus('Login failed: ' + Trim(LOut));
            _UpdateWebViewUserStatus;
          end;
        end));
    end).Start;
end;

procedure THostForm._DoLogout;
var
  LPath, LText: string;
  LVal: TJSONValue;
  LPair: TJSONPair;
begin
  LPath := _PubPascalConfigPath;
  if (LPath <> '') and TFile.Exists(LPath) then
  begin
    try
      LogStatus('Logging out from portal...');
      LText := TFile.ReadAllText(LPath);
      LVal := TJSONObject.ParseJSONValue(LText);
      if LVal <> nil then
      try
        LPair := TJSONObject(LVal).RemovePair('authToken');
        if LPair <> nil then
          LPair.Free;
        TJSONObject(LVal).AddPair('authToken', '');
        TFile.WriteAllText(LPath, LVal.ToString);
        LogStatus('Disconnected successfully.');
      finally
        LVal.Free;
      end;
    except
      on E: Exception do
        LogStatus('Logout failed: ' + E.Message);
    end;
  end
  else
    LogStatus('Disconnected successfully (no configuration found).');
    
  _UpdateWebViewUserStatus;
  _LoadWorkspaces;
  _RefreshStatus('');
end;

procedure THostForm._ShowSkinnedLoginDialog;
var
  LForm: TForm;
  LEdit, LEditFolder: TEdit;
  LLabel, LLabelFolder: TLabel;
  LBtnOk, LBtnCancel, LBtnBrowse: TButton;
  LChosen: string;
begin
  LForm := TForm.Create(nil);
  try
    LForm.Caption := 'Connect Developer Account';
    LForm.Position := poOwnerFormCenter;
    LForm.BorderStyle := bsDialog;
    LForm.ClientWidth := 400;
    LForm.ClientHeight := 260;
    
    LLabel := TLabel.Create(LForm);
    LLabel.Parent := LForm;
    LLabel.Left := 24;
    LLabel.Top := 20;
    LLabel.Width := 352;
    LLabel.Height := 48;
    LLabel.AutoSize := False;
    LLabel.WordWrap := True;
    LLabel.Caption := 'Enter your developer token from the PubPascal portal to enable publishing and workspace management:';
    
    LEdit := TEdit.Create(LForm);
    LEdit.Parent := LForm;
    LEdit.Left := 24;
    LEdit.Top := 78;
    LEdit.Width := 352;
    LEdit.PasswordChar := '*';
    
    LLabelFolder := TLabel.Create(LForm);
    LLabelFolder.Parent := LForm;
    LLabelFolder.Left := 24;
    LLabelFolder.Top := 116;
    LLabelFolder.Caption := 'Workspace folder (where your cloned repositories live):';

    LEditFolder := TEdit.Create(LForm);
    LEditFolder.Parent := LForm;
    LEditFolder.Left := 24;
    LEditFolder.Top := 136;
    LEditFolder.Width := 268;
    LEditFolder.Text := FWorkspaceRoot;
    FDlgFolderEdit := LEditFolder;

    LBtnBrowse := TButton.Create(LForm);
    LBtnBrowse.Parent := LForm;
    LBtnBrowse.Caption := 'Browse...';
    LBtnBrowse.Left := 300;
    LBtnBrowse.Top := 134;
    LBtnBrowse.Width := 76;
    LBtnBrowse.Height := 25;
    LBtnBrowse.OnClick := _BrowseWorkspaceFolder;

    LBtnOk := TButton.Create(LForm);
    LBtnOk.Parent := LForm;
    LBtnOk.Caption := 'Connect';
    LBtnOk.ModalResult := mrOk;
    LBtnOk.Left := 206;
    LBtnOk.Top := 200;
    LBtnOk.Width := 80;
    LBtnOk.Height := 28;
    LBtnOk.Default := True;
    
    LBtnCancel := TButton.Create(LForm);
    LBtnCancel.Parent := LForm;
    LBtnCancel.Caption := 'Cancel';
    LBtnCancel.ModalResult := mrCancel;
    LBtnCancel.Left := 296;
    LBtnCancel.Top := 200;
    LBtnCancel.Width := 80;
    LBtnCancel.Height := 28;
    
    if LForm.ShowModal = mrOk then
    begin
      LChosen := Trim(LEditFolder.Text);
      if (LChosen <> '') and (LChosen <> FWorkspaceRoot) then
      begin
        if TDirectory.Exists(LChosen) then
        begin
          _ApplyWorkspaceRoot(LChosen);
          _SaveWorkspaceRoot(LChosen);
          _LoadWorkspaces;
          _RefreshStatus('');
        end
        else
          LogStatus('That folder does not exist: ' + LChosen);
      end;

      if Trim(LEdit.Text) <> '' then
        _DoLogin(Trim(LEdit.Text));
    end;
  finally
    FDlgFolderEdit := nil;
    LForm.Free;
  end;
end;

// The CLI writes this file with Go's os.UserHomeDir(), which on Windows is
// %USERPROFILE%. TPath.GetHomePath returns %APPDATA% instead, so every reader
// that used it was looking in a directory the CLI never writes to.
// The studio remembers which folder holds the cloned workspace. Without it the
// app used GetCurrentDir -- its own install directory -- so a workspace cloned
// anywhere else showed every node as MISSING and the page was unusable.
function THostForm._StudioSettingsPath: string;
var
  LConfig: string;
begin
  LConfig := _PubPascalConfigPath;
  if LConfig = '' then
    Exit('');

  Result := TPath.Combine(ExtractFilePath(LConfig), 'studio.json');
end;

function THostForm._LoadWorkspaceRoot: string;
var
  LPath, LText: string;
  LVal: TJSONValue;
begin
  Result := '';
  LPath := _StudioSettingsPath;
  if (LPath = '') or (not TFile.Exists(LPath)) then
    Exit;

  try
    LText := TFile.ReadAllText(LPath);
    LVal := TJSONObject.ParseJSONValue(LText);
    if LVal = nil then
      Exit;
    try
      if not TJSONObject(LVal).TryGetValue<string>('workspaceRoot', Result) then
        Result := '';
    finally
      LVal.Free;
    end;
  except
    Result := '';
  end;

  if (Result <> '') and (not TDirectory.Exists(Result)) then
    Result := '';
end;

procedure THostForm._SaveWorkspaceRoot(const APath: string);
var
  LPath: string;
  LObj: TJSONObject;
begin
  LPath := _StudioSettingsPath;
  if LPath = '' then
    Exit;

  try
    TDirectory.CreateDirectory(ExtractFilePath(LPath));
    LObj := TJSONObject.Create;
    try
      LObj.AddPair('workspaceRoot', APath);
      TFile.WriteAllText(LPath, LObj.ToString);
    finally
      LObj.Free;
    end;
  except
    LogStatus('Could not save the workspace folder.');
  end;
end;

// Re-points the CLI at a new working folder. Every boss command runs with this
// as its working directory, so the graph, the clone target and the git commands
// all follow it.
procedure THostForm._BrowseWorkspaceFolder(Sender: TObject);
var
  LDir: string;
begin
  if FDlgFolderEdit = nil then
    Exit;

  LDir := FDlgFolderEdit.Text;
  if Vcl.FileCtrl.SelectDirectory('Select the folder that holds the workspace', '', LDir,
       [sdNewUI, sdNewFolder]) then
    FDlgFolderEdit.Text := LDir;
end;

procedure THostForm._ApplyWorkspaceRoot(const APath: string);
begin
  if (APath = '') or (not TDirectory.Exists(APath)) then
    Exit;

  FWorkspaceRoot := APath;
  FContext := TStandaloneContext.Create(APath);
  FCli := TCliRunner.Create(FContext.CliPath, FContext.WorkspacePath);
  FView.SetContext(FContext);
  LogStatus('Workspace folder: ' + APath);
end;

// Resolves the portal the CLI is pointed at. Reads "portalBaseUrl" -- the key
// the CLI actually writes. A previous reader looked for "PortalBaseUrl" and,
// TJSONObject.GetValue being case sensitive, silently fell back to production
// even when the developer had configured a local portal.
function THostForm._PortalBaseUrl: string;
var
  LPath, LText, LConfigured: string;
  LVal: TJSONValue;
begin
  Result := 'https://www.pubpascal.dev';

  LPath := _PubPascalConfigPath;
  if (LPath = '') or (not TFile.Exists(LPath)) then
    Exit;

  try
    LText := TFile.ReadAllText(LPath);
    LVal := TJSONObject.ParseJSONValue(LText);
    if LVal = nil then
      Exit;
    try
      if TJSONObject(LVal).TryGetValue<string>('portalBaseUrl', LConfigured) and (Trim(LConfigured) <> '') then
        Result := Trim(LConfigured);
    finally
      LVal.Free;
    end;
  except
    // Keep the default.
  end;

  Result := Result.TrimRight(['/']);
end;

// Asks the portal whether this account has a GitHub credential on file.
//
// Contributing needs two different connections and the window only ever showed
// the first: the portal token in ~/.pubpascal/config.json, and the GitHub
// credential the portal keeps so it can fork and open pull requests on the
// user's behalf. The status bar read "Connected" while a Contribute click died
// on "GitHub integration not found", which looks like a contradiction.
function THostForm._HasGitHubIntegration(out AError: string): Boolean;
var
  LClient: THTTPClient;
  LResponse: IHTTPResponse;
  LToken, LBody, LProvider: string;
  LVal: TJSONValue;
  LArr: TJSONArray;
  LItem: TJSONValue;
begin
  Result := False;
  AError := '';

  LToken := _ReadPubPascalToken;
  if LToken = '' then
  begin
    AError := 'Connect your portal account first.';
    Exit;
  end;

  LClient := THTTPClient.Create;
  try
    try
      LClient.CustomHeaders['Authorization'] := 'Bearer ' + LToken;
      LResponse := LClient.Get(_PortalBaseUrl + '/api/profile/integrations');
      if LResponse.StatusCode <> 200 then
      begin
        AError := Format('the portal answered HTTP %d', [LResponse.StatusCode]);
        Exit;
      end;

      LBody := LResponse.ContentAsString(TEncoding.UTF8);
      LVal := TJSONObject.ParseJSONValue(LBody);
      if LVal = nil then
      begin
        AError := 'the portal answer could not be read';
        Exit;
      end;
      try
        if not TJSONObject(LVal).TryGetValue<TJSONArray>('integrations', LArr) then
          Exit;

        for LItem in LArr do
          if (LItem is TJSONObject) and TJSONObject(LItem).TryGetValue<string>('provider', LProvider)
             and SameText(LProvider, 'github') then
            Exit(True);
      finally
        LVal.Free;
      end;
    except
      on E: Exception do
        AError := E.Message;
    end;
  finally
    LClient.Free;
  end;
end;

// Collects the GitHub credential and hands it to the portal to store.
//
// The token is posted straight to the portal and never written to disk here.
// Keeping it in one place is what lets the portal act on the user's behalf
// without the credential sitting on every machine they work from.
function THostForm._ShowGitHubConnectDialog: Boolean;
var
  LForm: TForm;
  LLabel, LLabelUser, LLabelToken: TLabel;
  LEditUser, LEditToken: TEdit;
  LBtnOk, LBtnCancel: TButton;
  LClient: THTTPClient;
  LResponse: IHTTPResponse;
  LPayload: TJSONObject;
  LStream: TStringStream;
begin
  Result := False;

  LForm := TForm.Create(nil);
  try
    LForm.Caption := 'Connect your GitHub account';
    LForm.Position := poOwnerFormCenter;
    LForm.BorderStyle := bsDialog;
    LForm.ClientWidth := 470;
    LForm.ClientHeight := 260;

    LLabel := TLabel.Create(LForm);
    LLabel.Parent := LForm;
    LLabel.Left := 24;
    LLabel.Top := 16;
    LLabel.Width := 422;
    LLabel.Height := 64;
    LLabel.AutoSize := False;
    LLabel.WordWrap := True;
    LLabel.Caption := 'Contributing forks the package into your GitHub account and opens the ' +
      'pull request for you. The portal needs a token with write access to do that on your ' +
      'behalf: "repo" on a classic token, or Contents + Pull requests on a fine-grained one.';

    LLabelUser := TLabel.Create(LForm);
    LLabelUser.Parent := LForm;
    LLabelUser.Left := 24;
    LLabelUser.Top := 94;
    LLabelUser.Caption := 'GitHub username (the account the forks will live in):';

    LEditUser := TEdit.Create(LForm);
    LEditUser.Parent := LForm;
    LEditUser.Left := 24;
    LEditUser.Top := 114;
    LEditUser.Width := 422;

    LLabelToken := TLabel.Create(LForm);
    LLabelToken.Parent := LForm;
    LLabelToken.Left := 24;
    LLabelToken.Top := 150;
    LLabelToken.Caption := 'Personal access token:';

    LEditToken := TEdit.Create(LForm);
    LEditToken.Parent := LForm;
    LEditToken.Left := 24;
    LEditToken.Top := 170;
    LEditToken.Width := 422;
    LEditToken.PasswordChar := '*';

    LBtnOk := TButton.Create(LForm);
    LBtnOk.Parent := LForm;
    LBtnOk.Caption := 'Connect';
    LBtnOk.ModalResult := mrOk;
    LBtnOk.Default := True;
    LBtnOk.Left := 276;
    LBtnOk.Top := 212;
    LBtnOk.Width := 80;
    LBtnOk.Height := 28;

    LBtnCancel := TButton.Create(LForm);
    LBtnCancel.Parent := LForm;
    LBtnCancel.Caption := 'Cancel';
    LBtnCancel.ModalResult := mrCancel;
    LBtnCancel.Left := 366;
    LBtnCancel.Top := 212;
    LBtnCancel.Width := 80;
    LBtnCancel.Height := 28;

    if LForm.ShowModal <> mrOk then
      Exit;

    if (Trim(LEditUser.Text) = '') or (Trim(LEditToken.Text) = '') then
    begin
      LogStatus('GitHub username and token are both required.');
      Exit;
    end;

    LPayload := TJSONObject.Create;
    LClient := THTTPClient.Create;
    LStream := nil;
    try
      LPayload.AddPair('provider', 'github');
      LPayload.AddPair('accessToken', Trim(LEditToken.Text));
      LPayload.AddPair('providerUser', Trim(LEditUser.Text));

      LStream := TStringStream.Create(LPayload.ToString, TEncoding.UTF8);
      LClient.CustomHeaders['Authorization'] := 'Bearer ' + _ReadPubPascalToken;
      LClient.ContentType := 'application/json';

      LResponse := LClient.Post(_PortalBaseUrl + '/api/profile/integrations', LStream);
      if (LResponse.StatusCode >= 200) and (LResponse.StatusCode < 300) then
      begin
        LogStatus('GitHub account connected.');
        Result := True;
      end
      else
        LogStatus(Format('The portal rejected the GitHub credential (HTTP %d): %s',
          [LResponse.StatusCode, LResponse.ContentAsString(TEncoding.UTF8)]));
    finally
      LStream.Free;
      LClient.Free;
      LPayload.Free;
    end;
  finally
    LForm.Free;
  end;
end;

// Guarantees the GitHub credential exists before anything touches git remotes.
function THostForm._EnsureGitHubIntegration: Boolean;
var
  LError: string;
begin
  if _HasGitHubIntegration(LError) then
    Exit(True);

  if LError <> '' then
    LogStatus('Could not check your GitHub connection: ' + LError);

  Result := _ShowGitHubConnectDialog;
end;

function THostForm._PubPascalConfigPath: string;
var
  LHome: string;
begin
  LHome := GetEnvironmentVariable('USERPROFILE');
  if LHome = '' then
    LHome := GetEnvironmentVariable('HOMEPATH');
  if LHome = '' then
    Exit('');

  Result := TPath.Combine(TPath.Combine(LHome, '.pubpascal'), 'config.json');
end;

// Reads the portal token. The key is "authToken" -- the JSON tag the CLI
// marshals -- and TJSONObject.GetValue is case sensitive, so the previous
// 'AuthToken' never matched and the app reported Disconnected with a perfectly
// valid token on disk.
function THostForm._ReadPubPascalToken: string;
var
  LPath, LText: string;
  LVal: TJSONValue;
begin
  Result := '';
  LPath := _PubPascalConfigPath;
  if (LPath = '') or (not TFile.Exists(LPath)) then
    Exit;

  try
    LText := TFile.ReadAllText(LPath);
    LVal := TJSONObject.ParseJSONValue(LText);
    if LVal = nil then
      Exit;
    try
      if not TJSONObject(LVal).TryGetValue<string>('authToken', Result) then
        Result := '';
    finally
      LVal.Free;
    end;
  except
    Result := '';
  end;
end;

function THostForm._IsConnected: Boolean;
begin
  Result := _ReadPubPascalToken <> '';
end;

function THostForm._GetConnectedUserEmail: string;
var
  LToken: string;
begin
  // The portal never tells the CLI who the user is, so there is no e-mail to
  // show. This used to slice the token apart and append "@gmail.com", putting a
  // fabricated address on screen. A masked token is the truth: it identifies
  // which credential is connected without inventing an identity.
  LToken := _ReadPubPascalToken;
  if LToken = '' then
    Exit('');

  if Length(LToken) > 12 then
    Result := Copy(LToken, 1, 8) + '...' + Copy(LToken, Length(LToken) - 3, 4)
  else
    Result := LToken;
end;

procedure THostForm._UpdateWebViewUserStatus;
begin
  TThread.Queue(nil,
    System.Classes.TThreadProcedure(procedure
    var
      LScript: string;
    begin
      LScript := Format('window.updateUserStatus(%s, "%s");', [
        BoolToStr(_IsConnected, True).ToLower,
        _GetConnectedUserEmail
      ]);
      FEdge.ExecuteScript(LScript);
    end));
end;

procedure THostForm._CreateCustomTitleBar;
begin
  // 1. Custom Title Panel (inherits VCL dark style skin)
  FTitlePanel := TPanel.Create(Self);
  FTitlePanel.Parent := Self;
  FTitlePanel.Align := alTop;
  FTitlePanel.Height := 34;
  FTitlePanel.BevelOuter := bvNone;
  FTitlePanel.OnMouseDown := TitlePanelMouseDown;
  FTitlePanel.OnDblClick := BtnMaxClick;

  // 2. Custom Title Label
  FTitleLabel := TLabel.Create(Self);
  FTitleLabel.Parent := FTitlePanel;
  FTitleLabel.Align := alLeft;
  FTitleLabel.Alignment := taLeftJustify;
  FTitleLabel.Layout := tlCenter;
  FTitleLabel.Font.Name := 'Segoe UI';
  FTitleLabel.Font.Size := 9;
  FTitleLabel.Font.Style := [fsBold];
  FTitleLabel.Caption := '   ' + #$2726 + '  PubPascal Studio Desktop';
  FTitleLabel.OnMouseDown := TitlePanelMouseDown;
  FTitleLabel.OnDblClick := BtnMaxClick;

  // 3. Custom Title Buttons Container
  FTitleButtons := TPanel.Create(Self);
  FTitleButtons.Parent := FTitlePanel;
  FTitleButtons.Align := alRight;
  FTitleButtons.Width := 135;
  FTitleButtons.BevelOuter := bvNone;
  FTitleButtons.Caption := '';
  FTitleButtons.OnMouseDown := TitlePanelMouseDown;
  FTitleButtons.OnDblClick := BtnMaxClick;

  // 4. Control Buttons (Min, Max, Close) - order of creation determines right-to-left layout in VCL
  FBtnMin := TSpeedButton.Create(Self);
  FBtnMin.Parent := FTitleButtons;
  FBtnMin.Align := alRight;
  FBtnMin.Width := 45;
  FBtnMin.Caption := #$2014;
  FBtnMin.Flat := True;
  FBtnMin.Font.Name := 'Segoe UI';
  FBtnMin.Font.Size := 9;
  FBtnMin.Font.Color := $0060D0FF; // Soft Amber/Yellow
  FBtnMin.StyleElements := [seClient, seBorder];
  FBtnMin.OnClick := BtnMinClick;

  FBtnMax := TSpeedButton.Create(Self);
  FBtnMax.Parent := FTitleButtons;
  FBtnMax.Align := alRight;
  FBtnMax.Width := 45;
  FBtnMax.Caption := #$25A1;
  FBtnMax.Flat := True;
  FBtnMax.Font.Name := 'Segoe UI';
  FBtnMax.Font.Size := 9;
  FBtnMax.Font.Color := $0070E070; // Soft Green
  FBtnMax.StyleElements := [seClient, seBorder];
  FBtnMax.OnClick := BtnMaxClick;

  FBtnClose := TSpeedButton.Create(Self);
  FBtnClose.Parent := FTitleButtons;
  FBtnClose.Align := alRight;
  FBtnClose.Width := 45;
  FBtnClose.Caption := #$2715;
  FBtnClose.Flat := True;
  FBtnClose.Font.Name := 'Segoe UI';
  FBtnClose.Font.Size := 9;
  FBtnClose.Font.Color := $007070FF; // Soft Red
  FBtnClose.StyleElements := [seClient, seBorder];
  FBtnClose.OnClick := BtnCloseClick;
end;

procedure THostForm.TitlePanelMouseDown(Sender: TObject; Button: TMouseButton;
  Shift: TShiftState; X, Y: Integer);
begin
  if Button = mbLeft then
  begin
    ReleaseCapture;
    SendMessage(Handle, WM_SYSCOMMAND, $F012, 0);
  end;
end;

procedure THostForm.BtnMinClick(Sender: TObject);
begin
  WindowState := wsMinimized;
end;

procedure THostForm.BtnMaxClick(Sender: TObject);
begin
  if WindowState = wsMaximized then
  begin
    WindowState := wsNormal;
    FBtnMax.Caption := #$25A1;
    Self.Padding.Left := 4;
    Self.Padding.Right := 4;
    Self.Padding.Top := 4;
    Self.Padding.Bottom := 4;
  end
  else
  begin
    WindowState := wsMaximized;
    FBtnMax.Caption := #$25A2;
    Self.Padding.Left := 0;
    Self.Padding.Right := 0;
    Self.Padding.Top := 0;
    Self.Padding.Bottom := 0;
  end;
end;

procedure THostForm.BtnCloseClick(Sender: TObject);
begin
  Close;
end;

procedure THostForm.WMGetMinMaxInfo(var Message: TWMGetMinMaxInfo);
var
  LMonitor: TMonitor;
begin
  inherited;
  LMonitor := Screen.MonitorFromWindow(Handle);
  if LMonitor <> nil then
  begin
    Message.MinMaxInfo.ptMaxSize.X := LMonitor.WorkareaRect.Width;
    Message.MinMaxInfo.ptMaxSize.Y := LMonitor.WorkareaRect.Height;
    Message.MinMaxInfo.ptMaxPosition.X := LMonitor.WorkareaRect.Left - LMonitor.Left;
    Message.MinMaxInfo.ptMaxPosition.Y := LMonitor.WorkareaRect.Top - LMonitor.Top;
  end;
end;

// ------------------------------------------------------------------
// Resize Borderless — CreateParams + WMNCHitTest
//
// bsNone remove WS_THICKFRAME, impedindo que o Windows processe o
// resize mesmo quando WM_NCHITTEST retorna HTLEFT/HTRIGHT/etc.
// Restauramos WS_THICKFRAME em CreateParams (sem bordas visuais, pois
// o VCL Style desenha tudo no NC area) para que o resize nativo
// funcione corretamente na zona de 4px preta ao redor do form.
// ------------------------------------------------------------------

procedure THostForm.CreateParams(var Params: TCreateParams);
begin
  inherited;
  // Restaura WS_THICKFRAME sem WS_CAPTION/WS_BORDER → resize nativo
  Params.Style := Params.Style or WS_THICKFRAME;
end;

procedure THostForm.WMNCHitTest(var Message: TWMNCHitTest);
const
  G = 6; // pixels de grip — ligeiramente maior que o Padding(4) para conforto
var
  LPt: TPoint;
  LR: TRect;
begin
  inherited;

  if WindowState = wsMaximized then
    Exit;

  LPt := Point(Message.XPos, Message.YPos);
  LR  := BoundsRect;

  if      (LPt.X < LR.Left  + G) and (LPt.Y < LR.Top    + G) then Message.Result := HTTOPLEFT
  else if (LPt.X > LR.Right - G) and (LPt.Y < LR.Top    + G) then Message.Result := HTTOPRIGHT
  else if (LPt.X < LR.Left  + G) and (LPt.Y > LR.Bottom - G) then Message.Result := HTBOTTOMLEFT
  else if (LPt.X > LR.Right - G) and (LPt.Y > LR.Bottom - G) then Message.Result := HTBOTTOMRIGHT
  else if (LPt.X < LR.Left  + G)                              then Message.Result := HTLEFT
  else if (LPt.X > LR.Right - G)                              then Message.Result := HTRIGHT
  else if (LPt.Y < LR.Top   + G)                              then Message.Result := HTTOP
  else if (LPt.Y > LR.Bottom- G)                              then Message.Result := HTBOTTOM;
end;

function THostForm._GetResizeDirection(X, Y: Integer): Integer;
const
  G = 8; // Margem de detecção ligeiramente maior para ficar confortável
var
  LLeft, LRight, LTop, LBottom: Boolean;
begin
  Result := 0;
  if WindowState = wsMaximized then
    Exit;

  LLeft   := X < G;
  LRight  := X > ClientWidth - G;
  LTop    := Y < G;
  LBottom := Y > ClientHeight - G;

  if      LTop    and LLeft  then Result := 4 // HTTOPLEFT
  else if LTop    and LRight then Result := 5 // HTTOPRIGHT
  else if LBottom and LLeft  then Result := 7 // HTBOTTOMLEFT
  else if LBottom and LRight then Result := 8 // HTBOTTOMRIGHT
  else if LLeft              then Result := 1 // HTLEFT
  else if LRight             then Result := 2 // HTRIGHT
  else if LTop               then Result := 3 // HTTOP
  else if LBottom            then Result := 6; // HTBOTTOM
end;

procedure THostForm.MouseDown(Button: TMouseButton; Shift: TShiftState; X, Y: Integer);
var
  LDir: Integer;
begin
  inherited;
  if Button = mbLeft then
  begin
    LDir := _GetResizeDirection(X, Y);
    if LDir <> 0 then
    begin
      ReleaseCapture;
      SendMessage(Handle, WM_SYSCOMMAND, $F000 + LDir, 0); // SC_SIZE + LDir
    end;
  end;
end;

procedure THostForm.MouseMove(Shift: TShiftState; X, Y: Integer);
var
  LDir: Integer;
begin
  inherited;
  LDir := _GetResizeDirection(X, Y);
  case LDir of
    1, 2: Cursor := crSizeWE;
    3, 6: Cursor := crSizeNS;
    4, 8: Cursor := crSizeNWSE;
    5, 7: Cursor := crSizeNESW;
  else
    Cursor := crDefault;
  end;
end;


procedure THostForm._ContributeNode(const APackage: string);
var
  LResolved: string;
begin
  if FCli = nil then
    Exit;
    
  if not _EnsureGitHubIntegration then
  begin
    LogStatus('Contribution cancelled: no GitHub account is connected.');
    Exit;
  end;

  LResolved := _ResolvePackageSlug(APackage);
  LogStatus(Format('Setting up contribution for %s (%s)...', [APackage, LResolved]));
  
  TThread.CreateAnonymousThread(
    procedure
    var
      LOut: string;
      LOk: Boolean;
    begin
      LOk := FCli.Run('contribute "' + LResolved + '"', LOut);
      TThread.Queue(nil,
        System.Classes.TThreadProcedure(procedure
        begin
          if LOk then
          begin
            LogStatus(Format('Contribution mode active for %s. You can now commit and submit PR.', [APackage]));
            _RefreshStatus('');
          end
          else
            LogStatus('Failed to setup contribution: ' + Trim(LOut));
        end));
    end).Start;
end;

procedure THostForm._PRNode(const APackage: string);
var
  LResolved: string;
begin
  if FCli = nil then
    Exit;
    
  LResolved := _ResolvePackageSlug(APackage);
  LogStatus(Format('Submitting Pull Request for %s (%s)...', [APackage, LResolved]));
  
  TThread.CreateAnonymousThread(
    procedure
    var
      LOut: string;
      LOk: Boolean;
    begin
      LOk := FCli.Run('contribute "' + LResolved + '" --pr', LOut);
      TThread.Queue(nil,
        System.Classes.TThreadProcedure(procedure
        var
          LPos: Integer;
          LUrl: string;
          LParts: TArray<string>;
        begin
          if LOk then
          begin
            LogStatus('Pull Request submitted successfully.');
            LPos := Pos('https://github.com/', LOut);
            if LPos > 0 then
            begin
              LUrl := Copy(LOut, LPos, Length(LOut) - LPos + 1);
              LParts := LUrl.Split([#13, #10, ' ']);
              if Length(LParts) > 0 then
              begin
                LUrl := Trim(LParts[0]);
                ShellExecute(0, 'open', PChar(LUrl), nil, nil, SW_SHOWNORMAL);
                LogStatus('PR opened in browser: ' + LUrl);
              end;
            end;
            _RefreshStatus('');
          end
          else
            LogStatus('Failed to submit Pull Request: ' + Trim(LOut));
        end));
    end).Start;
end;

function THostForm._ResolvePackageSlug(const ANode: string): string;
var
  LJsonPath, LJsonText, LSlug: string;
  LRoot, LDeps: TJSONValue;
  LObj: TJSONObject;
  LPair: TJSONPair;
begin
  Result := ANode; // fallback
  if FContext = nil then
    Exit;
    
  LJsonPath := TPath.Combine(FContext.WorkspacePath, 'boss.json');
  if not TFile.Exists(LJsonPath) then
    LJsonPath := TPath.Combine(FContext.WorkspacePath, 'pubpascal.json');
    
  if not TFile.Exists(LJsonPath) then
    Exit;
    
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
            LSlug := LPair.JsonString.Value;
            if LSlug.ToLower.EndsWith('/' + ANode.ToLower) or SameText(LSlug, ANode) then
            begin
              Result := LSlug;
              Break;
            end;
          end;
        end;
      end;
    finally
      LRoot.Free;
    end;
  except
    // ignore
  end;
end;

procedure THostForm._PullWorkspace;
begin
  if FCli = nil then
    Exit;
    
  LogStatus('Pulling changes on all workspace repositories...');
  
  TThread.CreateAnonymousThread(
    procedure
    var
      LOut: string;
      LOk: Boolean;
    begin
      LOk := FCli.Run('workspace pull', LOut);
      TThread.Queue(nil,
        System.Classes.TThreadProcedure(procedure
        begin
          if LOk then
            LogStatus('Pull complete.')
          else
            LogStatus('Pull failed.');
          _RefreshStatus('');
        end));
    end).Start;
end;

procedure THostForm._CommitWorkspace(const AMsg: string);
var
  LQuotedMsg: string;
begin
  if FCli = nil then
    Exit;

  // A commit message containing a double quote used to split into extra argv
  // entries, so the tail of the message reached boss as stray arguments.
  // CommandLineToArgvW unescapes \" back to a literal quote, and a trailing
  // backslash would otherwise escape the closing quote itself.
  LQuotedMsg := StringReplace(AMsg, '\', '\\', [rfReplaceAll]);
  LQuotedMsg := StringReplace(LQuotedMsg, '"', '\"', [rfReplaceAll]);

  LogStatus('Committing changes on all modified repositories...');

  TThread.CreateAnonymousThread(
    procedure
    var
      LOut: string;
      LOk: Boolean;
    begin
      LOk := FCli.Run('workspace commit -m "' + LQuotedMsg + '"', LOut);
      TThread.Queue(nil,
        System.Classes.TThreadProcedure(procedure
        begin
          if LOk then
            LogStatus('Commit complete.')
          else
            LogStatus('Commit failed: ' + Trim(LOut));
          _RefreshStatus('');
        end));
    end).Start;
end;

procedure THostForm._ShowDiff;
begin
  if FCli = nil then
    Exit;
    
  LogStatus('Loading uncommitted changes...');
  
  TThread.CreateAnonymousThread(
    procedure
    var
      LOut, LJson: string;
      LOk: Boolean;
    begin
      LOk := FCli.Run('workspace diff --json', LOut);
      LJson := _ExtractJson(LOut);
      TThread.Queue(nil,
        System.Classes.TThreadProcedure(procedure
        begin
          if LOk and (LJson <> '') then
          begin
            FEdge.ExecuteScript('window.loadDiff(' + LJson + ')');
            LogStatus('Diff loaded.');
          end
          else
            LogStatus('Diff: No uncommitted changes detected.');
        end));
    end).Start;
end;

{ Helpers }

function THostForm._ExtractJson(const AText: string): string;
var
  LStart, LEnd: Integer;
begin
  Result := '';
  LStart := Pos('{', AText);
  if LStart = 0 then
    LStart := Pos('[', AText);
  if LStart > 0 then
  begin
    LEnd := LastDelimiter('}', AText);
    if LEnd = 0 then
      LEnd := LastDelimiter(']', AText);
    if LEnd >= LStart then
      Result := Copy(AText, LStart, LEnd - LStart + 1);
  end;
end;

// Helper to deduce the status dot state (missing / dirty / clean) from JSON output
function THostForm._StatusState(const AJson: string): string;
var
  LRoot, LVal: TJSONValue;
  LAllMissing, LAnyDirty, LHasNodes: Boolean;
  LArr: TJSONArray;
  LItem: TJSONValue;
begin
  Result := '';
  LRoot := TJSONObject.ParseJSONValue(AJson);
  if LRoot = nil then
    Exit;
    
  try
    if not (LRoot is TJSONObject) then
      Exit;
    LVal := TJSONObject(LRoot).GetValue('nodes');
    if not (LVal is TJSONArray) then
      Exit;
      
    LArr := TJSONArray(LVal);
    LHasNodes := LArr.Count > 0;
    LAllMissing := LHasNodes;
    LAnyDirty := False;
    
    for LItem in LArr do
    begin
      if LItem is TJSONObject then
      begin
        if not TJSONObject(LItem).GetValue<Boolean>('missing', False) then
          LAllMissing := False;
        if TJSONObject(LItem).GetValue<Boolean>('dirty', False) then
          LAnyDirty := True;
      end;
    end;
    
    if not LHasNodes then
      Exit;
      
    if LAllMissing then
      Result := 'missing'
    else if LAnyDirty then
      Result := 'dirty'
    else
      Result := 'clean';
  finally
    LRoot.Free;
  end;
end;

function THostForm._ParseWorkspaceIds(const AJson: string): TArray<string>;
var
  LRoot, LArrVal, LItem: TJSONValue;
  LId: string;
begin
  SetLength(Result, 0);
  LRoot := TJSONObject.ParseJSONValue(AJson);
  if LRoot = nil then
    Exit;
    
  try
    if not (LRoot is TJSONObject) then
      Exit;
    LArrVal := TJSONObject(LRoot).GetValue('workspaces');
    if not (LArrVal is TJSONArray) then
      Exit;
      
    for LItem in TJSONArray(LArrVal) do
    begin
      if (LItem is TJSONObject) and TJSONObject(LItem).TryGetValue<string>('id', LId) then
        Result := Result + [LId];
    end;
  finally
    LRoot.Free;
  end;
end;

procedure THostForm.LogStatus(const AMsg: string);
begin
  if (FPanelLeft <> nil) and FPanelLeft.Visible and (FView <> nil) and (FView.StatusBar <> nil) then
    FView.StatusBar.Caption := '  ' + AMsg;
  if FEdge <> nil then
    FEdge.ExecuteScript('console.log("Delphi: ' + AMsg.Replace('"', '\"') + '")');
end;

end.

