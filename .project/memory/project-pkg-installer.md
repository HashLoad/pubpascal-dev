---
name: project-pkg-installer
description: Feature EM ANDAMENTO — instalador de pacotes na IDE (o proposito real
  do OTA). 3 incrementos; Inc.1 (CLI pp pkg add + endpoint resolve) FEITO e verificado
  e2e. Inc.2 (cockpit no OTA) + Inc.3 (ToolsAPI install) pendentes.
metadata:
  node_type: memory
  type: project
  originSessionId: 5f38386d-c6d5-46ad-a532-2c45663b54e0
type: project
---
# Instalador de pacotes na IDE (proposito real do OTA)

O operador apontou (corretamente) que o OTA `ppota` NÃO é só o grafo — ele existe pra **instalar pacotes na IDE** (tem um cockpit `package-manager.html`, que estava órfão). Isso é uma feature por construir, não toque final.

## Design TRAVADO (com o operador, 2026-06-16)
- **Escopo do install: os DOIS** — **por projeto** (search path do `.dproj`, cada projeto pina SUA versão) + **global** (Library Path, conveniência). Motivo decisivo do operador: *"posso ter várias versões, cada uma em um projeto"* → global sozinho força UMA versão pra toda a IDE = errado. **Per-project é o central.**
- **Storage: `modules/` POR PROJETO** — cada projeto tem sua cópia da versão (isola 100%, duplica em disco, aceito).
- **Fetch: o CLI `pp`** materializa (resolve no portal + clona a tag no `modules/`). O OTA chama o `pp` e adiciona o path via ToolsAPI.
- **UI do OTA: o cockpit `package-manager.html`** (abas Packages/Workspaces, toggle Desktop/IDE, seletor de versão, botão Install) — já PRONTO, em `studio/desktop/package-manager.html` (mockup com bridge: `doInstall`, `host('install-workspace'/'open-graph'/'details')`, `inDelphi=chrome.webview`).

## ✅ INCREMENTO 1 — FEITO + verificado e2e (2026-06-16, app `ffa9f51` / portal PR [#128](https://github.com/isaquepinheiro/pubpascal-dev/pull/128) `745ef13`)
- **Portal:** `GET /api/packages/[slug]/resolve` → `{name,slug,repository_url,versions}` (público, só pacotes ATIVOS). Verificado na prod: `nidus` → repo ModernDelphiWorks/Nidus.
- **CLI:** `pp pkg add <package>[@<version>] [--dir]` — resolve + `git clone` no `<dir>/modules/<pkg>/` + checkout da tag + reporta os `sources` do pubpascal.json. **NÃO exige login** (resolve é público; token mandado só se existir). Reusa HttpClient+GitClient+PubPascalJson. **e2e provado:** `pp pkg add nidus --dir tmp` clonou Nidus em modules/nidus.

## ✅ INCREMENTO 2 — FEITO (compila; comportamento só valida na IDE) — app `77ea669`
Decisão do operador: **OTA usa o cockpit; Desktop = SÓ gerenciamento de git** (o grafo). O design do `package-manager.html` foi **APROVADO na época** — não mexer no visual.
- `package-manager.html` movido pra `core/` + 2º RCDATA no `PubPascalView.rc` (os 2 htmls embutidos nos 2 binários). `IPubPascalContext.ViewResource` → cada host pega o seu (Desktop=`WORKSPACE_HTML`, OTA=`PACKAGE_MANAGER_HTML`).
- OTA injeta `setHost('ide')` no load (modo IDE; html intocado, padrão host-injeta-dado).
- Bridge ligado: Install (`add-paths`/`install-designtime`/`install-exe`) → `pp pkg add` (o fetch do Inc.1); `install-workspace`→clone; `open-graph`/`details`→stub. Builda (dcc64+dcc32); cockpit embarca no `ppota.bpl`.

## 🔵 INCREMENTO 3 — SLICE 1 FEITO (2026-06-19, compila; comportamento IDE aguarda teste do operador)
Inspirado no **TMS Smart Setup** (open source): instalar por `kind` (convenção sobre config). Pegamos a IDEIA, código nosso. Diferença: TMS = registry global/uma-versão-por-IDE; o nosso = **per-project via ToolsAPI** (decisão travada).
- **Costura SOLID (DIP):** nova unit `studio/core/PubPascal.Installer.pas` — `IPackageInstaller` + `TInstallRequest`/`TInstallOutcome` + `ToInstallKind`. O core `PubPascal.View` (que compila nos DOIS binários) NÃO toca ToolsAPI; depende só da abstração. `IPubPascalContext` ganhou `function Installer: IPackageInstaller`.
- **2 impls:** OTA `TIdePackageInstaller` (ToolsAPI real, em `PubPascal.IDE.pas`) + Desktop `TReportInstaller` (não é IDE, só reporta onde caiu, em `PubPascal.HostForm.pas`).
- **CLI `pp pkg add --json`:** emite `{package,version,target,kind,sources}` (paths ABSOLUTOS) — contrato máquina pro OTA, sem scrapear stdout. **+ fallback de sources** (`_ResolveSourcePaths`): se o repo não tem `pubpascal.json`/sources, cai em `Source`/`src`/`lib` que existam (senão raiz). **VERIFICADO e2e no terminal:** `pp pkg add nidus --json` → clonou + emitiu `sources:[".../modules/nidus/Source"]` (Nidus NÃO tem pubpascal.json → fallback pegou Source/).
- **OTA source install:** `kind=source` (ação `add-paths`) → adiciona os sources ao `DCC_UnitSearchPath` da **BaseConfiguration** do projeto ATIVO (`IOTAProjectOptionsConfigurations`), dedup, `MarkModified`. designtime/installer retornam "próximo incremento" (degradação graciosa, build verde). CliPath do OTA agora cai pro PATH se pp.exe não estiver ao lado do bpl.
- **Builds verdes:** pp.exe (dcc64), ppota.bpl 0.13MB (dcc32), ppdesktop.exe (dcc64). 7 arquivos (1 novo). NÃO commitado ainda.
- ⏳ **FALTA validar na IDE (operador vai abrir o RAD Studio):** instalar `ppota.bpl`, abrir um projeto, clicar Install (runtime) num pacote → ver o path entrar em Project > Options > Search path. ⚠️ Cockpit ainda manda **display name** (mock), não slug → Install de pacote real exige slug que resolva (ex "nidus" funciona; "Nidus Suite" não). Alimentar slugs reais no cockpit = próximo micro-passo.

## 🟢 DADOS REAIS NO COCKPIT — SLICE A FEITO + verificado local (2026-06-19)
Decisão do operador: home do cockpit = **só OURO** por enquanto (ranking de "quem vem primeiro" a definir depois; uso relevância downloads→score→nome). Busca = TODOS os publicados (assinantes + não). Modelo do portal já tinha tudo: `packages.highlight_level IN (none|bronze|silver|gold)` = o tier (+ `sponsorship_ends_at`).
- **Portal:** `GET /api/packages/catalog` (`src/app/api/packages/catalog/route.ts`, público, anon, status=active) — sem `q` → só `highlight_level='gold'`; com `q` → ilike name/slug/description em todos; `limit` (default 50, max 100). Retorna `{packages:[{slug,name,description,tier,downloads,license_type}]}`. tsc limpo.
- **CLI:** `pp pkg list [--limit][--json]` (ouro) + `pp pkg search <q> [--limit][--json]` (todos) — `Command.PkgList.pas` (2 cmds, fetch DRY via `_RunCatalog`), registrados. --json = passthrough do payload pro OTA. Build dcc64 verde.
- **VERIFICADO (dev local 3005, curl + CLI apontado via config temporária):** ouro live = **janus + nidus**; `q=json`→jsonflow(bronze); limit respeitado. ⚠️ **CLI aponta PROD por default** (`DEFAULT_PORTAL_URL=https://www.pubpascal.dev`, sem config) → **o endpoint precisa DEPLOY pra prod** pro OTA usar.
- ⚠️ **UTF-8 mojibake** (`autom�ticas`): pipe CLI→stdout→`CliRunner` (lê bytes como `AnsiString`). Corrigir na Slice B (CLI emite UTF-8 + CliRunner decodifica UTF-8). Descrições PT têm acento → aparece.
- **launch.json do portal** mudado p/ porta **3005** (3000 ocupada — operador pediu "mude de porta").

## 🟢 SLICE B FEITO (2026-06-19) — cockpit OTA nos dados reais (Packages)
- **`package-manager.html`:** `PKGS` virou `let`+`loadPackages(payload)`; `ready`→`host('list')`, busca→`host('search')` **debounced 250ms server-side**; renderPkgs usa slug/tier (badge gold/silver/bronze), sem version-picker; Install→`doInstall(slug)`→`host('add-paths',slug)` (newest); details→`host('details',slug)`; **cards fictícios REMOVIDOS** (todo PKGS vem do portal). Empty-state. CSS de tier + i18n (`noPackages`/`legInstall`).
- **`PubPascal.View.pas`:** handlers `list`/`search`→`_LoadCatalog` (roda `pp pkg list/search --json`, injeta `window.loadPackages`); `details`→`_OpenDetails` (ShellExecute `pubpascal.dev/en/packages/<slug>` no browser). uses += Winapi.ShellAPI.
- **UTF-8 RESOLVIDO ponta a ponta:** CLI `pp.dpr` `SetConsoleOutputCP(CP_UTF8)`+`SetTextCodePage(Output,CP_UTF8)`; `CliRunner` acumula bytes+`TEncoding.UTF8.GetString`. **Verificado:** `automáticas/geração/segurança` corretos.
- **Builds verdes** (pp.exe, ppota.bpl, ppdesktop.exe). bpl+pp.exe copiados pro Bpl dir.
- **DEPLOY ✅ LIVE (2026-06-19):** PR portal [#130](https://github.com/isaquepinheiro/pubpascal-dev/pull/130) **mergeado** (`--admin`) → prod respondendo HTTP 200 (`https://www.pubpascal.dev/api/packages/catalog` → janus+nidus ouro, acentos OK). develop=main sincronizados (0/0). ⚠️ **CI "Build & Lint" travado por BILLING do GitHub Actions** ("recent account payments have failed / spending limit") — NÃO é código (lint/238 testes/coverage/Vercel todos verdes); por isso o admin-merge. **Operador precisa resolver o billing do Actions** senão todo PR futuro falha o check. Cockpit OTA agora deve acender ao recarregar o pacote (bpl+pp.exe já copiados).

## 🟢 SLICE D FEITO (2026-06-19) — detail in-cockpit + apresentação do workspace (2 fronts via sub-agents)
Operador pediu orquestração: "2 fronts (portal + IDE), IDE depende do portal, delega a sub-agents". Contrato fixo `GET /api/packages/<slug>/detail` → `{slug,name,description,tier,license_type,license_name,score,repository_url, dependencies:[{name,version}], workspaces:[{id,name,dependencies:[{slug,name}]}]}`. 2 sub-agents em paralelo.
- **DECISÃO ANTES:** cockpit OTA = **packages-only** (aba "Workspaces" REMOVIDA — outro cenário); info de workspace vai DENTRO do detail do pacote, não como menu. Mock `WORKSPACES`/`renderWss`/`setTab` removidos.
- **Portal (agente A):** `/api/packages/[slug]/detail` (anon, manifest deps + workspaces PÚBLICOS rooted no pacote, fail-soft) + `workspaces.ts` (viewer-visible: público p/ todos + os próprios se logado) + **`WorkspacePanel.tsx`** (painel lateral condicional — ele escolheu PAINEL, não aba, pq o tab system do portal é estático e a página já usa painéis SBOM/Deps; ⚠️ operador queria "aba Workspace" — CONFIRMAR painel-vs-aba). i18n pt+en. **DEPLOYADO PR [#131](https://github.com/isaquepinheiro/pubpascal-dev/pull/131) (admin-merge, billing) → prod /detail 200.** Verificado: Janus tier gold, MIT, **4 deps reais do manifesto** (MetaDbDiff/DataEngine/FluentSQL/JsonFlow!), workspaces:[] (nenhum public ainda).
- **IDE (agente B):** `pp pkg show <slug> --json` (Command.PkgShow) + cockpit `#detail-view` (`window.showDetail`, back, seção workspace condicional, "Install the set", "Open on portal") + `_ShowDetail` no View (roda pp pkg show, injeta showDetail), 'open-portal'→browser, 'install-set'→_AddPackage placeholder. CLI/OTA/Desktop os 3 builds verdes. **bpl+pp.exe copiados.**
- ⚠️ **App repo (CLI/OTA/cockpit) ainda NÃO commitado** — segurar até operador validar reload na IDE. ⚠️ **GitHub Actions billing** ainda travando CI (admin-merge em #130/#131).
- **PRA TESTAR:** reload OTA → details no Janus → detail in-cockpit c/ 4 deps; "Open on portal"→página com WorkspacePanel (vazio até um workspace virar public). **Seção workspace só aparece quando o operador setar um workspace `visibility='public'`** (default private).

## 🟢 SLICE E FEITO (2026-06-19) — detail in-cockpit "cara de portal" (read-only)
Operador (feedback nos prints): (1) "são 5 deps não 4" → VERIFIQUEI o manifesto real do Janus no GitHub: `pubdelphi.json` (nome LEGADO, branch main) declara **4** (MetaDbDiff/DataEngine/FluentSQL/JsonFlow), **FluentQuery NÃO está**. O 5º (FluentQuery) está no WORKSPACE privado do operador. Endpoint correto (lê manifesto = verdade pública). **Fix = DADO: operador add FluentQuery no manifesto do repo Janus** (+ renomear pra pubpascal.json). (2) "visual mais parecido com portal read-only" → escolheu opção **A (enriquecer detail custom)**, não iframe.
- **Orquestrei 2 sub-agents** (contrato ampliado). **Portal:** `/detail` ganhou `platforms, languages, cra{percent,level,signals{sbom,securityPolicy,maintained}}, sbom{format,attestedBy,published,downloads,downloadUrl(abs)}` — REUSA `computeReadiness/isMaintained/fetchSecurityPolicyPresence/getLatestPackageSbomMeta` (mesma lógica da page.tsx:777). Fail-soft. **DEPLOYADO PR [#132](https://github.com/isaquepinheiro/pubpascal-dev/pull/132) → prod 200:** Janus gold, CRA 100% (3✓), sbom cyclonedx, 5 plataformas, Delphi. **IDE:** cockpit `showDetail` redesenhado portal-like (card "Sobre" + chips LINGUAGEM/PLATAFORMAS + sidebar CRA-readiness panel [%+barra+3 sinais ✓/✗] + SBOM card [Download SBOM→`open-url`] + deps + workspace condicional + Install/Open on portal). Novo action `open-url` (ShellExecute só se `https://`, guarda). 3 builds verdes (pp 35.68 / ppota 0.15 / ppdesktop 4.03). **bpl+pp.exe copiados.**
- **PRA TESTAR:** reload OTA → details no Janus → detalhe estilo portal (CRA 100% + SBOM + plataformas). Deps ainda 4 até add FluentQuery no manifesto.

## 🟢 WORKSPACE PÚBLICO + TRANSITIVE INSTALL FEITOS (2026-06-19)
- **Workspace público:** só existe 1 workspace real ("Janus WorkSpace" id `9dbaad09-...`, owner `9650...`; "Nidus Suite" era mock). Portal JÁ tinha toggle visibility (create/edit forms). Flipei via Supabase REST (service key do .env.local, PATCH `/rest/v1/workspaces`) `private→public` (reversível). Nós: Janus(raiz)+FluentQuery,DataEngine,MetaDbDiff,FluentSQL,JsonFlow (5). **Verificado:** `/detail` prod → workspaces:[{Janus WorkSpace, 5 deps}]; página portal (en+pt-BR) renderiza o painel. **Resolve o "5 vs 4":** Dependencies(manifesto)=4 + Workspace(set público)=5 coexistem.
- **Transitive "Install the set" (1 sub-agente, só app — portal já dá o set):** `PkgFetch.pas` NOVO (extraído do PkgAdd, DRY: FetchPackage resolve+clone+checkout+sources, idempotente) → PkgAdd refatorado pra usá-lo (comportamento idêntico). `Command.PkgAddSet.pas` NOVO `pp pkg add-set <slug> [--json]`: GET /detail → set=[raiz]+workspaces[0].deps → FetchPackage em cada → emite `{"packages":[{slug,version,target,kind,sources}]}`. View `_AddPackageSet`+`_ParseInstallSet`: roda add-set --json, instala CADA path no projeto ativo; dispatcher 'install-set'→_AddPackageSet (não mais placeholder). **VERIFICADO e2e:** `pp pkg add-set janus --json` → **6 pacotes** (janus+5). 3 builds verdes. bpl+pp.exe copiados.
- **PRA TESTAR:** reload OTA → details Janus → seção Workspace → **"Install the set"** → clona os 6 em modules/ + adiciona os 6 search paths no projeto ativo.

## 🟢 `pubdelphi.json` ELIMINADO 100% (2026-06-19) — operador: "delphi não pode existir"
⚠️ CONTRADIZ a nota antiga "resíduo pubdelphi.json mantido de propósito" — agora REMOVIDO.
- **9 repos de pacote** (ModernDelphiWorks/Janus,Nidus,DataEngine,FluentQuery,FluentSQL,InjectContainer,JsonFlow,MetaDbDiff,ModernSyntax) tinham SÓ `pubdelphi.json` (não estavam migrados — só os repos PORTAL/APP tinham sido renomeados). Renomeei `pubdelphi.json`→`pubpascal.json` em TODOS via `gh api` (create pubpascal.json com conteúdo idêntico + delete pubdelphi.json, no default branch `main`). Verificado via gh api: 9/9 com pubpascal.json, pubdelphi.json 404.
- **Portal:** removido o fallback `pubdelphi.json` em `github.ts` (fetchManifestDependencies) + `profile/workspaces/actions.ts` (checkManifestAvailable + importManifestDependencies). `boss.json` MANTIDO (não tem "delphi"). Renomeado `id:"pubdelphi"`→`"pubpascal"` no download/page.tsx. **ZERO "pubdelphi" no src.** PR [#133](https://github.com/isaquepinheiro/pubpascal-dev/pull/133) deployado. Verificado: /detail janus ainda 4 deps (lê pubpascal.json agora).
- ⚠️ raw.githubusercontent CDN cacheia ~5min — usar gh api pra checagem autoritativa.

## 🟢 AEFOS AI PUBLICADO como pacote OURO (2026-06-19)
Operador: "publique o Aefos AI como produto instalável, repo ModernDelphiWorks/Aefos, OURO, e remove o card dele do /download deixando só PubPascal". Aefos = ex-DelphiSense (rebrand), plugin IA RAD Studio. ⚠️ ANTES era card `comingSoon` no /download; AGORA virou PACOTE no registry.
- **Insert via Supabase REST (service key):** `packages` row slug `aefos`, name "Aefos AI", repo `https://github.com/ModernDelphiWorks/Aefos`, publisher_id `9650e3f1-...` (mesmo do operador/janus), license_type `commercial`/`Freeware` (repo público mas NOASSERTION + free-sem-fontes), platforms `[Windows]`, languages `[Delphi]`, status `active`, **highlight_level `gold`** (gold manual, sem subscription). id `09e06506`. **Verificado prod:** catalog gold = [aefos, janus, nidus]; /detail/aefos ok.
- **/download:** removido o card `aefos` (APP entry + 2 COPY pt/en + import `Bot` órfão) — sobra só PubPascal. PR [#134](https://github.com/isaquepinheiro/pubpascal-dev/pull/134) deploy.
- ⚠️ Aefos como gold aparece TAMBÉM no cockpit OTA (`pp pkg list` gold) — é plugin/installer, não lib de fonte; install via add-paths seria degradado. Operador quis gold, aceito.
- **License = `commercial`/`Freeware`** (operador confirmou: free, NÃO opensource). ⚠️ UI mostra badge "Comercial" (`isCommercial ? "Comercial" : "Open Source"` em PackageCard/Header/OG/page) → passa ideia de pago. OFERECI ajuste "Free/Gratuito" pra freeware (4 lugares) — operador NÃO respondeu ainda. `website_url` null (Aefos terá site próprio FUTURO — setar quando existir).
- **CRA 100% (2026-06-19):** Operador perguntou por que SBOM ✗ (67%, 2/3). **DIAGNÓSTICO-CHAVE:** o sinal **SBOM lê da BASE** (`getLatestPackageSbomMeta` → `package_version_sbom`, SBOM PUBLICADO), **NÃO do repo** — diferente do SECURITY.md (`fetchSecurityPolicyPresence` lê o repo). Operador tinha posto `sbom/aefos-0.17.0.cdx.json` NO REPO → nunca consultado. Nem bug nem dado errado: é a FONTE. **FIX:** publiquei o SBOM no portal — criei `package_versions` 0.17.0 (`dd93569c`) + `package_version_sbom` (CycloneDX 1.5, 5 comps, attestedBy "TecSis Info", document = o do repo) via Supabase REST/urllib. **/detail aefos → CRA 100% full.** ⚠️ Insight: SBOM exige PUBLICAR (não basta no repo). Possível enhancement futuro: auto-ingerir SBOM do repo (igual SECURITY.md). ⚠️ git-bash desta sessão: `base64 -d`/redirect p/ /tmp falha — usar python+subprocess+urllib.

## 🟢 AUTO-INGEST de SBOM do repo (2026-06-19) — operador: "o que fiz manual vire auto, ao publicar se lá tiver importa"
Antes: SBOM só contava se PUBLICADO na base (manual via CLI upload). Agora AUTO ao publicar.
- **`src/lib/sbom/ingest-repo-sbom.ts` (novo, sub-agente):** `ingestRepoSbom(packageId, repoUrl)` — detecta SBOM no repo (lista `sbom/` via contents API + probes root `sbom.cdx.json`/`bom.json`), `parseSbom` (reusado), resolve versão de `metadata.component.version` (CycloneDX) ou do filename, cria `package_versions` se faltar, upsert `package_version_sbom` (mesma forma do `upload.ts`). FAIL-SOFT total. `listRepoDir()` novo em github.ts.
- **Hook:** `publish/actions.ts` chama `ingestRepoSbom(inserted.id, cleaned.repository_url)` antes do success return, try/catch (nunca quebra o publish). PR [#135](https://github.com/isaquepinheiro/pubpascal-dev/pull/135) deployado.
- **Verificado:** tsc/lint limpos, 4/4 testes (mock GH+supabase), + confirmei no SBOM REAL do Aefos: contents API lista `sbom/aefos-0.17.0.cdx.json`, `metadata.component.version`="0.17.0" → resolução OK. ⚠️ e2e real (publish dispara) NÃO testado headless (precisa sessão); próxima publicação prova. Aefos já está 100% (ingest manual anterior, não deletei).
- **BACKFILL + DEMO REAL FEITOS (2026-06-19, operador "exato"):** rota dev TEMPORÁRIA `/api/devtools/ingest-sbom?slug=` (chama o `ingestRepoSbom` REAL; 404 em prod) rodada no dev local (escreve na base PROD via .env.local). ⚠️ LIÇÃO: App Router IGNORA pastas com `_` (privadas) — `_dev` deu 404; usar nome sem `_`. **DEMO PROVADO:** deletei a version 0.17.0 do Aefos (sbom cascateia) → CRA caiu 67% → disparei a rota → `{ingested:1}` → CRA 100% de novo. attestedBy agora = `metadata.tools[0]` ("Aefos AI aefos-sbom…", lógica do parseSbom; ≠ "TecSis Info" do ingest manual que usou metadata.authors). **BACKFILL dos 10 ativos:** só **aefos** tem SBOM no repo (ingested:1); outros 9 = `no-sbom-found` (Janus/etc. têm SBOM PUBLICADO na base de antes, intactos — backfill só ADICIONA, não remove). Rota temporária REMOVIDA, dev parado, git limpo.

## 🟢 README do portal: imagens quebradas CORRIGIDAS (2026-06-19)
Operador: README do Aefos no portal com imagens quebradas ("aqui só abre lá do repo"). DOIS problemas:
1. **Screenshots relativos** (`assets/chat.png`) — o `MarkdownView` (marked+sanitize) não reescrevia relativo→absoluto. FIX: `MarkdownView` ganhou prop `repoUrl` + `transformTags` no sanitize que reescreve `img src` relativo→`raw.githubusercontent.com/<owner>/<repo>/HEAD/...` e `a href` relativo→blob. Página passa `repoUrl={repositoryUrl}` no README (`page.tsx`).
2. **Badges shields.io** bloqueados pela **CSP img-src** (só `*.githubusercontent.com`). FIX: add `https://img.shields.io` no `img-src` (next.config.ts) + atualizado `security-headers.test.ts`.
- **VERIFICADO ao vivo (dev 3005):** as 6 imagens do README do Aefos carregam (4 badges shields + 2 screenshots raw, todas naturalWidth>0). Assets chat.png/terminal.png existem no repo. **PR [#136](https://github.com/isaquepinheiro/pubpascal-dev/pull/136) deployado → prod CSP confirmada com shields.io.** tsc/lint/segurança(10/10) verdes.
- **REFINO LINKS (#137):** o resolveRelative ingênuo (concat) deixava `blob/HEAD/../../releases` (só funcionava por normalização do browser). Trocado por **`new URL(href, base)`** → `../../releases`→`.../Aefos/releases` limpo, `../../issues`→issues, file links seguem em blob/HEAD. README do Aefos tem ~12 links relativos (Download/Report-a-bug=`../../`, SECURITY/CHANGELOG/LICENSE/etc=arquivos). Deployado.

## 🟢 WORKSPACE LIMPO + APP COMMITADO/PUSHADO (2026-06-19, operador "limpe... suba publica deixa limpo")
- **App repo (`pubpascal-app`):** os 16 arquivos acumulados commitados em 2 commits lógicos (CLI `0138af2` [PkgFetch+pkg add/add-set/list/show/search+UTF-8] · studio `bb2991e` [Installer seam+cockpit real+detail+View+OTA+desktop, inclui ppota.dproj agora tracked]) + **pushado pra origin main** (app é main-only). Rebuild dos 3 verde antes de commitar.
- **Portal:** já estava limpo (develop==main 0/0, tudo deployado #128-#137).
- **Worktrees:** `git worktree prune` nos dois — só o worktree principal em cada (zero strays). **Ambos: working tree CLEAN, 0 unpushed, publicados.**

## 🟢 SBOM = LIVE DO REPO, não do banco (2026-06-19) — INVERTE o auto-ingest
Operador: "responsabilidade do SBOM é do REPO, não do nosso banco; substitua a classificação indo ao repo a cada visita ao detalhe, reclassifica, se lá excluído reflete". Agent dele estava ajustando TODOS os repos (nomes antigos no SBOM).
- **NOVO `src/lib/sbom/repo-sbom.ts` `fetchRepoSbom(repoUrl)`** (React cache, 1h, fail-soft, server-only, ZERO banco): detecta SBOM no repo (lista `sbom/` + probes root) reusando parseSbom + detecção do ingest, retorna `{format,specVersion,author,version,timestamp,downloadUrl(raw)}` ou null. Pega o de maior semver. `rawFileUrl()` novo em github.ts.
- **Rewire:** `/detail/route.ts` + `page.tsx` (CRA signal + header hasSbom + SbomCompliancePanel + VersionsList) leem `fetchRepoSbom` em vez de `getLatestPackageSbomMeta` (banco). Download SBOM → raw do repo. **Auto-ingest REMOVIDO** (publish hook + `ingest-repo-sbom.ts`+test deletados). Banco `package_version_sbom` + upload/GET routes + queries = **órfãos** (limpeza futura, não dropei).
- **VERIFICADO ao vivo (dev): TODOS os 10 ativos = 100%** lendo `sbom/<slug>-<ver>.cdx.json` do próprio repo (o agent do operador já pôs SBOM em todos — janus-2.23.0, nidus-1.1.0, etc.). Self-correcting. tsc/lint/242 testes verdes. **PR [#138](https://github.com/isaquepinheiro/pubpascal-dev/pull/138) deployado.**
- ⚠️ Push avisou **2 vulnerabilidades dependabot** (1 high, 1 moderate) no repo do portal — separado, pendente (operador decide).
- **LIMPEZA DO BANCO ÓRFÃO ✅ (PR [#139](https://github.com/isaquepinheiro/pubpascal-dev/pull/139), deployado):** `package-sbom.ts`→só tipos (PackageSbomMeta+SbomFormat mantidos; queries removidas); deletados `[version]/sbom/route.ts`+`upload.ts`+`upload.test.ts` (parse.ts MANTIDO, repo-sbom usa); VersionsList sem fallback `/sbom`; `sbom_downloads` (coluna+RPC) removido dos selects. tsc/lint/235 testes verdes. Prod saudável pós-deploy.
- ⏳ **MIGRATION DE DROP criada mas NÃO aplicada (destrutiva):** `supabase/migrations/20260619000000_drop_sbom_db.sql` (DROP TABLE package_version_sbom + DROP COLUMN sbom_downloads + DROP FUNCTION increment_sbom_downloads). Tabela/coluna seguem na base LIVE (inofensivas, código não usa). **APLICAR via fluxo manual db push** (operador deu OK só p/ ADITIVAS; DROP precisa OK explícito — ver [[project-resume-next]] "Como aplicar migrations"). Eu NÃO apliquei.

## 🟢 SUPABASE LINTER — 2 de 3 RESOLVIDOS ao vivo (2026-06-19)
Operador colou o output do db linter (3 WARN). 
- **0028/0029 `get_flagged_review_count` SECURITY DEFINER exposto a anon/authenticated:** ✅ RESOLVIDO. Caller (`utils/queries/reviews.ts`) trocado pra `createServiceClient` (PR [#140](https://github.com/isaquepinheiro/pubpascal-dev/pull/140)). REVOKE aplicado AO VIVO via `supabase db push` (keychain funciona; movi a migration de DROP de lado temporariamente pra aplicar SÓ o revoke). ⚠️ LIÇÃO: `REVOKE FROM anon, authenticated` NÃO bastou — função nasce com EXECUTE pro **PUBLIC**; precisou `REVOKE ... FROM PUBLIC` (migration 20260619020000, PR [#141](https://github.com/isaquepinheiro/pubpascal-dev/pull/141)). **Verificado: anon→401 permission denied, service→200.** App OK (service client).
- **Leaked Password Protection (HIBP):** ❌ NÃO resolvido por mim — é config de **Auth**, não SQL. `supabase config push` é DECLARATIVO (resetaria outras configs de Auth) = risco. **Operador faz no dashboard:** Authentication → Providers → Email → "Password security" → enable "Leaked password protection" (https://supabase.com/docs/guides/auth/password-security).
- ⚠️ **DRIFT de migration:** live tem 619010000+619020000 aplicadas mas NÃO a 619000000 (DROP do SBOM, ficou de lado). Pra aplicar o DROP depois: `supabase db push --include-all` (out-of-order). pooler-url tem placeholder de senha (pg direto não conecta); usar `supabase db push` (keychain).

## 🟢 SUPABASE LINTER 0008 (RLS no policy) — RESOLVIDO ao vivo (2026-06-19)
3 tabelas da schema **`aefos`** (produto Aefos, MESMA base Supabase do portal): `leads`, `license_activations`, `license_keys` com RLS ON mas SEM policy (trancadas a clientes, só service_role). Adicionei policy **deny-all client** (`FOR ALL TO public USING(false) WITH CHECK(false)`) — risco ZERO (service_role bypassa RLS; clientes já não tinham acesso). Migration `20260619030000_aefos_rls_deny_client.sql`, aplicada via db push (hold drop aside de novo), PR [#142](https://github.com/isaquepinheiro/pubpascal-dev/pull/142). ⚠️ **CAVEAT leads:** se houver form público inserindo direto no Supabase (anon), está negado — trocar por policy de INSERT anon se preciso. ⚠️ aefos schema idealmente seria gerida no repo do Aefos, não no portal (mas portal é o linked project).

## ⏳ PENDÊNCIAS SUPABASE
1. **Leaked Password Protection** — toggle no dashboard (Auth→Providers→Email→Password security), não consigo via SQL/CLI seguro. PENDENTE.
2. ✅ **DROP do SBOM APLICADO** (operador aplicou via a migration 2026-06-19; `db push --dry-run` = up to date, zero drift; tabela package_version_sbom + coluna sbom_downloads + RPC dropados). Prod saudável (SBOM live do repo). RESOLVIDO.
3. ✅ **2 vulns Dependabot RESOLVIDAS (2026-06-19):** ambas eram `undici` (high GHSA-vmh5-mc38-953g TLS bypass + medium GHSA-pr7r-676h-xcf6, via jsdom dev). `npm update undici`→7.28.0 (range jsdom ^7.25.0 aceitou). npm audit pegou +1: `js-yaml`≤4.1.1 (via eslint) → `npm audit fix`→4.2.0. **npm audit = 0 vulns; Dependabot alerts = fixed** (PR [#143](https://github.com/isaquepinheiro/pubpascal-dev/pull/143), lockfile-only, 235 testes verdes). Resta SÓ o leaked-password (item 1).

## (histórico) APP REPO estava sem commit — RESOLVIDO acima
Segurar até operador validar reload, mas é MUITO trabalho local não-pushado. Commitar logo. Portal: tudo deployado (#128-#132). GitHub Actions billing ainda travando CI (admin-merges).

## ⏳ Sobrou
- **PR repo Janus:** add FluentQuery no manifesto + rename pubdelphi.json→pubpascal.json (alinha técnico).
- **Transitive por MANIFESTO** (recursão genérica, p/ pacotes sem workspace) — hoje add-set é workspace-driven. add manifesto-driven é o próximo nível.
- Open graph (stub) — produto Desktop.

## ⏳ SLICE C-antigo — Workspaces tab + Open graph reais (SUPERSEDED pela decisão packages-only)
- **Workspaces tab** ainda MOCK (`WORKSPACES` const). Real = `pp workspace list --json` MAS precisa LOGIN (token) + endpoint mais rico (o atual só dá `{id,name}`, sem deps). Definir endpoint de workspace com deps.
- **Open graph** = abrir o grafo do workspace (produto Desktop / `workspace-graph.html`). Decidir: abre página do portal? troca a view? Stub hoje ("next increment").
- **details in-cockpit** (opcional): hoje abre o browser (portal page). Operador pode querer painel embutido.

## ⏳ PENDENTE (Inc.3 continuação)
- **Designtime install (kind=designtime):** compilar/registrar o `.bpl` na IDE (`IOTAPackageServices.InstallPackage`). Hoje só fetch + mensagem "próximo incremento".
- **Installer (kind=installer):** rodar o exe do vendor. Idem.
- **Library Path global** (conveniência, além do per-project).
- **Slugs reais no cockpit** (trocar mock display-names por slugs do catálogo).
- **Dados reais no cockpit:** ele ainda mostra `PKGS` MOCK (nomes de exibição, ex "Nidus Suite"), não slugs → o Install não casa com o slug real ainda. Falta alimentar a lista do catálogo do portal (via `pp` ou direto). 
- **Validar na IDE:** render do cockpit + modo IDE + Install — só fecham abrindo o RAD Studio (Install Packages).

Ver [[project-three-native-products]].
