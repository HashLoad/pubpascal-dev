---
name: project-sbom-strategy
description: Decisão arquitetural SBOM/CRA — PubDelphi CLI próprio + DPM vendorizado
  como library via adapter, portal como registry, contribuições upstream pontuais
metadata:
  node_type: memory
  type: project
  originSessionId: 85483b60-44ea-407a-b6ac-4b560a9344d6
type: project
---
# Decisão SBOM — 2026-06-03 (refinada 2026-06-04)

## Fato
Decisão arquitetural fechada após discussão completa sobre CRA (EU Cyber Resilience Act), DPM (VSoft Technologies), competidores (delphi.dev), e estratégia do CLI.

**Why:** Portal é novo, a lei já existe, não faz sentido construir com débito de compliance. Refinamento em 2026-06-04: trocar "fork com camada dentro" por "CLI próprio + DPM como library" elimina conflito de upstream, dá controle de versão real e posiciona o produto como PubDelphi (não como fork do DPM).

**How to apply:** Ao planejar qualquer Epic relacionado a CLI, publicação de pacotes, ou compliance CRA, considerar esta decisão como base — não reabrir os pontos fechados.

---

## Papéis definitivos

- **Portal** = registry central agnóstico — armazena, serve, exige SBOM no push; não gera SBOM de terceiros
- **CLI** = PubDelphi CLI próprio + DPM vendorizado (git submodule) consumido via adapter
- **Autor do pacote** = fabricante sob CRA, obrigação primária de gerar SBOM
- **DPM** = motor interno (pacotes + SBOM + scan + sign) — não é produto de usuário no nosso fluxo; Boss substituído operacionalmente pelo DPM-via-PubDelphi

## CLI — estratégia "static link único via `.modules/`" (refinada 2026-06-09)

**Decisão final (operador, 2026-06-09):** binário **único** `pubdelphi.exe` que **estaticamente liga** DPM + todas as suas dependências upstream. **NÃO** usar subprocess pra `dpm.exe` externo — o usuário instala 1 só executável. **NÃO** dividir vendor em `deps/` + libs avulsas — **tudo** vai em `.modules/` (estrutura uniforme).

- Repo: `pubdelphi-cli/` em `D:\DeveloperWeb\pubdelphi-cli`, branch `main`
- Vendor: `.modules/<NAME>/` — todos git submodules pinned, mesma estrutura pra DPM e pras 10 deps que ele puxa via `DownloadPackages.bat`. Lista vendorizada em 2026-06-09:
  - `DPM` (Spring4DMirror), `Spring4D`, `OmniThreadLibrary`
  - `VSoft.AntPatterns`, `VSoft.Awaitable`, `VSoft.CancellationToken`
  - `VSoft.CommandLine` (= repo VSoft.CommandLineParser)
  - `VSoft.HttpClient`, `VSoft.JsonDataObjects` (= repo JsonDataObjects)
  - `VSoft.SemanticVersion`, `VSoft.Uri`
  - Pulados (só IDE plugin/tests, adicionar se compile precisar): VSoft.VirtualListView, VSoft.DUnitX, Delphi-Mocks, VSoft.WeakReferences, VSoft.Messaging
- Adapters obrigatórios em `src/Adapters/`: `SbomAdapter`, `PackageAdapter`, `ResolverAdapter`
- **Regra de boundary:** nenhum código fora de `src/Adapters/` pode `uses DPM.*` ou `uses Spring.*` direto — proteger via review/lint
- Particularidades PubDelphi (login, workspace clone, status, update, push multi-repo, BOSS bridge, codename, PR-assist) ficam em `src/PubDelphi/` — nunca empurrar essas para upstream
- Update flow: `scripts/update-modules.{ps1,sh}` faz `git submodule update --remote --recursive`, mostra diff de pointers, operador commita e recompila o .exe
- `dpm sbom` (CycloneDX + SPDX) → consumir via `SbomAdapter` linkando `DPM.Core.SBOM.Generator.pas` direto no nosso binário (não chamar exe externo)
- Boss substituído: `boss install` → `pubdelphi install` (internamente chama motor DPM linkado in-process)
- ⚠️ `.gitignore` LOCAL **precisa** de `!/.modules/` + `!/.modules/**` pra contornar o `.gitignore_global` do operador (que ignora `.modules/` por padrão em outros projetos)

## SBOM funcionando end-to-end (2026-06-09) — aprendizados críticos

**PoC PROVADO:** `pubdelphi pkg sbom --project=<x.dproj> --format=cyclonedx` gera CycloneDX 1.5 válido com os 7 campos NTIA. Commit `1d2735c` no `pubdelphi-cli`. Testado contra `.modules/DPM/Source/DPM.Core.Tests.dproj` → `*-win64.cdx.json` (15 components, deps, purl `pkg:generic/dpm/...`).

**Build headless SEM IDE:** `dcc64.exe` de `C:\Program Files (x86)\Embarcadero\Studio\37.0\bin` (Delphi 13) compila direto — a IDE NÃO precisa estar aberta nem livre. Script `scripts/build.ps1` faz tudo. **NÃO usar msbuild no nosso `.dproj`** — ele é minimalista (falta `<BuildConfiguration>`/`Borland.Personality`), msbuild pula a compilação (`_PasCoreCompile skipped, _ProjectFiles vazio`). dcc64 direto no `.dpr` funciona.

**Flags dcc64 que descobri serem necessárias:**
- `-U<paths>` search path: nossos src + TODOS os dirs `.modules/**/Source|src` com `.pas`, EXCETO `Marshmallow|External` (Spring4D ORM tem cópia velha de `JsonDataObjects.pas` que conflita com RTL Win64 — `Realloc differs`), `Tests|Demos|Cmdline|IDE|bin|__`
- `-I<paths>` include: `Spring4D/Source`, `Spring4D/Source/Base`, `OmniThreadLibrary` (pro `Spring.inc`)
- `-NS<namespaces>`: `System;Xml;Data;Datasnap;Web;Soap;Winapi;System.Win;Vcl;Vcl.Imaging` (Spring4D usa nomes não-qualificados tipo `Rtti`)

**Dependency hell RESOLVIDO via init mínimo (decisão operador):** DPM `main` é construído contra versões VSoft **não-públicas** (HttpClient 2.7.0, YAML 1.7.0, Spring4D 2.0.2-beta.2 — não existem como git tag; `GetRequestUrl` que o `DPM.Core.Repository.Http` usa não existe em nenhuma branch/tag pública). **NÃO tentar pinar deps por versão — é impossível via git.** Solução: `src/Adapters/Dpm.Container.pas` tem `InitSbom` próprio que registra SÓ o subgrafo do `ISbomGenerator` (spec reader, config manager, package cache + cadeia signing/trust/crypto, map-file reader, 4 SBOM writers, CycloneDX reader, generator) — **NÃO chama `DPM.Core.Init.InitCore`** (que faz `uses DPM.Core.Repository.Http`). O unit incompatível nunca é compilado. install/restore/push (que precisam do HTTP repo) ficam deferidos.

**Deps que faltavam** (DownloadPackages.bat do DPM está obsoleto): adicionei `VSoft.YAML`, `VSoft.Base64.Polyfill`, `VSoft.System.Console` como submódulos. Todos os 14 submódulos ficam no HEAD do default-branch (não pinar).

**3 fixes runtime no SbomAdapter** (descobertos rodando):
1. setar `TSBOMOptions.ConfigFile := TConfigUtils.GetDefaultConfigFileName` (generator carrega config de `ConfigFile`, e pulamos `ApplyCommon`)
2. chamar `IConfigurationManager.EnsureDefaultConfig` antes (cria `%APPDATA%\.dpm\dpm.config.yaml` + pasta)
3. `CoInitializeEx(nil, COINIT_APARTMENTTHREADED)` — DPM parseia `.dproj` via MSXML (COM)

**Pendências conhecidas:** (a) `pubdelphi.dproj` nosso precisa virar `.dproj` completo (com `<BuildConfiguration>`) pra DPM/msbuild aceitarem; (b) tool identity do SBOM ainda diz `vendor=DPM` (pode trocar pra pubdelphi); (c) "Package dspec not found in cache" é esperado sem cache DPM local — não é erro.

## Portal Frente B (read/distribute) FEITO (2026-06-09) — commit `93bf6cc` no portal (branch develop)

Portal = registry que **exige/aceita/distribui** SBOM (NÃO gera). Lado de leitura/distribuição pronto e verificado:
- Migration `supabase/migrations/20260609000000_package_version_sbom.sql` — tabela satélite 1:1 `package_version_sbom` keyed por `package_version_id` (padrão graceful-degradation igual `package_publish_validation`). Cols: `format` (cyclonedx|spdx), `spec_version`, `author`, `document` JSONB, timestamps. RLS: público lê SBOM de pacote `active`; owner insert/update das próprias versões; admin full. **Migration operator-deferred** (aplicar no DB live).
- Endpoint `GET /api/packages/[slug]/[version]/sbom` — serve o document raw + headers `X-SBOM-Format`/`X-SBOM-Spec-Version` + Content-Disposition, `public max-age=300`, sem auth (SBOM de pacote active é público), rate-limit per-IP fail-open. Verificado runtime: 404 gracioso, 405 em POST.
- Helper `src/utils/queries/package-sbom.ts` (`getPackageVersionSbom`, soft-fail null, anon client — não precisa service-role).
- rate-limit: limiter `sbom-ip` (120/min) + `sbomIpKey` + testes (7/7 green). tsc 0, lint limpo (só GoldCarousel:41 pré-existente), build compila a rota.

## Loop CLI↔portal FECHADO end-to-end (2026-06-09)

WRITE path completa e verificada com round-trip de rede real:
- **Portal POST** `POST /api/packages/[slug]/[version]/sbom` (commit `8675f94`) — auth `cli_tokens` bearer, gate de **ownership** (owner do token = publisher do pacote), upsert via service-role. `parse.ts` (puro, testável — detecta CycloneDX/SPDX, extrai spec+author, 8 testes). Status: 201 criado / 200 substituído / 400 / 401 / 403 / 404. Scope dedicado `sbom:write` é hardening follow-up (CHECK do cli_tokens hoje pina `manifest:read`; gate real é ownership).
- **CLI `pkg publish-sbom`** (commit `bc45b43`) — `--slug --pkgversion --file [--format]`. `HttpClient.Post` novo (bearer + content-type + extra headers, TStringStream). Lê config (`login`), POSTa pro portal. Status mapeado pra mensagens+exit codes distintos.
- **Verificação e2e real:** CLI apontado pra `localhost:3000`, token falso, POSTou o SBOM gerado de verdade → portal autenticou → 401 → CLI reportou. Log do portal confirmou `POST .../sbom 401`. Só 201/403 ficam operator-deferred (precisam token+pacote reais no DB).
- **Chave:** CLI fala com NOSSO portal via NOSSO `HttpClient.pas` — NÃO o HTTP repo do DPM (bloqueado pela API VSoft não-pública). Então publish NÃO é bloqueado.

**Loop completo:** `pubdelphi pkg sbom --project=x.dproj` (gera CycloneDX) → `pubdelphi pkg publish-sbom --slug --pkgversion --file` (sobe) → portal guarda → `GET /api/packages/<slug>/<ver>/sbom` (distribui). CRA: geração + Distribution&Delivery + Frequency (re-upload substitui).

**Consumer-facing FEITO (2026-06-09, commit `0680f7a` portal):** página de detalhe do pacote (aba Versions) mostra link "SBOM · CycloneDX/SPDX" (emerald) por versão que tem SBOM, apontando pro `GET /api/packages/<slug>/<version>/sbom`. Helper `getSbomPresenceForVersions` (1 query, soft-fail), `VersionsList` ganhou `slug`+`sbomByVersion` (3 testes RTL). Estado gracioso sem dados (migration deferida → sem links). **NOTA:** `submitPackage` (`src/app/publish/actions.ts`) cria `packages` mas NÃO cria `package_versions` — versões vêm depois (Esteira/sync). Por isso o upload de SBOM via browser `/publish` não encaixa limpo (não há version pra anexar); via CLI (mira slug+version existente) é o caminho primário. Branch GitHub-versions da aba mostra tags do GH (sem SBOM); SBOM aparece nas versões trackeadas no nosso DB.

## `pkg scan` (OSV) FEITO (2026-06-09, commit `23cc47d` CLI)

`pubdelphi pkg scan --sbom <cyclonedx.json>` — consulta OSV.dev por vuln em cada componente do SBOM. `ScanAdapter` (src/Adapters) constrói a cadeia MANUALMENTE (não via container — `TVulnResponseCache` tem params escalares): `TCycloneDXReader.ReadFromFile` → `TVulnResponseCache(logger,'',24)` → `TOSVDatabase(logger,cache)` → `TVulnScanner(logger,db)` → `Scan(token, sbomReport)`. Mapeia `TVulnReport`→`TScanResult` (free dos owned). **OSV usa VSoft.HttpClient mas NÃO `GetRequestUrl`** → compila com o público (sem init mínimo). Exit codes p/ CI: 0 clean / 3 findings / 2 engine / 1 usage. **Verificado e2e contra osv.dev ao vivo:** 15 componentes do SBOM DPM.Core.Tests, 0 advisories (cobertura Delphi esparsa), exit 0. `version` lista o scan engine. Build 35MB.

## pack + verify FEITOS (2026-06-09, commits `9569f76`+`c9c3485` CLI)

- **`pkg pack --spec <x.dspec.yaml>`**: `PackageAdapter.Pack`→`TPackageWriter.WritePackageFromSpec`. **Arquiva sources (NÃO compila)** → verificável local. Registra `IPackageArchiveWriter`+`IPackageWriter` no init mínimo (packaging não puxa HTTP repo). **Provado:** dspec+1 .pas → `.dpkg` válido (zip com src + package.dspec.yaml + dpm-manifest.json).
- **`pkg verify --package <x.dpkg>`**: `PackageAdapter.Verify`→`IPackageSigningService.VerifyPackage(path, ITrustPolicyService.GetEffectivePolicy)`. Mapeia `TVerificationOutcome`→`TVerifyReport`. **Provado:** unsigned→UNSIGNED(exit 0), corrupto→INVALID(exit 5), sem-arg→1, sem-arquivo→2. **`pack` destravou o teste de `verify`** (finalmente há .dpkg). Cadeia crypto/trust já estava no init mínimo.
- `push/install/restore` continuam stubs (precisam HTTP repo bloqueado).

## Estado consolidado CLI (2026-06-09) — 15 commits, branch main

Comandos FUNCIONANDO + verificados e2e: `login`, `help`, `version`, `workspace clone/status/update/push` (herdados v4/v5), **`pkg spec`** (scaffold .dspec.yaml, PubDelphi-nativo), **`pkg pack`** (.dpkg), **`pkg verify`** (integridade/assinatura), **`pkg sbom`** (CycloneDX/SPDX), **`pkg scan`** (OSV ao vivo), **`pkg publish-sbom`** (sobe pro portal). **Fluxo de autor** spec→pack→verify e **fluxo CRA** sbom→scan→publish, ambos provados ponta a ponta. Portal: 177 testes verdes.

**`pkg sign` FEITO (commit `bb6aaee`) — provider PFX local (default sensato).** `PackageAdapter.Sign` abre PFX → assina manifesto → grava `signatures/author-N.p7s` (CMS + timestamp RFC3161). **WORKAROUND de bug DPM:** a factory no caminho PFX chama `store.FindByThumbprint('')` e o hex vazio lança `ECryptoHashing`. Em vez de patchar o DPM vendorizado (mantém pristine), computamos o thumbprint SHA-1 do 1º cert do PFX via crypt32 (`PFXImportCertStore`+`CertEnumCertificatesInStore`+`CertGetCertificateContextProperty`), passamos valor real pro `OpenPfxStore.FindByThumbprint`, e construímos `TPfxSigningProvider` direto. **Candidato a PR cortesia upstream.** `--pfx-password-env` mantém senha fora do histórico. **Provado e2e:** cert self-signed → spec→pack→sign (CMS 1304b + timestamp DigiCert) → verify "Signatures: 1, UNTRUSTED PUBLISHER" (correto: assinatura válida, signer não no trust set). **`pkg sign` precisa de REDE** (timestamp authority default digicert). Providers Azure KeyVault / Signotaur existem no engine — expor sob demanda. `pkg spec` é PubDelphi-nativo (DPM scaffold vive na Cmdline não-linkada).

## ⚠️⚠️ MODELO DO PORTAL — LER ANTES DE TUDO (operador corrigiu 2026-06-09, eu tinha errado)

**O PORTAL É METADATA-ONLY. NÃO HOSPEDA FONTE NEM BINÁRIO. NUNCA.** (`.project/references/architecture.md` linha 7: *"Storage: No source code hosting. Stores metadata, redirects to original repository (GitHub, GitLab)."* + project-evolution linha 87: *"The portal stays metadata-only (RN-007 — never holds git push creds)"*.)

- Pacotes vivem nos **repos git deles** (GitHub/GitLab/gist). O portal registra **ONDE** (`packages.repository_url`, `package_versions.download_url`, e o **DAG do workspace** `workspace_nodes`/`workspace_edges` com refs pinados).
- **Workspace = projeto pai + DAG de deps**, cada nó = repo num ref pinado. Serializado no **manifest** (`src/lib/workspaces/manifest.ts`: `clone_url`+`ref`+`edges`).
- **O CLI faz todo o git** com as credenciais do usuário: lê o manifest → **clona cada repo da fonte real** (GitHub) no ref → `dpm install` local por repo (substitui `boss install`; o CLI NÃO wira IDE path — isso é do Boss/DPM, RN-010).
- **"Instalar dependências" = `workspace clone` (JÁ EXISTE) + dpm install local.** NÃO existe download de `.dpkg` do portal.
- **"Publicar" = registrar METADATA** (repo_url + version pointer) no portal — fluxo `/publish` existente. O `.dpkg` (se existir) é asset de release no GitHub do autor; o portal só guarda o `download_url`.
- **SBOM SIM é guardado no portal** — é metadata GERADA (não existe no repo fonte), consistente com "stores metadata". `package_version_sbom` está CERTO.

**ERRO QUE COMETI E REVERTI (2026-06-09):** construí um registry de binários estilo npm — `pkg push`/`pkg install` (upload/download de `.dpkg`), bucket Supabase Storage `packages`, tabela `package_version_file`, endpoints `/api/.../package`. **TUDO ERRADO** (contradiz metadata-only). Revertido: CLI commit (revert de `0d5a627`) + portal `151867f` (removeu migration/endpoints/query). Mantido: `src/lib/cli-tokens/owner.ts` (refactor bom, usado pelo SBOM). **NÃO recriar isso.** Consumo de deps = modelo workspace (clone da fonte + dpm install).

**Próximo passo correto:** evoluir a fase de install do `workspace clone` pra **ADICIONAR** um caminho `dpm install` AO LADO do `boss install` (escolha por projeto). NÃO um `pkg install` que baixa binário.

## ⚠️ ATENDEMOS BOSS **E** DPM — NÃO substituir Boss (operador corrigiu 2026-06-09)

**Boss NÃO é substituído pelo DPM.** A nota antiga de 2026-06-03 (project-evolution linha 557: "Boss substituído: boss install → dpm install") está SUPERADA pelo operador. A v4 sempre disse "complements Boss, **never replaces it**" (linha 87) e ADR-079 travou "CLI shells out to boss". O CLI já entregue tem `BossRunner` (`boss install` por repo no `workspace clone`) — **isso PERMANECE.**

**Boss é o gerenciador incumbente do Delphi (base instalada enorme)** — forçar DPM alienaria a comunidade. O CLI **atende os dois**, escolhendo por projeto:
- projeto com `boss.json` → `boss install` (BossRunner existente, mantido)
- projeto com deps DPM / `.dspec.yaml` → motor DPM vendorizado
- DPM também entra pra SBOM/scan/sign/pack/verify (que o Boss nem faz)

**NÃO remover/trocar o BossRunner.** DPM é COMPLEMENTO/ALTERNATIVA, aditivo. Qualquer evolução do install no `workspace clone` ADICIONA o caminho DPM ao lado do Boss, nunca troca.

**Padrão p/ wirar comando DPM:** (1) achar interface+impl em `.modules/DPM/Source/Core/<area>/`; (2) confirmar que o unit NÃO faz `uses DPM.Core.Repository.Http` nem `GetRequestUrl` (grep); (3) se precisar, registrar no `InitSbom` (Dpm.Container) OU construir manual se ctor tem params escalares; (4) adapter em `src/Adapters/` (boundary), command em `src/PubDelphi/Commands/`, registrar em CommandRegistry+.dpr+.dproj; (5) `pwsh scripts/build.ps1` + testar. Para registry ops: NÃO wirar repo DPM — usar nosso HttpClient + endpoint do portal.

**Pendências:** (1) `gh auth login` → publicar `pubdelphi-cli` no GitHub; (2) migration `20260609000000` no DB live; (3) `pkg sign` — precisa cert/signing provider (ISigningProvider); `pkg spec` — scaffold yaml (fácil, fazer depois); `push/install/restore` — bloqueados (HTTP repo); (4) `/publish` browser SBOM — bloqueado até publish criar `package_versions`; (5) scope `sbom:write` dedicado; (6) `pubdelphi.dproj` completo p/ msbuild; (7) tool identity SBOM diz `vendor=DPM`.

## Postura com upstream DPM

**Regra de ouro:** toda mudança nasce no nosso CLI primeiro. Upstream é cortesia, não caminho crítico — nunca dependemos do DPM oficial para entregar.

- **Ajustes que beneficiam todo o ecossistema** (não são particularidade PubDelphi): primeiro implementamos no nosso vendored copy, validamos em produção, depois **oferecemos** como PR cirúrgico no DPM oficial. Aceito → sincronizamos. Rejeitado/lento → seguimos no patch local sem bloqueio (Apache 2.0 permite).
- **Particularidades PubDelphi (BOSS, workspace multi-repo, portal):** ficam só na nossa casa. Nunca tentar empurrar.
- **Parceria VSoft:** continua possível, mas não é pré-requisito. O modelo library+adapter funciona independente de parceria formal.

## Obrigações Apache 2.0

- Manter `LICENSE` e `NOTICE` do DPM no repo PubDelphi CLI
- Atribuir crédito ao DPM no output de `pubdelphi --version`
- Documentar no README que o motor de pacotes/SBOM é o DPM

## SBOM do próprio PubDelphi CLI

Como o DPM virou dependência interna, o binário do PubDelphi CLI tem como ingredientes: DPM, Spring4D.*, VSoft.*, OmniThreadLibrary. O próprio motor DPM embutido gera o SBOM do CLI → **nascemos CRA-compliant por construção**. Usar isso na narrativa de marketing.

## Dois caminhos, mesmo portal

- **Parceria VSoft (bônus):** colaboração pontual, contribuições upstream
- **Autônomo (default):** CLI próprio com DPM vendorizado, Apache 2.0 cobre tudo
- Portal não muda em nenhum dos dois

## PURL para Delphi

`pkg:github/<owner>/<repo>@<ref>` — padrão oficial para todos os pacotes Delphi (Boss e DPM são repos GitHub). Não existe `pkg:boss/` registrado — não usar.

## Standards corretos

- ISO/IEC 5962:2021 = SPDX
- ECMA-424 = CycloneDX
- "ISO 81870" mencionada no blog Embarcadero = erro tipográfico

## CRA — prazos e profundidade de SBOM

- **11/set/2026:** obrigações de reporte de vulnerabilidades começam
- **11/dez/2027:** SBOM obrigatório para venda na UE; multa até €15M ou 2,5% faturamento
- **Mínimo legal:** dependências top-level
- **Prática recomendada (BSI TR-03183-2):** resolução recursiva até o primeiro componente fora do escopo de entrega
- Campos por componente: nome, versão, fornecedor, PURL, SHA-256, licença
- Formatos aceitos: CycloneDX (ECMA-424) ou SPDX (ISO/IEC 5962:2021)

## Competitivo (refinado 2026-06-04 após inspeção UI + docs)

**Correção importante de avaliação anterior:** `delphi.dev` NÃO é portal em estágio inicial — é o **DPM Gallery oficial**, copyright "Vincent Parrett & Contributors", maduro, com sidebar `Organisations`/`Packages`/`API Keys`/`Signing Keys`, fluxo de publish completo via CLI, 18 comandos `dpm` documentados (`cache`/`help`/`info`/`install`/`list`/`pack`/`prepare`/`push`/`restore`/`sbom`/`scan`/`sign`/`sources`/`spec`/`trust`/`uninstall`/`verify`/`why`). A análise antiga subdimensionou tanto o portal quanto o CLI.

**Diferenciais reais do PubDelphi (revisado):**

1. **Form visual no `/publish` (DPM Gallery não tem)** — lower barrier, familiar para devs vindos de npm/PyPI/RubyGems; primeiro publish sem CLI. Posicionamento: camada visual + multi-tenant sobre motor open-source DPM.
2. **Multi-tenant / Organizações** (DPM Gallery tem versão própria, modelo a ser estudado e adaptado) — Signing Keys per-org (certs públicos validando `.dpkg` no publish) + Members + Invitations 48h TTL + roles `Administrator`/`Collaborator`. PubDelphi precisa replicar esse modelo no v7 (memória [[project-roadmap-v6-deferred]] item "Multi-tenancy + Supply-chain trust").
3. **BOSS bridge / workspace multi-repo** (DPM não tem) — Roadmap v4/v5 do PubDelphi entregou workspace clone + status + update + push multi-repo + codename branching. Esses são fluxos PubDelphi puros, fora do escopo do DPM.
4. **CRA-compliant por construção** — DPM embutido gera SBOM do binário PubDelphi CLI; portal exige SBOM no push de qualquer pacote terceiro.

**Implicação prática para o roadmap v7:** PubDelphi NÃO está reinventando o que o DPM faz. O DPM resolve a parte mais difícil (geração SBOM, scan OSV, assinatura, formato `.dspec.yaml`). PubDelphi adiciona: portal visual, multi-tenant, workspace, BOSS bridge. **Posicionamento limpo, sem competir de frente com o ecossistema upstream.**
