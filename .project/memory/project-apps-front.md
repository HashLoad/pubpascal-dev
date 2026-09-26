---
name: project-apps-front
description: '⭐⭐ FRENTE DOS APPS (Desktop + plugin OTA) — estado em 2026-07-22 fim
  do dia. Motor completo e PROVADO contra produção; Desktop FUNCIONANDO (grafo real,
  clone real, versões). FALTA o fluxo de contribuição em 2 estágios e o plugin OTA.
  Bloqueio único: operador conectar o GitHub.'
metadata:
  node_type: memory
  type: project
  originSessionId: 9ebd4834-e920-427a-8e11-4b509c164a0a
  modified: 2026-07-22 21:10:12.063000+00:00
type: project
---
# Frente dos apps — estado em 2026-07-22 (fim do dia)

**A pilha:** portal define o padrão → Desktop e plugin OTA consomem → **Boss é o motor** de download e versionamento. Ver [[project-vision-canonical]].

## ✅ FUNCIONA E FOI PROVADO CONTRA PRODUÇÃO

Ciclo real executado com token de verdade em `https://www.pubpascal.dev`:
- `boss login --token` · `workspace list --json` → **`Janus WorkSpace`** real
- `workspace clone <uuid>` → **6 repos clonados**, e **`Checked out ref: v2.22.5`** — a ref fixada é respeitada (era o bug do `has_ref`)
- `workspace status --json` → 6 nós com estado git real
- **Desktop na tela**: `Developer Account · Connected`, sidebar com o workspace, grafo com os 6 nós, badges `PINNED`/`CLEAN`, versões por dep (`main · v1.6.0`), catálogo com tiers GOLD/BRONZE

**Motor**: 9 subcomandos de `workspace` (clone/status/list/search/diff/pull/commit/update/push), `cra`, `sbom`, `pkg spec`, `contribute`, `login --token`. `HashLoad/boss#263` em **27 commits, CI 5/5 verde**.

**Monorepo `pubpascal-app`**: motor é **submodule** de `isaquepinheiro/boss` em `cli/.modules/boss`. Bump é commit explícito (PR #20). Clone exige `--recursive`.

## ❌ O QUE FALTA (nesta ordem)

1. **Fluxo de contribuição em 2 estágios** — desenhado (ADR-003, abaixo), ZERO implementado. Hoje o `Submit PR` do grafo vai **direto para o repo original**, sem passar pela aprovação no fork do operador. ⚠️ **Avisar o operador para NÃO clicar em `Submit PR`** até isso existir.
2. **Plugin OTA** — "similar mas outra coisa" (palavras dele). Compartilha `studio/core` (mesmo `workspace-graph.html`), então herda as correções de UI.
3. **`contribution_events` no portal** — não existe; sem ela o painel "qual PR de qual projeto" não sobrevive a fechar a IDE.
4. Regerar binários do `/download` do portal · cortar os 4 PRs upstream ([[project-vision-canonical]]).

## 🔴 BLOQUEIO ÚNICO PARA O `Contribute`
`GET /api/profile/integrations` → **`{"integrations":[]}`**. O operador estava com o diálogo aberto no app para conectar (usuário `isaquepinheiro` + PAT com `repo`, ou `Contents`+`Pull requests` se fine-grained; em fine-grained o *resource owner* precisa incluir `ModernDelphiWorks`).

**São DUAS conexões distintas** e confundi-las custou tempo: o token `pdv_` do portal (é o `Connected` do desktop) e a credencial GitHub em `user_integrations` (é o que forka). O desktop mostrava "Connected" e o fork morria — não era contradição.

**Decisão do operador (2026-07-22):** *"isso é obrigação do desktop e não do portal"* → o **desktop detecta e pede** a credencial; o **portal guarda e age**. PAT nunca é gravado em disco local (princípio da ADR-002).

## Fluxo de contribuição — ADR-003 (desenhada, não implementada)
Complementa `docs/adr-002-dev-flow-contribuicao.md`, que vai direto de "push no fork" para "PR no upstream".
- **4 classes de branch** no fork: `main` (espelho), `pubpascal/patch-<id>` (trabalho), `pubpascal/staging` (integração do operador), `pubpascal/submit/<id>` (**única** que é head de PR upstream). Regra que fecha a armadilha: **staging nunca é head de PR upstream** → aprovar no fork fica fisicamente incapaz de publicar.
- **5 portões**; só `promote` e `promote --update` tocam repo de terceiro, com confirmação nomeando o destino.
- **Política por pacote** `ask`/`auto`/**`never`** em `.pubpascal/contrib.json` na raiz do workspace. `never` é **trava**, nenhuma flag fura. `boss.json` NÃO carrega política.
- **UI amigável**: 3 conceitos visíveis (`Usando` → `Editando (minha cópia)` → `Enviado ao autor`), botão que troca de rótulo, `Enviar ao autor` isolado em vermelho com o nome do repo destino. Perfis **Direto** (default) e **Revisado** (preferência do operador).
- **O motor é dono da máquina de estados**; o Delphi só renderiza `next_action` do `status --json`.
- Painel consolidado que o operador pediu: `PACOTE | ESTADO | PR NO MEU FORK | PR NO AUTOR`, com link clicável — porque com vários workspaces ele precisa saber **qual projeto**.

## ⚠️ ARMADILHAS DESCOBERTAS (não repetir)
- **Recurso embutido**: o `workspace-graph.html` vai em `.res` no exe. O `cgrc` precisa do `rc.exe` do Windows SDK (ausente) e **falhava em silêncio** → edições de tela sumiam sem rastro. Corrigido: web view = erro fatal de build, `brcc32` é fallback real, tentativa falha **restaura** o `.res`. O `ppdesktop.rc` é opcional (ícone/version) MAS carrega o **VCL style sem o qual o app não abre** — se o ícone derrubar o brcc32, compila sem ícone.
- ⚠️ Rodar `brcc32` no `ppdesktop.rc` **apaga** o `.res` (cria e falha). Não é versionado.
- **`TCliRunner` não lê exit code** (`Result := True` se o processo inicia) → comando inexistente = "sucesso" na UI. Foi assim que "Pull complete." aparecia sem pull nenhum.
- **`_ExtractJson` fatia do primeiro `{` ao último `}`** de stdout+stderr juntos → nenhum caminho de erro pode imprimir chave.
- **Case-sensitivity do Delphi** mordeu 3× : `AuthToken` vs `authToken`, `PortalBaseUrl` vs `portalBaseUrl`. E `TPath.GetHomePath` = `%APPDATA%`, mas o CLI grava em `%USERPROFILE%`.
- **Sandbox de teste polui o registro do RAD Studio**: qualquer `boss <cmd>` com HOME novo roda `setup.Initialize` e escreve em `HKCU\...\BDS\37.0\Library\*\Search Path`. Já limpei 585 entradas. **Isolar `USERPROFILE`/`HOME` em temp e limpar depois.**
- ⚠️ **NUNCA escrever em `C:/Users/User/.pubpascal`** em teste — já queimei o token do operador uma vez.

## Defeitos ainda abertos (achados, não corrigidos)
- `Submit PR` vai direto ao upstream (será resolvido pela ADR-003)
- Modo `Fork & Contribute` no clone ainda é **cosmético** — os dois ramos chamam o mesmo `clone-workspace`
- Diálogo de conexão GitHub está sem o tema escuro (o de token já é skinado)
- Portal: login com GitHub existe mas **sem `scopes`**, então o token não serve para forkar — daí o PAT. Dá para adicionar `scopes:"repo"` + gravar `provider_token` no `/auth/callback` e dispensar o PAT (trade-off: `repo` é amplo).
- 3 caminhos malformados no registro (`..\C:\Users\...`) gerados pelo próprio Boss em operação normal — bug dele, em código tradicional.
- ADR-002 afirma AES-256/pgsodium para o token GitHub; a migration é `access_token TEXT` **sem cifra aplicacional**. Ou implementa, ou corrige a ADR.

Ver [[feedback-never-touch-upstream-boss]] · [[project-three-native-products]] · [[project-vision-canonical]].
