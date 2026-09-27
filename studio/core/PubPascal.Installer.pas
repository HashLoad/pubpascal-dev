unit PubPascal.Installer;

// THE INSTALL SEAM — the abstraction that lets the host-agnostic core
// (PubPascal.View) ask "wire this fetched package into the IDE" WITHOUT ever
// touching ToolsAPI.
//
// Why it exists: PubPascal.View compiles into BOTH the desktop exe and the OTA
// design-time bpl, but ToolsAPI only exists inside the bpl. So the core depends
// on this interface (Dependency Inversion) and each host supplies the concrete
// installer:
//   - OTA      -> TIdePackageInstaller (PubPascal.IDE): real ToolsAPI install
//   - Desktop  -> TReportInstaller     (PubPascal.HostForm): no IDE, just reports
//
// Division of labour: the CLI (`pp pkg add --json`) does the FETCH and hands back
// the resolved facts; THIS seam does the WIRE-INTO-THE-IDE step, by kind.

interface

type
  // How a fetched package is wired in. Mirrors the manifest `kind` and the
  // cockpit's three install actions:
  //   ikSource     -> add the source folder(s) to the project search path
  //   ikDesigntime -> compile/register a design-time package (.bpl) in the IDE
  //   ikInstaller  -> run the vendor installer executable
  TInstallKind = (ikSource, ikDesigntime, ikInstaller);

  // The resolved facts the CLI fetch produced — everything an installer needs.
  TInstallRequest = record
    Package: string;             // slug, e.g. "nidus"
    Version: string;             // resolved tag, e.g. "1.2.0" ('' = default branch)
    ModuleDir: string;           // absolute modules/<pkg> folder on disk
    Kind: TInstallKind;
    SourcePaths: TArray<string>; // absolute search paths declared in pubpascal.json
  end;

  // The result, surfaced to the user in the status bar.
  TInstallOutcome = record
    Ok: Boolean;
    Message: string;
    class function Done(const AMessage: string): TInstallOutcome; static;
    class function Fail(const AMessage: string): TInstallOutcome; static;
  end;

  IPackageInstaller = interface
    ['{A1F4C8E2-7B3D-4E61-9C20-5F8A1D2E3B40}']
    function Install(const ARequest: TInstallRequest): TInstallOutcome;
  end;

// Maps the cockpit action / manifest kind string to TInstallKind, in one place so
// the core and both hosts agree on the mapping.
function ToInstallKind(const AKind: string): TInstallKind;

implementation

uses
  System.SysUtils;

class function TInstallOutcome.Done(const AMessage: string): TInstallOutcome;
begin
  Result.Ok := True;
  Result.Message := AMessage;
end;

class function TInstallOutcome.Fail(const AMessage: string): TInstallOutcome;
begin
  Result.Ok := False;
  Result.Message := AMessage;
end;

function ToInstallKind(const AKind: string): TInstallKind;
begin
  if SameText(AKind, 'designtime') then
    Result := ikDesigntime
  else if SameText(AKind, 'installer') then
    Result := ikInstaller
  else
    Result := ikSource;  // 'source' / 'runtime' / anything else
end;

end.
