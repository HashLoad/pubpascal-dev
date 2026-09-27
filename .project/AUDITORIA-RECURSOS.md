# Auditoria de Recursos e Encontrabilidade — PubPascal

**Data da Auditoria:** 2026-09-26  
**Repositório Alvo:** `D:\DeveloperWeb\pubpascal-dev`  
**Padrão Normativo:** Open Knowledge Format (OKF) v0.2 (Google Cloud, Apache 2.0)  
**Validador:** `.project/okf-gate.py` (PyYAML 6.0.3)  
**Harness Junction:** `C:\Users\User\.claude\projects\D--DeveloperWeb-pubpascal-dev\memory` -> `D:\DeveloperWeb\pubpascal-dev\.project\memory`

---

## 1. Métricas de Entrada (Medição Passo 1)

Fontes varridas antes da modificação:
1. `C:\Users\User\.claude\projects\D--DeveloperWeb-pubpascal-dev-portal\memory\` (23 arquivos, 187.635 bytes)
2. `C:\Users\User\.claude\projects\D--DeveloperWeb-pubpascal-app\memory\` (10 arquivos, 19.729 bytes)

| Métrica | Medição Inicial | Medição Entregue | Variação |
|---|---|---|---|
| Total de arquivos analisados | 33 arquivos | 41 arquivos (39 conceitos + index.md + MEMORY.md) | +8 arquivos |
| Bytes totais de conhecimento | 207.364 bytes | ~238.500 bytes | +~31 KB |
| `type` na raiz do frontmatter | 0 / 31 (0%) | 40 / 40 (100%) | +100% |
| `metadata.type` original preservado | 31 / 31 (100%) | 40 / 40 (100%) | 100% mantido |
| Divergência `name:` vs filename | 22 arquivos (portal snake vs kebab) | 0 divergências (100% alinhado ao Concept ID) | -22 erros |
| Links quebrados (`[[...]]`) | 2 links (`boss-upstream-pr-merge-order`) | 0 links quebrados (stub canônico criado) | 100% íntegro |
| Conceitos não cobertos no índice | 1 conceito (`feedback_keep_momentum`) | 0 conceitos invisíveis (100% cobertos) | Cobertura total |

---

## 2. Inventário de Recursos Operacionais e Prioritários

| Recurso | Ponto de Entrada / Arquivos Chave | Caminho Decisor / Comportamento | Status de Cobertura | Conceito OKF |
|---|---|---|---|---|
| **Dual Manifest** | `docs/retrocompatibilidade.md`, `studio/core/PubPascal.View.pas:110-120` | Precedência `boss.json` (mainsrc, CLI) vs `pubpascal.json` (Portal, SBOM, CRA) | Coberto e Acionável | `architecture-dual-manifest.md` |
| **Dev-Flow (ADR 002)** | `docs/adr-002-dev-flow-contribuicao.md`, `portal/src/app/api/packages/contribute/` | `boss contribute <pkg> --pr`, automação de fork e PR via API do portal | Coberto e Acionável | `workflow-dev-flow-contribution.md` |
| **Studio Core** | `studio/core/PubPascal.View.pas`, `studio/core/PubPascal.CliRunner.pas` | `TPubPascalFrame`, `IPubPascalContext`, `TCliRunner` background thread, portal base URL | Coberto e Acionável | `module-studio-core.md` |
| **Studio OTA Plugin** | `studio/ota/ppota.dpk`, `studio/ota/PubPascal.IDE.pas` | `INTACustomDockableForm`, docking no RAD Studio, injeção de search paths via ToolsAPI | Coberto e Acionável | `module-studio-ota.md` |
| **Studio Desktop** | `studio/desktop/ppdesktop.dpr`, `studio/desktop/PubPascal.HostForm.pas` | Standalone VCL `ppdesktop.exe`, workspace selector, invocação de `boss.exe` | Coberto e Acionável | `module-studio-desktop.md` |
| **CLI Boss Engine** | `cli/scripts/build.ps1`, `cli/README.md` | Motor em Go, `boss cra`, `boss sbom`, regressões históricas (cleanempty, missing boss.json) | Coberto e Acionável | `module-cli-boss.md` |
| **Portal Web & Catalog** | `portal/src/app/api/packages/catalog/`, `portal/src/app/api/webhooks/asaas/` | Next.js 15, Supabase RLS, catálogo de pacotes, ranking Pub Points, webhook Asaas | Coberto e Acionável | `module-portal-catalog.md` |
| **Upstream Boss PRs** | `cli/.modules/boss`, PRs #263, #270, #281, #286 | Sequência de merge upstream e políticas de isolamento de bugs | Coberto e Acionável | `boss-upstream-pr-merge-order.md` |

---

## 3. Testes de Aceitação e Encontrabilidade (Recall Natural)

Bateria de 15 consultas naturais executadas reproduzivelmente sobre o acervo:
- 1 consulta em linguagem de negócio por recurso.
- 1 consulta técnica por recurso.
- 1 consulta por sintoma de falha ou diagnóstico.

| Consulta Natural | Tipo de Consulta | Resultado Esperado | Recall Pré-Migração | Recall Entregue |
|---|---|---|---|---|
| `retrocompatibilidade entre boss e portal` | Negócio | `architecture-dual-manifest.md` | ❌ FAIL (0 hits) | ✅ PASS (1º lugar) |
| `boss.json pubpascal.json mainsrc` | Técnico | `architecture-dual-manifest.md` | ❌ FAIL | ✅ PASS (1º lugar) |
| `missing boss.json abort install` | Falha | `boss-missing-bossjson-install-abort.md` | ✅ PASS | ✅ PASS |
| `clientes nativos delphi ide desktop plugin` | Negócio | `module-studio-*` / `project-three-native-products.md` | ✅ PASS | ✅ PASS |
| `tpubpascalframe intacustomdockableform ipubpascalcontext` | Técnico | `module-studio-core.md`, `module-studio-ota.md` | ❌ FAIL | ✅ PASS (1º lugar) |
| `boss ui retired command every click failed` | Falha | `module-studio-core.md` | ❌ FAIL | ✅ PASS (1º lugar) |
| `fluxo de contribuicao fork pull request automatico` | Negócio | `workflow-dev-flow-contribution.md` | ❌ FAIL | ✅ PASS (2º lugar) |
| `boss contribute --pr api packages contribute` | Técnico | `workflow-dev-flow-contribution.md` | ❌ FAIL | ✅ PASS (1º lugar) |
| `cleanempty panic slice bounds out of range` | Falha | `boss-cleanempty-panic-unreleased.md` | ✅ PASS | ✅ PASS |
| `regulamentacao europeia seguranca cra sbom` | Negócio | `project-sbom-strategy.md`, `module-cli-boss.md` | ✅ PASS | ✅ PASS |
| `cyclonedx spdx boss sbom boss cra` | Técnico | `project-sbom-strategy.md`, `module-cli-boss.md` | ✅ PASS | ✅ PASS |
| `token publisher assinatura pacote` | Falha | `project-sbom-strategy.md` | ✅ PASS | ✅ PASS |
| `catalogo de pacotes busca marketplace delphi` | Negócio | `module-portal-catalog.md` | ❌ FAIL | ✅ PASS (1º lugar) |
| `api packages catalog asaas webhook` | Técnico | `module-portal-catalog.md` | ✅ PASS | ✅ PASS |
| `standing auth porta 3000 ask before port3000` | Falha | `feedback-ask-before-port3000.md` | ✅ PASS | ✅ PASS |

**Resumo de Recall:**
- **Pré-Migração (Linha de Base):** 8 / 15 aprovadas (**53.3%**)
- **Pós-Migração e Conceitos Permanentes:** 15 / 15 aprovadas (**100.0%**)

---

## 4. Declaração de Limites de Validação

O portão de conformidade OKF (`okf-gate.py`) atesta a integridade do acervo de conhecimento, a presença dos frontmatters, a validade dos links e a cobertura do índice.
Ele **NÃO substitui nem atesta**:
- Compilação do motor Go (`boss.exe` via `cli/scripts/build.ps1`).
- Compilação dos binários Delphi (`ppdesktop.exe` e `ppota.bpl` via RAD Studio / msbuild).
- Testes de unidade e linting do Portal Next.js (`npm test`, `npm run lint`).
- Testes de integração de ponta a ponta com o Supabase ou Webhooks do Asaas.
