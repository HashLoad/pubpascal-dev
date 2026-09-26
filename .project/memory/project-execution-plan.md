---
name: project-execution-plan
description: Plano de execução PubDelphi CLI+Portal (arquitetura corrigida 2026-06-09)
  — Fases 0-3 + infra; decisões do operador baixadas
metadata:
  node_type: memory
  type: project
  originSessionId: 8772b5dd-efcb-4be6-8447-e646ecbede3a
type: project
---
# Plano de execução — PubDelphi CLI + Portal (2026-06-09)

Ver [[project-sbom-strategy]] p/ a arquitetura corrigida. Princípios travados: tudo nosso; motor DPM (fontes) só p/ não reinventar SBOM/scan/sign/pack/verify (via `src/Adapters/`, nunca repo HTTP do DPM); portal metadata-only; atende Boss E DPM (aditivo).

## Decisões do operador (2026-06-09)
1. **Install dual:** quando um repo tem boss.json E .dspec.yaml → **rodam OS DOIS** (`boss install` + `dpm restore`), cada um fail-soft, gated no seu manifest.
2. **Publish:** (escolha minha) **CLI `pkg publish` registra metadata da versão** (cria linha `package_versions` + `download_url` apontando p/ release/tag GitHub + anexa SBOM). Metadata-only. Auto-descoberta de tags = futuro.
3. **Escopo:** (escolha minha) **Fases 0-3 + infra**. Roadmap v7 (multi-tenant, signing keys per-org, compat matrix) = ciclo próprio depois.

## Fase 0 — Higiene (sem decisão)
- Corrigir doc-comment stale do `PackageAdapter` (revert deixou "blocked on HTTP repo" — falso).
- Confirmar build CLI + 177 testes portal.

## Fase 1 — Install dual Boss+DPM no `workspace clone`
**Mecanismo DPM = IN-PROCESS via fontes vendorizados (operador 2026-06-09: "NÃO usar exe do DPM, usar os FONTES").** Sem dpm.exe externo, sem feed HTTP.

**ACHADO-CHAVE (fontes DPM):** `TGitRegistryPackageRepository` (`DPM.Core.Repository.GitRegistry`) é git-native, NÃO usa HttpClient. Comentário do DPM: *"package repository backed by a git registry (folder-per-id `<id>.dspec.yaml`); versions come from git tags; install = clone-in-place + build, not DownloadPackage."* `IsGitRegistryUri` aceita `git://`/`ssh://`/`git@`/`.git`. **Isso É o nosso modelo:** pacote=repo git, versão=tag, install=clone+build. O motor DPM (`TPackageInstaller.Restore`/`RestoreProject`) faz in-process.
- **Mapeamento:** portal = o **registry catalog** (`IRegistryCatalog`) — diz quais pacotes + onde o repo git + dspec. DPM GitRegistry resolve do git, instala clone-in-place+build.
- **DECISÃO ABERTA (não assumir):** como o catalog é sourced? (a) adapter `IRegistryCatalog` backed pela API do portal, ou (b) portal gera um git-registry repo de dspecs que o DPM lê. Surgir ao operador antes de codar o installer.
- Novo `DpmRunner`/adapter usa o installer in-process AO LADO do `BossRunner` intocado. boss.json → boss; projeto DPM → installer DPM git-registry. **Os dois rodam se ambos presentes.** Mantém `--no-install`, fail-soft, summary.
- ⚠️ Build do installer é grande (dep graph: repository manager/factory, resolver, compiler factory, project editor, git client, catalog). Registrar no `Dpm.Container`.

## Fase 2 — Publish = registro de metadata (não binário)
- Portal: endpoint cli_tokens-auth, ownership-gated, registra/atualiza metadata de package+versão (repo_url, version, download_url → release/tag GitHub). NUNCA binário. Cria a linha `package_versions`.
- CLI `pkg publish`: registra metadata da versão + anexa SBOM (reusa publish-sbom).
- Mantém `/publish` browser (form visual = diferencial).

## Fase 3 — SBOM/CRA polish
- Gate SBOM no publish (lenient → hard evolutivo).
- Tool identity SBOM (vendor=DPM → atribuir PubDelphi).
- Badge "CRA-ready" na página do pacote.

## Fase 4 — Operador/infra (precisa do operador)
- Aplicar migration SBOM `20260609000000` no DB live.
- `gh auth login` → publicar `pubdelphi-cli` no GitHub.
- Provider de assinatura de produção (cert) quando definir.

## Builder visual do workspace (operador priorizou 2026-06-09 — "construir o visual pode revelar pendências que reflitam no CLI")
Decisão: **Boss basta pra deps; DPM = só SBOM/pack/sign.** Parei o installer/registry DPM (over-engineering). Atacar o builder visual primeiro pra shake-out a estrutura.

**FEITO (commit portal `25ae276`) — frentes A+B do v7 DAG builder:**
- `WorkspacePackageLibrary` (rail esquerdo: search + cards arrastáveis, esconde já-adicionados) + drag-drop no canvas (`onDrop` → `addWorkspaceNode` package + ref nulo). Edge-by-drag (C) já existia. Grafo ganhou `max-w-6xl`. i18n `workspaces.graph.library` (5 chaves, paridade). 5 testes RTL + suíte 182/182.
- **Layout coordinate-free mantido** (drop adiciona, auto-posiciona; persistir x/y = futuro, UI-only).

**PENDÊNCIA ENCONTRADA E CORRIGIDA (valida a estratégia do operador):** `addWorkspaceNode` EXIGIA ref (branch/tag/version), mas (a) o schema permite ref nulo ("default branch") e (b) **o CLI já clona default branch quando não há ref** (`Command.Clone`: `HasRef=false → "Cloned (default branch)"`). A action era mais restrita que schema E CLI, quebrando o UX drag-to-add-pin-later. **Corrigido = PORTAL-ONLY; contrato do CLI intocado** (já suporta ref nulo). Exatamente o tipo de coisa que só aparece construindo — e NÃO refletiu no CLI.

**Pendente operador:** interação drag-drop ao vivo precisa de sessão logada + workspace (DB live) pra testar. Migrations workspace operator-deferred.

**Posicionamento manual + biblioteca categorizada FEITO (commit `b127790`):** estudei o Fluxent (`D:\Ecossistema-IA\Fluxent\packages\web` — `WorkflowCanvas`/`NodeLibrary`, `@xyflow/react` v12), peguei SÓ tecnologia+ideia (operador: "não copiar, ser exclusivo ao propósito"). Adotei: drop-no-cursor (`screenToFlowPosition` via `onInit`), nós arrastáveis, posição persistida via `onNodeDragStop`. **Posição = tabela SATÉLITE `workspace_node_positions`** (migration `20260609140000`, node_id PK FK x/y) — NÃO coluna em workspace_nodes (graceful degradation, padrão do codebase; node insert nunca quebra). **UI-only — CLI não lê posição** (manifest = clone_url+ref+edges). Biblioteca: grupos "Seus pacotes"/"Outros" (getActivePackagesForSelect flag `owned`). 183/183 testes. Migration operator-deferred.

**Decisão de engenharia importante:** comecei com ALTER (coluna x/y em workspace_nodes) mas percebi que quebraria o insert se a migration não estivesse aplicada → troquei pra SATÉLITE (padrão package_likes/sbom). Graceful degradation preservada.

**v7 Workspace DAG builder COMPLETO (commits `25ae276`/`b127790`/`37b144b`/`14b43c1`):**
- A biblioteca + B drag-drop + C edges + posicionamento manual (satélite `workspace_node_positions`) + biblioteca categorizada (Seus/Outros) + **D ref pin inline** (editar versão no card do nó, `updateNodeRef`, nodrag) + **E manifest view** (botão Manifesto → popup com `GET /api/workspaces/[id]/manifest` em JSON, copy). Tudo portal-side. **Contrato do CLI NUNCA tocado** (todas as mudanças — null ref, posição, re-pin — o CLI já suportava). 183 testes verdes.
- Pendências encontradas construindo (todas portal-only, CLI intocado): (1) addWorkspaceNode exigia ref → relaxado; (2) ALTER vs satélite pra posição → satélite.

**Próximo:** validar o ciclo real com login (criar workspace → arrastar pacotes → editar refs → ver manifesto → CLI clone), OU voltar pro CLI (publish metadata / dual Boss+DPM), OU Roadmap v7 multi-tenant/signing (ciclo próprio). Pendente operador: aplicar migrations workspace + `20260609140000` no DB live; `gh auth login`.

## ⚠️ Estado das migrations no banco LIVE (Supabase eoaqhticowfjbyoihtin) — descoberto 2026-06-09
- **Aplicadas:** init + workspaces base (`20260531000000`: workspaces/workspace_nodes/workspace_edges + RPC set_workspace_root_node).
- **NÃO aplicadas:** `20260531010000_external_repo_links` (tabela + FK external_link_id) E `20260609140000_workspace_node_position` (satélite). Confirmado por logs PGRST200/PGRST205.
- **Impacto/bug (corrigido `5974df9`):** `getWorkspaceNodes` embedava `external_link_id(label)` + `workspace_node_positions` numa query → PostgREST falhava a query INTEIRA → retornava [] → **escondia TODOS os nós** (parecia que root não persistia / canvas vazio). Fix: select base só `packages`, enriquecer posição + external_link em queries separadas fail-soft. Lição: nunca embedar tabela/FK de migration deferida — quebra a query toda.
- **Pendente operador:** aplicar as 2 migrations restaura external-link nodes + posição persistida. Core (nós/root/edges/deps) já funciona sem elas.
- Também: `set_workspace_root_node` RPC pode faltar em alguns ambientes (debt #65) → set root agora é direto (sem RPC, `markNodeAsRoot`).

## Boss.json import no portal (FEITO `ce059ff`, 2026-06-09)
**Botão "Import boss.json" no editor** → `importBossDependencies(workspaceId)` lê o boss.json do repo do PAI (via `fetchGithubRaw`, metadata-only), parseia `dependencies`, casa cada `host/owner/repo` com pacote publicado (por repository_url normalizado), cria nó + edge root→dep. Verificado AO VIVO: Janus → MetaDbDiff/DataEngine/FluentSQL/JsonFlow (todos publicados) importados num clique. Honra o Boss no portal (antes só o CLi `BossRunner` gateava existência, sem ler). Deps não-publicados = skip (external links precisam da migration deferida). boss.json do Janus: deps com versão "" → default branch.

## 🎯 CICLO COMPLETO PROVADO end-to-end (2026-06-09)
Portal (build workspace via boss.json import → mint token → manifest token-auth) → CLI (`login` → `clone`) → **6 repos clonados** (Janus PAI + deps) num folder + `.pubdelphi/{manifest,state}.json`. Testado eu mesmo com `cli/pubdelphi.exe` apontando pro localhost:3000.

**Setup que destravou (operador fez):**
- Migrations aplicadas no live (SQL Editor + restart do Supabase p/ cache): external_repo_links, workspace_node_positions, cli_tokens. (Base workspaces + init já estavam.)
- `SUPABASE_SERVICE_ROLE_KEY` adicionado no `.env.local` (manifest resolve token via `createServiceClient`, que LANÇA se faltar). Reiniciar dev server p/ reler env.
- Schema cache do PostgREST: `NOTIFY pgrst,'reload schema'` do SQL Editor NÃO funciona no Supabase (pooler) → **restart do projeto** é o jeito confiável.

**CLI config:** `%USERPROFILE%\.pubdelphi\config.json` (`portalBaseUrl` default `https://www.pubdelphi.dev` + `authToken`). `login` NÃO tem `--host` → pra apontar local, editar o JSON manualmente (gap: adicionar `--host`/`config set` no futuro). Comandos: `login --token pdv_...`, `clone <id> [--dir] [--no-install] [--codename]`, `status`, `update`, `push`. Exe em `cli/pubdelphi.exe`.

**Token de teste mintado** `pdv_o0Po...` (manifest:read) está no config + foi exposto no chat — operador pode revogar em /profile/tokens e mintar o próprio.

## 🎯 Identificador por versão do PAI — COMPLETO e PROVADO (2026-06-09)
Operador: "o workspace recebe como identificador a versão do projeto root (PAI), e baixa por ela" (project A usa janus@1.0, project B usa janus@2.0).
- **Portal:** `GET /api/workspaces/resolve?ref=<slug>@<version>` (commit `0e071f5`) → acha o workspace do dono cujo nó ROOT é aquele pacote pinado naquela versão (`ref_value`), normaliza `v` (1.0~v1.0), 400/404/409. Token-auth via service-role gated por owner. + **display** no editor `pubdelphi clone janus@1.0` (commit `71fac08`, deriva do root node).
- **CLI:** `ManifestClient.ResolveRef` + `Command.Clone` resolve quando o positional tem `@` (commit pubdelphi-cli `b8fb872`). Rebuild via `scripts/build.ps1` (dcc64 Studio 37 → `Win64\Debug\pubdelphi.exe`, 35MB).
- **PROVADO AO VIVO:** `pubdelphi workspace clone janus@2.22.5` → resolveu → manifest → **6/6 clonados, Janus em v2.22.5** (tag real). 

**⚠️ Exe agora é AGRUPADO:** `pubdelphi workspace clone` / `pubdelphi pkg ...` (não mais `clone` flat). O `cli/pubdelphi.exe` no portal (Jun 3) está STALE/flat — atualizar com o build novo se quiser bundlar.
**Janus root pinado em `v2.22.5`** (tag real) — workspace 9dbaad09 num estado limpo.

**Status:** iniciado 2026-06-09. **Ciclo portal↔CLI fechado e provado, + clone por versão do PAI.** Atualizar conforme fases fecham.