object PubPascalFrame: TPubPascalFrame
  Left = 0
  Top = 0
  Width = 900
  Height = 560
  TabOrder = 0
  object PanelLeft: TPanel
    Left = 0
    Top = 0
    Width = 450
    Height = 532
    Align = alLeft
    BevelOuter = bvNone
    Color = 14211288
    ParentBackground = False
    TabOrder = 0
    object LabelTitle: TLabel
      Left = 24
      Top = 20
      Width = 145
      Height = 25
      Caption = 'PubPascal Core'
      Font.Charset = DEFAULT_CHARSET
      Font.Color = 16744448
      Font.Height = -21
      Font.Name = 'Segoe UI'
      Font.Style = [fsBold]
      ParentFont = False
    end
    object BtnOpenWeb: TButton
      Left = 24
      Top = 70
      Width = 400
      Height = 45
      Caption = 'Open Dashboard in Web Browser'
      Font.Charset = DEFAULT_CHARSET
      Font.Color = clWindowText
      Font.Height = -13
      Font.Name = 'Segoe UI'
      Font.Style = [fsBold]
      ParentFont = False
      TabOrder = 0
      OnClick = BtnOpenWebClick
    end
    object GroupBoxInstall: TGroupBox
      Left = 24
      Top = 140
      Width = 400
      Height = 150
      Caption = ' Install Dependency '
      Font.Charset = DEFAULT_CHARSET
      Font.Color = clWindowText
      Font.Height = -12
      Font.Name = 'Segoe UI'
      Font.Style = []
      ParentFont = False
      TabOrder = 1
      object LabelSlug: TLabel
        Left = 16
        Top = 28
        Width = 126
        Height = 15
        Caption = 'Package Identifier (slug):'
      end
      object EditPackageSlug: TEdit
        Left = 16
        Top = 48
        Width = 368
        Height = 23
        TabOrder = 0
        TextHint = 'e.g. github.com/HashLoad/horse'
      end
      object BtnInstall: TButton
        Left = 16
        Top = 90
        Width = 368
        Height = 35
        Caption = 'Install Package'
        Font.Charset = DEFAULT_CHARSET
        Font.Color = clWindowText
        Font.Height = -12
        Font.Name = 'Segoe UI'
        Font.Style = [fsBold]
        ParentFont = False
        TabOrder = 1
        OnClick = BtnInstallClick
      end
    end
    object GroupBoxLogin: TGroupBox
      Left = 24
      Top = 310
      Width = 400
      Height = 150
      Caption = ' Portal Authentication '
      Font.Charset = DEFAULT_CHARSET
      Font.Color = clWindowText
      Font.Height = -12
      Font.Name = 'Segoe UI'
      Font.Style = []
      ParentFont = False
      TabOrder = 2
      object LabelToken: TLabel
        Left = 16
        Top = 28
        Width = 73
        Height = 15
        Caption = 'Portal Token:'
      end
      object EditToken: TEdit
        Left = 16
        Top = 48
        Width = 368
        Height = 23
        PasswordChar = '*'
        TabOrder = 0
        TextHint = 'Paste your portal token'
      end
      object BtnLogin: TButton
        Left = 16
        Top = 90
        Width = 368
        Height = 35
        Caption = 'Sign In'
        Font.Charset = DEFAULT_CHARSET
        Font.Color = clWindowText
        Font.Height = -12
        Font.Name = 'Segoe UI'
        Font.Style = [fsBold]
        ParentFont = False
        TabOrder = 1
        OnClick = BtnLoginClick
      end
    end
  end
  object PanelRight: TPanel
    Left = 450
    Top = 0
    Width = 450
    Height = 532
    Align = alClient
    BevelOuter = bvNone
    Color = 14211288
    ParentBackground = False
    TabOrder = 1
    object LabelDeps: TLabel
      Left = 20
      Top = 20
      Width = 162
      Height = 20
      Caption = 'Installed Dependencies:'
      Font.Charset = DEFAULT_CHARSET
      Font.Color = clWindowText
      Font.Height = -15
      Font.Name = 'Segoe UI'
      Font.Style = [fsBold]
      ParentFont = False
    end
    object ListBoxDeps: TListBox
      Left = 20
      Top = 55
      Width = 410
      Height = 335
      Font.Charset = DEFAULT_CHARSET
      Font.Color = clWindowText
      Font.Height = -13
      Font.Name = 'Consolas'
      Font.Style = []
      ItemHeight = 15
      ParentFont = False
      TabOrder = 0
    end
    object BtnRefreshDeps: TButton
      Left = 20
      Top = 400
      Width = 410
      Height = 30
      Caption = 'Refresh List'
      Font.Charset = DEFAULT_CHARSET
      Font.Color = clWindowText
      Font.Height = -12
      Font.Name = 'Segoe UI'
      Font.Style = [fsBold]
      ParentFont = False
      TabOrder = 1
      OnClick = BtnRefreshDepsClick
    end
    object BtnContribute: TButton
      Left = 20
      Top = 440
      Width = 410
      Height = 30
      Caption = 'Contribute'
      Font.Charset = DEFAULT_CHARSET
      Font.Color = clWindowText
      Font.Height = -12
      Font.Name = 'Segoe UI'
      Font.Style = [fsBold]
      ParentFont = False
      TabOrder = 2
      OnClick = BtnContributeClick
    end
    object BtnSubmitPR: TButton
      Left = 20
      Top = 480
      Width = 410
      Height = 30
      Caption = 'Submit Pull Request'
      Font.Charset = DEFAULT_CHARSET
      Font.Color = clWindowText
      Font.Height = -12
      Font.Name = 'Segoe UI'
      Font.Style = [fsBold]
      ParentFont = False
      TabOrder = 3
      OnClick = BtnSubmitPRClick
    end
  end
  object StatusBar: TPanel
    Left = 0
    Top = 532
    Width = 900
    Height = 28
    Align = alBottom
    Alignment = taLeftJustify
    BevelOuter = bvNone
    Color = 1184274
    Caption = '  ready'
    Font.Charset = DEFAULT_CHARSET
    Font.Color = clLime
    Font.Height = -12
    Font.Name = 'Consolas'
    Font.Style = []
    ParentBackground = False
    ParentFont = False
    TabOrder = 2
  end
end
