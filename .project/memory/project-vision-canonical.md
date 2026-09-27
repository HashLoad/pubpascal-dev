---
name: project-vision-canonical
description: A VISÃO canônica do PubDelphi nas palavras do operador (2026-06-09) —
  a origem (DOR de gerenciar PAI+deps), o workspace, o CLI, o Boss honrado, e a lei
  SBOM via fontes DPM por adapter. LER ANTES DE PROPOR QUALQUER COISA.
metadata:
  node_type: memory
  type: project
  originSessionId: 8772b5dd-efcb-4be6-8447-e646ecbede3a
  modified: 2026-07-22 17:12:19.589000+00:00
type: project
---
# A visão canônica do PubDelphi (operador, 2026-06-09 — palavras dele)

**Ler isto antes de propor arquitetura.** É o "porquê" que evita over-engineering (eu já errei assumindo um registry de binários e quase um registry de pacotes DPM).

## ⭐⭐ VIRADA 2026-07-22 — o Boss VOLTOU, e agora contribuímos PARA DENTRO dele
**Supersede a seção "SUBSTITUIÇÃO DO BOSS COMPLETA" mais abaixo.** O CLI do PubPascal hoje é um **fork do HashLoad/boss (Go)**, não mais um CLI Delphi próprio — é por isso que o portal distribui o binário como `public/downloads/boss.exe` e mostra `boss workspace clone <id>` na UI.

- **PR upstream `HashLoad/boss#263`** leva a integração PubPascal + comandos CRA para o Boss oficial: `login --token`, `workspace clone/status/update/push`, `contribute`, `pkg spec`, `sbom`, `cra`.
- **O PORTAL é o motivador e o PADRÃO** (palavras do operador, 2026-07-22): *"tudo que estamos fazendo aqui no Boss foi motivado pela existência do portal, onde lá se consegue criar workspace de projetos e dependências, e é através do padrão dele o que teremos tudo que há de novo nos apps e também no Boss"*. Portanto: o badge/link `pubpascal.dev` no README do Boss é **legítimo**, não auto-promoção — é a fonte do padrão que os comandos implementam.
- **Consequência operacional crítica:** o branch `feature/pubpascal-cra-compliance` no fork `isaquepinheiro/boss` é o **head do #263**. Qualquer push/merge nele **publica na HashLoad na hora** e dispara o CI de lá. O operador **NÃO é dono** do HashLoad/boss — ver [[feedback-never-touch-upstream-boss]].

**A pilha, nas palavras do operador (2026-07-22):** o **portal define o padrão** → **PubPascal Desktop** e **plugin OTA da IDE Delphi** consomem esse padrão → e **"por trás quem faz tudo é o Boss"**. Ou seja: os 3 produtos nativos ([[project-three-native-products]]) não têm motor próprio — o motor é o Boss (fork), e o padrão vem do portal. Toda novidade nos apps nasce do padrão do portal e desce para o Boss.

### ⭐ DECISÃO TRAVADA (operador, 2026-07-22): o FORK é a fonte da verdade
*"se depois eles quiserem eu retribuo, mas sempre trabalharei com o fonte do meu fork, nunca vou depender de lá."*

- **O `isaquepinheiro/boss` é o repo de trabalho e de release.** O binário que o portal distribui (`public/downloads/boss.exe`) sai do fork, e é ele que Desktop/OTA consomem.
- **Contribuir para o `HashLoad/boss` é RETRIBUIÇÃO, não dependência.** Nunca bloquear trabalho esperando aceitação do upstream; nunca desenhar solução limitada pelo que o mantenedor aceitaria. Se ele aceitar, ótimo (alcance na base instalada); se recusar, não muda nada do nosso lado.
- **Consequência prática:** o operador NÃO precisa ganhar a negociação do PR de integração PubPascal. Isso é força na mesa — quem não precisa do acordo negocia melhor. O `boss pubpascal ...` namespaced (pedido do mantenedor na anotação #21) é o caminho de menor atrito e já foi aceito por nós.
- **Imposto a pagar, conhecido:** fork divergente = rebase sobre o upstream para sempre (em ~2 semanas já ficou 3 commits atrás). Aceito conscientemente.

**Estratégia de PRs para o upstream (acordada 2026-07-22): VÁRIOS, não um.** O #263 hoje é um PR único de ~2.557 linhas misturando 4 frentes independentes. Ordem proposta: (1) dependência circular + flag `-v` no `dependencies` — melhoria pura do Boss, aceitação quase certa; (2) scaffolding Lazarus no `boss new` — ⚠️ **falar com o snakeice antes**, existe branch `feature/phase2-lazarus-and-update` no upstream, risco de duplicar trabalho dele; (3) CRA/SBOM (`cra`, `sbom`) — argumento forte: CRA é regulação europeia, não é PubPascal; (4) integração PubPascal como **beta sob `boss pubpascal`** — o único acoplado ao registry, o único que ele pode recusar sem razão técnica. Assim os 3 primeiros entram independentemente do desfecho do quarto. Só cortar os PRs **depois** de tudo testado, incl. Desktop e OTA rodando contra este Boss.

## A origem — a DOR
Gerenciar um repo **PAI** + repos **dependências** sempre foi sofrido: um bug reportado no PAI pode na verdade estar numa **dependência**. Versionar PAI e dependentes (repos diferentes) junto era a dor.

## O portal
- **Catálogo de metadata, NÃO físico.** Publicação = **link do repo git** + descrição pra dar contexto. Usuário **baixa direto do git**. Nada hospedado (nem fonte, nem binário).
- **Workspace = gerenciador de dependências** no portal: PAI + deps, sendo deps **repos publicados no portal OU links externos** (os dois suportados). Esse é o recurso que resolve a DOR.

## O CLI (por que existe)
- Entende o **padrão workspace** do portal; gerencia **versionamento do PAI e das dependências** entre repos. **Esse é o coração.**

### ⚠️ VIRADA 2026-06-09 (tarde) — PubDelphi SUBSTITUI o Boss (não homenageia mais)
**Motivo:** com o Boss no fluxo, o **boss.json LOCAL dita a versão das deps** — então o pin de versão do WORKSPACE não tem efeito. O operador decidiu: *"quero que o WORKSPACE dite a versão a ser baixada, não o boss... vamos partir para remover o boss e criar recursos para substituir o que ele faz, inclusive add paths no .dproj."* E: *"quem quiser use o boss independentemente — ele não depende do pubdelphi."*
- **PubDelphi self-contained, NÃO chama/depende do Boss.** Boss segue existindo independente; quem quiser usa por fora.
- **O workspace é a autoridade TOTAL de versão** (PAI + deps). O clone coloca cada dep **na versão do workspace** dentro do `modules/` (ou pasta a definir) do PAI.
- **PubDelphi assume o que o Boss fazia:** baixar deps + **injetar os search paths no .dproj** do PAI (DCC_UnitSearchPath) pra compilar.
- **ANTES (revertido):** "homenageia o Boss, BossRunner roda `boss install`". Agora: **remover o BossRunner do clone**, topologia aninhada em `modules/`, patch do .dproj.
- Decisões travadas: pasta = **`modules/`**; source-folder da dep = **ler `mainsrc` do boss.json** dela.
- **FASE 1 FEITA (commit pubdelphi-cli `ce325a9`):** clone self-contained — `ResolveRepoSubdir` root-aware (PAI em `<root>/`, deps em `<root>/modules/<dep>`), Boss removido do clone (BossRunner/install phase/--no-install fora), root clonado primeiro. Provado: `clone janus@2.22.5` → janus/ + janus/modules/{5 deps}, 6/6, zero Boss. Os 4 comandos (clone/status/update/push) threadam o root name.
- **FASE 2 FEITA (commit pubdelphi-cli `cf40a84`):** injeção de search path no `.dproj` — **NOSSA** (não reusou `AddSearchPaths` do DPM, que é acoplado ao cache `$(DPM)`/`DPMSearch`). Aprendi a técnica MSXML do DPM (`DPM.Core.Project.Editor.pas`): `CoDOMDocument60`, namespace MSBuild `http://schemas.microsoft.com/developer/msbuild/2003` (prefixo `x:` via SelectionNamespaces), `baseConfigPath = /x:Project/x:PropertyGroup[@Condition="'$(Base)'!=''"]`, prepend no `DCC_UnitSearchPath`.
  - `src/PubDelphi/Core/DprojEditor.pas` (MSXML, prepend paths RELATIVOS + `$(DCC_UnitSearchPath)`, idempotente, SEM marcador DPM) + `BossJson.pas` (lê `mainsrc` só como path) + `Command.Clone._InjectDprojPaths` (pós-clone: pra cada dep `modules/<dep>/<mainsrc>`, pra cada .dproj do PAI adiciona path relativo via `ExtractRelativePath`).
  - **Bugs corrigidos:** CoInitialize por-chamada → AV (movido pra 1x no batch); separadores `/` misturados → normalizar pra PathDelim. Patcha TODOS os .dproj (decisão a).
  - **PROVADO:** `clone janus@2.22.5` → 84 .dproj wired, 0 failed, paths `..\..\..\modules\<dep>\Source` limpos.
  - **Exe re-bundlado no portal** (`d12b4dc`).

## ✅ SUBSTITUIÇÃO DO BOSS COMPLETA
PubDelphi 100% self-contained: **fetch** (versões do workspace) → **place** (`modules/`) → **configure** (.dproj search paths). Boss não é mais envolvido — segue independente p/ quem quiser.

## A lei SBOM (camada de compliance)
- Rizzato (rep. Embarcadero BR) apresentou a **Lei SBOM da Europa** (CRA) e o **DPM**. O operador quer algo grande (não só Brasil) → atender a lei.
- DPM oficial **exige parceria** (incerta) e o **HTTP repo deles é privado**.
- **Insight:** os **fontes PÚBLICOS do DPM geram o padrão SBOM da lei**. Mas usar a CLI deles na estrutura workspace exigiria ajustar os fontes deles (eles aceitariam?).
- **Decisão:** **CLI próprio**, fontes do DPM **via Adapters** (desacoplamento máximo). Endpoints/comandos **meus** chamando o código deles pelo adapter. **Ajustes ficam no MEU**, não no deles. Bug nos fontes deles → **PR pontual** (não dependemos da parceria).

## Implicações (anti-over-engineering)
- **Coração = workspace mgmt (PAI+deps).** JÁ CONSTRUÍDO: `workspace clone/status/update/push`.
- **Deps = Boss baixa.** JÁ: `BossRunner`. Honrar, não substituir.
- **SBOM = fontes DPM via adapter.** JÁ: `pkg sbom/scan/pack/sign/verify` (motor DPM in-process, src/Adapters/).
- **DPM é pra SBOM (a lei)** — NÃO pra virar um registry de pacotes nosso nem substituir o download de deps (isso é Boss + workspace clone). NÃO transformar o portal em feed/registry DPM (IRegistryCatalog/dpm restore foi over-engineering meu — pausado).
- Portal nunca hospeda nada; só links + descrição + DAG do workspace + SBOM (metadata gerada).

Ver [[project-sbom-strategy]] (decisões técnicas), [[project-execution-plan]] (fases — REVISAR à luz desta visão), [[project-roadmap-v6-deferred]].