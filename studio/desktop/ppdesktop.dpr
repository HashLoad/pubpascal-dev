program ppdesktop;

// Standalone host. The OTA host (PubPascal.IDE) is deliberately NOT linked here —
// it belongs to a separate designtime package that reuses the SAME frame.

uses
  Vcl.Forms,
  Vcl.Themes,
  Vcl.Styles,
  PubPascal.CliRunner in '..\core\PubPascal.CliRunner.pas',
  PubPascal.Installer in '..\core\PubPascal.Installer.pas',
  PubPascal.View in '..\core\PubPascal.View.pas' {PubPascalFrame: TFrame},
  PubPascal.HostForm in 'PubPascal.HostForm.pas' {HostForm};


{$R *.res}

begin
  Application.Initialize;
  Application.MainFormOnTaskbar := True;
  TStyleManager.TrySetStyle('Windows10 Dark');
  Application.CreateForm(THostForm, HostForm);
  Application.Run;
end.

