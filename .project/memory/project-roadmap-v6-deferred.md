---
name: project-roadmap-v6-deferred
description: Roadmap SBOM/CRA (CLI library-and-adapter com DPM vendorizado) — PRÓXIMO
  roadmap a planejar (NÃO é o v6 atual 'Production Hardening'); agendado p/ depois
  de Epics 3/4 e 4/4 do v6
metadata:
  node_type: memory
  type: project
  originSessionId: 221b49b5-fdff-4475-bd5b-2563d0c13704
type: project
---
# Roadmap SBOM/CRA — agendada (2026-06-04)

## Correção de rótulo
**Atenção:** o roadmap **v6** do projeto JÁ EXISTE e é "Production Hardening & Quality" (4 Epics / 9 demands — testes, security headers, rate limiting, i18n, DRY). O roadmap SBOM/CLI descrito aqui é o **PRÓXIMO roadmap a planejar** (será v7 ou o número que o `/architect` A1 atribuir). Não chamar de "v6".

## Fato
Decisão de priorização: finalizar Epic 3/4 (i18n correctness) e Epic 4/4 (DRY/maintainability) do roadmap v6 atual antes de planejar o roadmap SBOM/CLI.

**Why:** Os Epics restantes do v6 são pequenos e do mesmo stack (portal Next.js); o roadmap SBOM é grande, troca de stack (Delphi CLI), e merece foco total. CRA tem prazo real (reporte set/2026, SBOM obrigatório dez/2027) — folga para fechar o pipeline atual antes.

**How to apply:** Não abrir nenhuma demanda SBOM/CLI enquanto Epics 3/4 e 4/4 do v6 estiverem em andamento. Ao fechar Epic 4/4, abrir formalmente o roadmap SBOM com `/analyst` (Mode A) começando pelo vendoring DPM.

**Status (2026-06-04):** Epic 3/4 — Demand 1/2 (i18n localizedHref) ABERTA no pipeline via /architect next.

## Escopo previsto da v6 (ordem provável das demandas)

1. **Vendoring DPM** — adicionar `deps/DPM/` como git submodule pinado, integrar ao build do CLI, manter `LICENSE`/`NOTICE` Apache 2.0.
2. **SbomAdapter** — wrapper sobre o motor SBOM do DPM (CycloneDX + SPDX), expõe API estável para o resto do CLI.
3. **PackageAdapter + ResolverAdapter** — wrappers de instalação e resolução de dependências.
4. **Camada PubDelphi sobre os adapters** — refatora `login`/`clone`/`status`/`update`/`push` existentes para consumir o motor DPM via adapters; substitui orquestração Boss por DPM internamente.
5. **Portal exige SBOM no push** — endpoint de publish/push valida presença e formato do SBOM; rejeita pacote sem ele.
6. **Atribuição DPM no `--version`** — output do CLI credita DPM upstream conforme Apache 2.0.

## Candidato adicional ao mesmo roadmap futuro (v7) — Multi-tenancy + Supply-chain trust (2026-06-04, refinado pós-inspeção UI)

Operador inspecionou via prints a UI logada do **DPM Gallery oficial** (delphi.dev — confirmado como o registry do MESMO DPM que será vendorizado pela estratégia SBOM). Modelo observado é **mais sofisticado** do que "Supabase com tenant":

- **Separação de credenciais:** API Keys = nível USUÁRIO (sidebar do usuário); Signing Keys = nível ORG (certs públicos). NÃO há "API Key da org". A org **autentica integridade do pacote** via cert (assinatura `.dpkg` validada no publish); o usuário **autentica identidade** via API Key própria.
- **Multi-tenant:** org em `/profiles/<slug>` (slug **imutável**), 2 roles confirmadas (`Administrator` full + `Collaborator` read-only em signing keys), convites por email TTL **48h**, email da org separado dos membros com fluxo `Not verified`/`Resend`, 2 settings (`Allow contact` + `Notify on publish`).
- **Bloqueio operacional descoberto:** portal PubDelphi **não envia email transacional** hoje — qualquer fluxo de convite/verificação precisa provider (Resend / Postmark / Supabase Edge Functions). É pré-requisito para esta frente.

**Why (revisado):** o eixo **Signing Keys per-org** é o que mais alinha com a estratégia SBOM/CRA — assinatura criptográfica + SBOM = pacote confiável (cobre `Author of SBOM Data` do NTIA + requisito de integridade do CRA). **Recomendação forte: fundir esta frente com a frente SBOM no v7** (mesmo Epic ou 2 Epics fortemente acoplados — não tratar como tracks separadas). Multi-tenancy puro (org + members + invites) é menos urgente; Signing Keys + SBOM são a oferta integrada que justifica o v7.

**How to apply:** ao planejar v7 com `/architect` A1, propor um Epic "Supply-chain trust" que inclui (a) Signing Keys per-org + verificação no publish, (b) SBOM no publish (já planejado), (c) modelo de org mínimo só para suportar Signing Keys. Membros / convites / UI rica podem ficar em Epic adicional posterior, condicionado ao provider de email transacional. Detalhes completos da UI inspecionada em `.project/project-evolution.md` → Potential improvements (entrada DPM Gallery 2026-06-04).

## Pontos de decisão já fechados (ver [[project-sbom-strategy]])

- Library + adapter (não fork-com-camada-dentro)
- Mudança nasce no nosso CLI; upstream é cortesia
- Particularidades PubDelphi (BOSS, workspace, portal) nunca vão para upstream
- Portal = registry agnóstico, não gera SBOM de terceiros
