object HostForm: THostForm
  Left = 0
  Top = 0
  Caption = 'PubPascal Desktop - standalone workspace app'
  BorderStyle = bsSizeable
  BorderIcons = [biSystemMenu, biMinimize, biMaximize]
  Constraints.MinHeight = 420
  Constraints.MinWidth = 680
  Position = poScreenCenter
  WindowState = wsMaximized
  ClientHeight = 560
  ClientWidth = 900
  Color = clBlack
  Font.Charset = DEFAULT_CHARSET
  Font.Color = clWindowText
  Font.Height = -12
  Font.Name = 'Segoe UI'
  Font.Style = []
  OnCreate = FormCreate
  TextHeight = 15
end
