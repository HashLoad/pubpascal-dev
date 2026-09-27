---
name: project-packages-todo
description: Backlog do domínio de PACOTES do portal (o pub.dev do Delphi) — o que
  está BUILT vs GAPS, priorizado. Mapeado por Explore em 2026-06-09. O núcleo é forte;
  isto são os gaps.
metadata:
  node_type: memory
  type: project
  originSessionId: 8772b5dd-efcb-4be6-8447-e646ecbede3a
type: project
---
# Backlog de PACOTES (mapeado 2026-06-09)

**Contexto:** o operador lembrou que enquanto mergulhávamos em workspace/CLI/IDE, o CORAÇÃO (a experiência de pacotes pub.dev-style) precisa de um TODO. Mapeamento completo confirmou: **o núcleo está forte** (catálogo c/ busca+filtros+paginação, página de detalhe de 6 abas [README/Changelog/Example/Installing/Versions/Scores/Reviews], Pub Points 0-100, likes, stars live, badge CRA-ready, publish c/ 11 campos + README gate). Os itens abaixo são GAPS.

## ⚡ Quick wins (alto valor / baixo esforço)
1. ✅ **FEITO (commit `5342090`, develop):** as 7 regras de validação implementadas (`has_changelog/installing/examples/images/pascal_sources/license/repo_clonable`) seguindo o padrão `rules/` (1 arquivo+teste por regra, `PublishValidator{key,run}` via `ctx.fetchRepoFile`, helper `shared.ts` DRY). **Pub Points agora é REAL.** 220 testes (+33), tsc/lint/build OK. Restrição honesta: raw fetch não lista diretório → regras de listagem sondam paths convencionais + degradam pra warn.
2. ✅ **FEITO (commit `ca35eb1`, develop):** seletor de ordenação (Relevância/Mais novos/Mais estrelas/Nome A-Z). Aplica DENTRO do tier (preserva promoção gold/silver/bronze). `SortSelect` client + `applySort` na query + searchParams + i18n. Provado: `?sort=name` → tier no topo, untiered alfabético. 226 testes.
3. ✅ **FEITO (commit `477705b`, develop):** facet de **categorias** (taxonomia de 15: ORM/Database/JSON/REST/UI/FMX/Testing/...) espelhando platforms/languages em tudo. Coluna `packages.categories TEXT[]` (**migration `20260609150000` aplicada na base LIVE via supabase CLI repair+push** — operador deu OK de pé pra migrations aditivas; cache PostgREST recarregado via NOTIFY). Filtro `contains` provado live (set ORM→retornou→revertido). Forms publish+edit, chips clicáveis, ActiveFilterChips, i18n. 226 testes. **Como aplicar migration daqui pra frente:** `supabase migration repair --status applied <todas antigas>` (histórico estava vazio) depois `supabase db push` aplica só a nova. Senha do DB está no keychain do CLI (não no pooler-url, que tem placeholder).

## 🎯 Diferencial CRA/SBOM (a lei europeia — subaproveitado)
4. 🔶 **AVANÇADO — CRA-readiness COMPOSTO (commits `d71b25d` + `e40e5e0`, develop):** a visão é o PubDelphi = **camada de CONFIANÇA do ecossistema** (não "tem SBOM", mas "confiável: SBOM✓ sem-CVE✓ política✓ mantido✓"). Feito: `SbomCompliancePanel` (metadata do SBOM) + **`CraReadinessPanel`** (checklist composto na sidebar, "{met} of 3"): **SBOM** (presença) + **política de segurança** (`fetchSecurityPolicyPresence` sonda SECURITY.md) + **mantido** (`repoMeta.pushed_at` < 18 meses, novo campo). Lib pura `src/lib/cra/readiness.ts` + 8 testes. Provado: Nidus = 1/3 (mantido✓). **FALTA o 4º sinal: vuln scan** (o CLI JÁ tem `pkg scan` OSV.dev — falta armazenar os resultados + surfaçar advisories, igual o upload de SBOM). Depois: tool identity no SBOM, cadeia de deps. Ver [[project-sbom-strategy]].
5. **Gate de SBOM no publish** (opcional/lenient primeiro) — exigir/incentivar SBOM na publicação, fortalecendo o selo de compliance.

## 🔗 Liga com workspace/CLI
6. **Modelo de dependências declaradas** do pacote (`declared_dependencies` JSONB c/ version specifiers). Hoje o pacote não declara suas próprias deps — só o workspace tem o DAG. Ligaria pacote↔workspace↔SBOM.
7. **`pkg publish` no CLI** — publicar/registrar versão é só pela UI (`/publish`). Sem caminho CLI-first (só `publish-sbom`). Ver [[project-execution-plan]].

## 🧹 Ciclo de vida do pacote (gestão)
8. **Deprecation / yank / transfer / delete** — `/dashboard/packages/[id]/edit` só edita ~8 campos. Falta: marcar obsoleto, esconder versão, trocar publisher (com auditoria), soft-delete.
9. **Campos faltando no modelo**: maturity/stability, docs links além de repo/website, security_contact, funding, contributing guide, screenshots.

## 📊 Stats (mínimo hoje)
10. **Uso real**: `downloads` é sempre 0 (nada hospedado → sem ponto natural de instrumentação). Rastrear o que dá: cliques pro repo/website, **downloads de SBOM**, impressões na lista. (`likes` já existe como sinal social.)

**Prioridade sugerida:** #1 (regras → Pub Points real) + #4 (narrativa CRA) primeiro — fortalecem o que JÁ tem UI + o diferencial. Depois #2/#3 (descoberta). #6/#7 ligam ao workspace.
