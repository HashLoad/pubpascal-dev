---
name: project-manifest-strategy
description: ⭐ DECISÃO (operador, 2026-06-10) — PubDelphi terá MANIFESTO PRÓPRIO (pubdelphi.json),
  NÃO depender do boss.json. boss.json vira só um IMPORTADOR no portal (gated em presença).
  App/CLI usam o nosso.
metadata:
  node_type: memory
  type: project
  originSessionId: 8772b5dd-efcb-4be6-8447-e646ecbede3a
type: project
---
# Manifesto próprio (decisão 2026-06-10)

## A decisão
PubDelphi **NÃO depende do `boss.json`** — tem o **seu próprio manifesto** (`pubdelphi.json`). Motivo do operador: *"usar o manifesto do boss acaba nos amarrando a ele, não quero isso."*

**2 razões (validadas):**
1. **Acoplamento** — depender do boss.json = dependência externa frágil (se o Boss mudar/deprecar, ou o pacote não usar Boss → quebra).
2. **boss.json NÃO captura o que precisamos** — ele só tem `name/version/mainsrc/dependencies`. Falta: **`kind`** (source/designtime/runtime → decide o tipo de install), o `.dpk` de entrada (pra registrar BPL designtime), plataformas, metadata CRA. Então **precisamos do nosso de qualquer jeito.**

## O modelo
```
RUNTIME:  CLI + app leem o pubdelphi.json  ← canônico, NOSSO, independente
IMPORT:   boss.json / .dproj / scaffold  → GERAM o pubdelphi.json (conveniência)
```
- `boss.json` deixa de ser dependência de runtime → vira **um IMPORTADOR** (entre vários). Mantém a conveniência (bootstrap do grafo), perde o acoplamento.
- Migração de graça: os 9 pacotes têm boss.json → "importar" gera o pubdelphi.json; pacote novo → `pubdelphi spec` faz scaffold (igual DPM `.dspec`).

## Spec JÁ ESCRITA (2026-06-10, commitada)
`public/schema/pubdelphi-manifest.md` (doc) + `public/schema/pubdelphi.schema.json` (JSON Schema). Commits `639b5a8` (base) + `a317235` (installer) + `c0c1ebb` (3 kinds). ⚠️ Em `public/schema/` porque `docs/` é gitignored.

`kind` = **runtime | designtime | installer** (simplificado 2026-06-10 — `source` virou `runtime` "pq dev Delphi conhece o termo", `mixed` caiu):
- `runtime` → add search paths (a maioria; lib que você usa no código). Exige `sources`.
- `designtime` → paths + buildar+registrar BPL na IDE (componente na paleta; só IDE/ToolsAPI). Exige `design`.
- `installer` → **baixar+rodar o `install.exe`/`.msi` do fornecedor** (pago/comercial) — exige `install` `{type,url,silentArgs?,interactive?,sha256?,signedBy?}`

**Pago/installer (gap que o operador achou):** licença = concern do PORTAL (serve a URL gated após compra; descritor efetivo vem do repo OU do portal record). Confiança = verificar sha256 + assinatura Authenticode `signedBy` antes de rodar (reusa a camada CRA). App lê SEMPRE o descritor efetivo da API do portal.

## Cockpit do app (POC `pubdelphi-ide-poc/package-manager.html`)
Maquete madura: abas **Packages vs Workspaces** (pacote=todos, workspace=subconjunto PAI+deps que detalha deps), badge de `kind` (runtime/designtime/installer) + **legenda** explicando cada um, botão **"Install" único**, **seletor de versão** (split-button estilo GetIt), **patrocinadores (assinatura) primeiro + destacados em dourado**. **Tudo EN + i18n-ready** (`STRINGS`/`t()`, convenção do operador: app é EN). Commits POC até `b66a9cc`.

## Regra do boss.json (operador, 2026-06-10) — "único ponto é o portal"
- **boss.json SÓ no PORTAL** (a feature de import). **App/CLI NUNCA tocam boss.json** → usam o pubdelphi.json.

## IMPLEMENTAÇÃO ✅ (2026-06-10, b1+b2)
- **b1 — `pubdelphi pkg manifest`** (`Command.Manifest` + `BossJson.Read`): lê boss.json → gera `pubdelphi.json` (kind:runtime, sources de mainsrc, deps normalizadas `github.com/owner/repo→owner/repo`), UTF-8 sem BOM, schema-válido, boss.json INTACTO. CLI `3822af5`.
- **b2 — clone lê o NOSSO manifesto** (`PubDelphiJson.Read` + `Command.Clone._CollectDepSearchDirs`): wira `.dproj` lendo `sources` do pubdelphi.json (suporta múltiplos); **transicional** — cai pro `boss.json` mainsrc + aviso "run pkg manifest" só quando não há pubdelphi.json (operador escolheu (b), sem corte limpo). CLI `72bce2b`. **GAP do BossJson.ReadMainSrc fechado** (vira fallback).
- **c2 — portal PREFERE pubdelphi.json** (`importManifestDependencies` + `checkManifestAvailable` + `repoSlug` host-agnóstico em `actions.ts`): o import do workspace lê o pubdelphi.json do repo raiz (deps), cai pro boss.json só na ausência; botão "Import dependencies" habilita se qualquer um existe. Portal `55eb681`. tsc limpo.
- **c1 ✅ FEITO (2026-06-10):** os **9 repos ModernDelphiWorks já têm `pubdelphi.json`** no GitHub (main), gerado via `pkg manifest`, commitado com co-author. Cada repo: adicionado `!pubdelphi.json` no .gitignore (eles ignoram `*.json` exceto boss). **Deps FIÉIS (sem versão)** — o boss.json do operador não pina (decisão: workspace é a autoridade de versão, não o manifesto do pacote). `gh` autenticado (isaquepinheiro). **Manifesto agora LIVE de ponta a ponta** (machinery + os 9 repos reais).

## TODO anotado → ✅ FEITO (2026-06-10, commit `115f350`)
- **Portal — gating do "Import boss.json":** FEITO. `checkBossAvailable(workspaceId)` em `actions.ts` (resolve raiz + sonda boss.json) → o botão em `WorkspaceGraphCanvas` desabilita (cinza + hint `graph.bossUnavailable`) quando o repo raiz não tem boss.json. tsc limpo.

## Resíduo do Boss → ✅ LIMPO (2026-06-10, CLI `53e523b`)
Feito: `BossRunner.pas` deletado (+ .dpr/.dproj), help do `clone` reescrito (sem "boss install"/"--no-install"), comentários (PackageAdapter/GhRunner) corrigidos. CLI compila limpo.

Ver [[project-vision-canonical]] (substituição do Boss), [[project-packages-todo]].
