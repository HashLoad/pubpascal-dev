unit PubPascal.CliRunner;

// DECOUPLED CLI execution — spawns boss.exe in a workspace folder and
// captures its output. PURE: no VCL, no TFrame, no ToolsAPI. That is the whole
// point — the SAME unit runs the CLI for:
//   - the standalone frame today (PubPascal.View),
//   - the OTA dockable form tomorrow (PubPascal.IDE),
//   - tests and a console harness.
// The host supplies BOTH the exe path and the working directory, because they
// differ per host: standalone = boss.exe next to the app; OTA = next to
// the installed plugin (NOT next to bds.exe). This unit only knows how to run a
// child process and read its stdout/stderr.

interface

uses
  System.SysUtils;

type
  ICliRunner = interface
    ['{7C4D9E20-3A8B-4F12-B6E5-1D9C2A4F8B03}']
    // Runs `<exe> <AArgs>` with the workspace folder as the current directory.
    // Returns True if the process started; AOutput receives the captured output.
    function Run(const AArgs: string; out AOutput: string): Boolean;
    // Same, but calls AOnProgress with the output-so-far after every read — for
    // long commands (clone) that print progress lines incrementally, so the host
    // can surface live progress instead of waiting for the whole run.
    function RunStreaming(const AArgs: string; const AOnProgress: TProc<string>;
      out AOutput: string): Boolean;
  end;

  TCliRunner = class(TInterfacedObject, ICliRunner)
  private
    FExePath: string;
    FWorkDir: string;
  public
    constructor Create(const AExePath, AWorkDir: string);
    function Run(const AArgs: string; out AOutput: string): Boolean;
    function RunStreaming(const AArgs: string; const AOnProgress: TProc<string>;
      out AOutput: string): Boolean;
  end;

implementation

uses
  Winapi.Windows;

constructor TCliRunner.Create(const AExePath, AWorkDir: string);
begin
  inherited Create;
  FExePath := AExePath;
  FWorkDir := AWorkDir;
end;

function TCliRunner.Run(const AArgs: string; out AOutput: string): Boolean;
begin
  // The plain run is the streaming run with no progress callback.
  Result := RunStreaming(AArgs, nil, AOutput);
end;

function TCliRunner.RunStreaming(const AArgs: string;
  const AOnProgress: TProc<string>; out AOutput: string): Boolean;
var
  LSec: TSecurityAttributes;
  LRead, LWrite: THandle;
  LStart: TStartupInfo;
  LProc: TProcessInformation;
  LBuf: array[0..4095] of Byte;
  LBytes: TBytes;
  LCount: DWORD;
  LAt: Integer;
  LCmd: string;
begin
  Result := False;
  AOutput := '';
  LCmd := Format('"%s" %s', [FExePath, AArgs]);

  LSec.nLength := SizeOf(LSec);
  LSec.bInheritHandle := True;
  LSec.lpSecurityDescriptor := nil;
  if not CreatePipe(LRead, LWrite, @LSec, 0) then
    Exit;
  try
    SetHandleInformation(LRead, HANDLE_FLAG_INHERIT, 0);
    FillChar(LStart, SizeOf(LStart), 0);
    LStart.cb := SizeOf(LStart);
    LStart.dwFlags := STARTF_USESTDHANDLES or STARTF_USESHOWWINDOW;
    LStart.wShowWindow := SW_HIDE;
    LStart.hStdOutput := LWrite;
    LStart.hStdError := LWrite;
    if CreateProcess(nil, PChar(LCmd), nil, nil, True, CREATE_NO_WINDOW,
      nil, PChar(FWorkDir), LStart, LProc) then
    begin
      CloseHandle(LWrite);
      LWrite := 0;
      // ReadFile blocks until the child writes (or the pipe closes), so each
      // iteration arrives roughly as the CLI flushes a line — good enough to
      // drive a per-step progress display without a second thread. We accumulate
      // raw bytes and decode UTF-8 (the CLI emits UTF-8), so accented output
      // survives — a mid-read partial sequence self-corrects on the next read.
      SetLength(LBytes, 0);
      while ReadFile(LRead, LBuf, SizeOf(LBuf), LCount, nil) and (LCount > 0) do
      begin
        LAt := Length(LBytes);
        SetLength(LBytes, LAt + Integer(LCount));
        Move(LBuf[0], LBytes[LAt], LCount);
        AOutput := TEncoding.UTF8.GetString(LBytes);
        if Assigned(AOnProgress) then
          AOnProgress(AOutput);
      end;
      WaitForSingleObject(LProc.hProcess, INFINITE);
      CloseHandle(LProc.hProcess);
      CloseHandle(LProc.hThread);
      Result := True;
    end;
  finally
    if LWrite <> 0 then
      CloseHandle(LWrite);
    CloseHandle(LRead);
  end;
end;

end.
