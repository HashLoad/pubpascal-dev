---
name: project-ide-vision
description: Visão do operador (2026-06-09) — uma IDE/GUI desktop do PubDelphi pro
  git, que visualiza o workspace + estado git ao vivo, elegante como o workspace flow
  do portal. Direção de produto futura.
metadata:
  node_type: memory
  type: project
  originSessionId: 8772b5dd-efcb-4be6-8447-e646ecbede3a
type: project
---
# Visão: IDE desktop do PubDelphi (operador, 2026-06-09)

**Filosofia que ele definiu:** *"o pubdelphi tem que me dar TODOS os recursos — status das deps, o que tá pendente, etc. — eu não desço pro git cru."* O CLI orquestra tudo (clone/status/update/push); o usuário não usa git diretamente. (Por isso o fix de "seu pacote = writable", commit `783aea3` — pra o `push` orquestrado servir, não obrigar `git push` por repo.)

**O sonho:** *"quem sabe não nasce uma IDE pro pubdelphi do git pra visualizar tudo de forma elegante como é o portal o workspace flow."*

## O conceito
Fundir o que já existe num app desktop:
```
Portal (workspace flow, React Flow DAG)  +  CLI (status/clone/update/push)
                    ↓
IDE PubDelphi: o MESMO grafo do workspace, mas com o ESTADO GIT ao vivo
  - cada nó (PAI/dep) mostra: dirty? ahead/behind? branch atual? (o que o `status` já calcula)
  - ações no próprio nó: commit / push / update / pull
  - visual elegante como o builder do portal (React Flow / @xyflow)
```
O grafo do portal **já é o modelo visual**; o `status` do CLI **já calcula o estado**. A IDE embebe os dois.

## ⭐ A jogada do WebView2 (operador, "vamos mais longe... dentro da IDE do delphi via web2 se fizermos em web")
**Write once, embed everywhere.** Construir a visualização UMA vez em **WEB** (o React Flow do workspace flow do portal JÁ é isso) e embedar via **WebView2** (Edge embarcado — "web2") em todo lugar:
```
Visual web (React Flow do workspace flow)
   ↓ WebView2 (TEdgeBrowser no Delphi / Edge embarcado)
   ├─ App desktop standalone
   └─ DENTRO do RAD Studio (plugin OTA + painel WebView2)  ← o pubdelphi DENTRO da IDE Delphi
```
- O **DPM já faz plugin de IDE** (OTA — Open Tools API); espelhar isso pra hospedar o painel web.
- Delphi tem `TEdgeBrowser` (WebView2) nativo → embeda o mesmo HTML/React do portal.
- O backend é o CLI (status/push/clone) + o portal (manifest/flow). A IDE é só a casca visual.

## Por que faz sentido
- O builder visual do portal (drag-drop, modules/, versão do PAI) já provou a UX do grafo.
- O CLI já é a engine (clone self-contained, status, push orquestrado — push real provado 2026-06-09).
- Uma IDE desktop OU painel-no-RAD-Studio renderizaria o MESMO grafo web (WebView2) + o estado git + as ações — a experiência completa "gerenciar PAI+deps" num lugar só, inclusive dentro do Delphi.

## POC PROVADO (2026-06-09) — `D:\DeveloperWeb\pubdelphi-ide-poc\`
Provei a viabilidade do WebView2 com artefatos reais:
- `workspace-graph.html` — grafo de workspace self-contained (Janus PAI + 5 deps, badges clean/dirty, paths modules/, botões status/git push por nó). Abre em qualquer navegador. **Renderizado + screenshot OK** (lindo, estilo do portal). Detecta `window.chrome.webview` → "view: browser" vs "view: Delphi".
- `MainForm.pas` (~30 linhas) + `.dfm` + `PubDelphiIDE.dpr` — form VCL com `TEdgeBrowser` que faz `Navigate` na página + handler `EdgeWebMessageReceived` (parseia o JSON do clique → rodaria `pubdelphi workspace <action>`).
- **Ponte de mão dupla provada:** clique no botão → `window.chrome.webview.postMessage(json)` → cai no handler Delphi. Em produção: `Navigate('https://www.pubdelphi.dev/...')` (a flow ao vivo) em vez de file local.
- Conclusão: **a MESMA página web roda no navegador E embarca no Delphi sem mudança.** Falta só: abrir o .dpr no RAD Studio + F9 (precisa runtime WebView2, que quase todo Windows tem).
- **LOOP COMPLETO no POC (2026-06-09):** `MainForm.RunCli` roda o `pubdelphi.exe` de verdade (CreateProcess + captura stdout) → `Edge.PostWebMessageAsString` devolve o resultado → o HTML tem listener que atualiza o badge do nó. web clica → Delphi roda CLI → posta de volta → nó atualiza. **App auto-suficiente: SEM servidor, SEM Docker, SEM localhost.** Roda como o usuário, nos arquivos dele, com o git dele.
- **DECISÃO de arquitetura (operador, 2026-06-09):** o caminho é **app desktop Delphi com WebView2 que roda o CLI direto** (Opção A), NÃO um servidor local/Docker (Opção B/C — Docker rema contra: CLI é Win64, precisaria build Linux + volume mount + passar credencial; é um tool de "tocar SEUS arquivos como VOCÊ", o oposto de isolamento).

## ARQUITETURA decidida (operador, 2026-06-09) — projetar pra evoluir pra OTA
"começar pelo app desktop, MAS projetado pensando na evolução usando OTA dentro da IDE dockado". Decisão-chave: **toda a operabilidade num `TFrame` reutilizável, NÃO na form** — porque dockable forms da OTA são construídos de um TFrame (`INTACustomDockableForm.GetFrameClass`). O MESMO frame pluga nos 2 hosts.
```
TPubDelphiFrame (PubDelphi.View.pas) = CORE: WebView2 + bridge + RunCli (host-agnostic)
  ├─ standalone:  THostForm (PubDelphi.HostForm.pas)        ← exe agora
  └─ OTA:         TPubDelphiDockable (PubDelphi.IDE.pas)     ← painel dockado (pacote designtime)
```
- **Seam `IPubDelphiContext`** (WorkspacePath + ViewUrl): standalone = pasta + HTML local; IDE = projeto ativo via `IOTAModuleServices.GetActiveProject` + portal ao vivo. O frame nunca toca ToolsAPI.
- RunCli usa WorkspacePath como CWD do `pubdelphi.exe`.
- `PubDelphi.IDE.pas` (ToolsAPI) só compila em pacote designtime; o `.dpr` standalone NÃO o linka.
- Arquivos reestruturados em `D:\DeveloperWeb\pubdelphi-ide-poc\` + README.md com a arquitetura. NÃO buildado (app VCL+WebView2 abre na IDE/F9). **Versionado: repo git próprio (local, sem remote, branch main, commit inicial `801d38e`)** — produto distinto, igual o pubdelphi-cli. Inclui `installer/PubDelphiSetup.iss` (Inno Setup scaffold: 1 instalador, 3 componentes CLI/app/plugin via Known Packages).

## Estado
Foundation pronto: workspace builder (portal) + CLI orquestrador + **POC WebView2 provado + arquitetura frame-core pronta pra OTA**. Ver [[project-vision-canonical]] (a DOR + a substituição do Boss), [[project-execution-plan]].