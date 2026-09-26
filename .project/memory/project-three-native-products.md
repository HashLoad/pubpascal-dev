---
name: project-three-native-products
description: ⭐ TAXONOMIA dos apps nativos PubPascal — são TRÊS produtos distintos
  (CLI, Desktop, IDE/OTA). O WebView2 (frame-core) NÃO é produto, é o COMPONENTE reaproveitado
  entre Desktop e IDE(OTA). Casa canônica = monorepo pubpascal-app.
metadata:
  node_type: memory
  type: project
  originSessionId: 5f38386d-c6d5-46ad-a532-2c45663b54e0
type: project
---
# Três produtos nativos do PubPascal (operador, esta sessão)

O operador confirmou: o lado nativo do PubPascal são **TRÊS produtos distintos** —
não dois. O que é compartilhado é o **WebView2 (frame-core)**, não os produtos.

```
3 PRODUTOS:
  ├─ CLI        → pubpascal.exe — a engine (clone/status/update/push, pkg/sbom). SEM WebView2.
  ├─ Desktop    → app nativo standalone ┐
  └─ IDE (OTA)  → plugin dockado no RAD Studio ┘ ── reaproveitam o MESMO WebView2
```

- **CLI** = produto próprio, a engine. Desktop e IDE(OTA) chamam o `pubpascal.exe` por baixo (`RunCli` via CreateProcess).
- **Desktop** = produto próprio, app standalone (host `THostForm` / `PubDelphi.HostForm.pas` → `PubPascalIDE.exe`).
- **IDE (OTA)** = produto próprio, plugin dockado dentro do RAD Studio (host `TPubDelphiDockable` / `PubDelphi.IDE.pas`, via ToolsAPI). Esqueleto presente; BPL ainda NÃO buildada.
- **WebView2 / frame-core** (`TPubDelphiFrame` em `PubDelphi.View.pas`) = **NÃO é produto** — é o componente reutilizado que renderiza o grafo do workspace, embutido tanto no Desktop quanto no IDE(OTA), sem duplicação. A seam `IPubDelphiContext` (WorkspacePath/ViewUrl) é o que separa os dois hosts.

⚠️ **Correção de um erro meu:** eu tinha enquadrado "Desktop e IDE são o mesmo projeto". ERRADO — são produtos distintos; só o WebView2 é compartilhado.

## Onde vivem (mapeamento de pastas em D:\DeveloperWeb\)
- **`pubpascal-app`** = MONOREPO canônico (remote `isaquepinheiro/pubpascal-app`, branch main). **Estrutura reorganizada 2026-06-16** (era `cli/` + `ide/` chato; o "ide" misturava Desktop+OTA+core e confundia):
  - `cli/` = o CLI. ✅ namespace renomeado (2026-06-16, commit `c40c0ac`): `src/PubDelphi/`→`src/PubPascal/`, unit `PubDelphiJson`→`PubPascalJson`, projeto de teste `PubDelphiCLI.Tests`→`PubPascalCLI.Tests`. Build dcc64 verde. ZERO nome de arquivo/pasta com pubdelphi no app. **Resta 1 resíduo de CONTEÚDO** (não-nome): a classe `TPubDelphiLogger` (em `Dpm.Logger.pas`, usada por `Dpm.Container.pas`+`ScanAdapter.pas`). E o projeto de teste tem refs STALE pré-existentes (aponta `..\src\Core` em vez de `..\src\PubPascal\Core` + cita `BossRunner.pas` deletado) — não builda até consertar, operator-deferred.
  - `studio/core/` = frame-core WebView2 COMPARTILHADO (`PubPascal.View.pas/.dfm` + `PubPascal.CliRunner.pas`) **+ o web view (`workspace-graph.html` + `PubPascalView.rc`) — fonte ÚNICA, embutida nos 2 binários via `{$R PubPascalView.res}` em `PubPascal.View`** (commit `5c8f417`). Manutenção em um ponto só.
  - `studio/desktop/` = app standalone (`PubPascalDesktop.dpr`+`.rc` + `PubPascal.HostForm` + `scripts/build.ps1`). ✅ **web view EMBUTIDO no exe (2026-06-16, commit `911c70a`):** `workspace-graph.html` virou resource RCDATA no `PubPascalDesktop.rc`, carregado via `NavigateToString` no `OnCreateWebViewCompleted` (NavigateToString NÃO defere como Navigate → precisa do core pronto). `IPubPascalContext` ganhou `ViewHtml` (standalone=html embutido; OTA=''+ViewUrl portal). CLI achado next-to-exe OU no PATH (sem arquivo solto obrigatório). html removido do instalador+zip. **Verificado em runtime: grafo renderiza sem nenhum arquivo solto** (operador testou). Lição: o app loadava html de `ParamStr(0)` dir → rodar o build cru dava ERR_FILE_NOT_FOUND; embed resolveu de vez.
  - `studio/ota/` = plugin RAD Studio. ✅ **BPL agora buildável (2026-06-16, commit `df6942d`):** criado `PubPascalOTA.dpk` (designtime package: contém OTA host + core; requires `rtl/vcl/vcledge/designide`) + `studio/ota/scripts/build.ps1` (dcc32 Win32). Corrigi 2 bugs latentes no `PubPascal.IDE.pas` (nunca compilara): faltava `DesignIntf` no uses (TEditState/TEditAction) e anonymous-proc no `OnClick` (virou `TMenuHook`). dcc32 builda `PubPascalOTA.bpl` (0.08 MB) **limpo, sem warnings**. ⚠️ Loading/docking real só validável dentro do RAD Studio (Components→Install Packages). Instalador registra em `BDS\37.0\Known Packages` se Delphi 13 presente; warning Inno "HKCU sob admin" (ok pro caso normal mesmo-usuário-elevado).
  - `studio/installer/` = Inno Setup (`pubpascal.iss` ATIVO — agora **3 componentes: CLI + Desktop + OTA plugin**; `build.ps1` stageia os 3). `PubPascalSetup.iss` = scaffold antigo redundante. Gera `PubPascal-Setup-0.1.0.exe` (~4MB). CLI fica em 2 lugares: solo (`pubpascal.exe`) + dentro do instalador (+ no zip do desktop).
  - Units `ide/PubDelphi.*` → renomeadas `PubPascal.*` (zero PubDelphi no studio/, exceto cli). Build dcc64 verde do novo local. `dist/` (binários old-brand) limpo.
  - ✅ **Desktop renomeado (2026-06-16):** `PubPascalIDE` → `PubPascalDesktop` (programa/exe/.rc/.dpr/build/installer + caption + display "PubPascal IDE"→"PubPascal Desktop"). Portal `/download`: zip `pubpascal-ide-win64.zip`→`pubpascal-desktop-win64.zip` (bundla PubPascalDesktop.exe), installer rebuildado, page `DownloadKind ideZip→desktopZip` + textos. O "IDE" verdadeiro é só o OTA. Build+tsc verdes.
  - ✅ **NOMES CURTOS + WEB VIEW UNIFICADO (2026-06-16, app `5c8f417` / portal PR [#127](https://github.com/isaquepinheiro/pubpascal-dev/pull/127) `60ac41c`):** binários renomeados → CLI **`pp.exe`** (comando `pp`, via `APP_NAME`), Desktop **`ppdesktop.exe`** (display continua "PubPascal Desktop"), OTA **`ppota.bpl`**. Web view virou fonte única no `core/`, embutido nos DOIS (OTA largou o live-portal → offline). **MANTIDOS de propósito:** `pubpascal.json` (manifesto), `pubpascal.dev` (domínio), marca `PubPascal`, namespace `src/PubPascal`. Portal `/download` + clone command (`pp clone`) atualizados. 3 binários + installer 3-comp + tsc verdes; sincronizado (main==develop).
  - **Estado git ✅ SINCRONIZADO (2026-06-16):** app repo `main` pushado (`eb6504a`, inclui os 4 commits do pente-fino que estavam locais + reorg + desktop rename; branch `studio-reorg` mergeada FF e deletada; app é main-only). Portal: PR **[#124](https://github.com/isaquepinheiro/pubpascal-dev/pull/124)** mergeado (Build+Lint+Vercel verdes), `develop` FF=`main` (`e75657a`), **origin/main == origin/develop (0/0)** — Vercel deploya o /download renomeado. Ambos working tree limpos.
- **`pubpascal-cli`** = repo CLI LEGADO standalone (sem remote, arquivos pré-rename `pubdelphi.dpr`) → fonte do subtree, **arquivar**.
- **`pubpascal-ide-poc`** = POC LEGADO do Desktop/IDE (sem remote, arquivos pré-rename `PubDelphiIDE.dpr`) → fonte do subtree, **arquivar**.
- **`pubpascal-dev-portal`** = o PORTAL web (este workspace), produto separado dos nativos.

## ✅ VERIFICADO por hash-compare (esta sessão) — qual pasta tem o código mais novo
Dúvida do operador: as pastas soltas `pubpascal-cli`/`pubpascal-ide-poc` são legado, ou o código mais recente está nelas? **Resolvido com MD5 file-by-file, NÃO por data:**
- **`pubpascal-app` (monorepo) É o canônico e o mais novo de TUDO** (último commit `b06fb8c` 2026-06-11 19:49, working tree limpo, rebrand feito).
- **`cli/` vs `pubpascal-cli`:** mesmo set (44=44 arquivos), nenhum só no legado; em todo arquivo que difere o monorepo é mais novo/maior. Os 3 arquivos untracked do legado (`Command.Commit/Diff/WsList.pas`) **já estão no monorepo** em versão mais nova — resíduo, não trabalho perdido.
- **`ide/` vs `pubpascal-ide-poc`:** todo arquivo do POC existe no monorepo e o monorepo é muito maior (`PubDelphi.View.pas` frame-core: 3.881b POC → 19.839b mono ~5×; `workspace-graph.html` 6.378b → 27.640b). Único "só no POC" = `PubDelphiIDE.dpr` (nome pré-rename; monorepo tem `PubPascalIDE.dpr`+`.rc`).
- **Conclusão:** as duas pastas legadas são **estritamente mais antigas**, nada exclusivo nelas → seguras p/ arquivar. Trabalhar SÓ em `pubpascal-app`.

Ver [[project-ide-vision]] (a visão WebView2 + OTA) e [[project-rebrand-embarcadero]].
