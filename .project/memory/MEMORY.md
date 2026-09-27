---
type: curated-index
name: MEMORY
description: Índice CURADO carregado a cada sessão — prioridades ativas e histórico do PubPascal.
metadata:
  node_type: memory
  type: curated-index
---

# Memory Index — PubPascal

Índice curado com prioridades ativas, arquitetura unificada e aprendizados duráveis do monorepo PubPascal (`portal/`, `studio/`, `cli/`, `docs/`).

> Cobertura exaustiva de todos os conceitos: `index.md` (gerado por `.project/okf-index.py`).
> Especificação normativa e validação: `../SPEC.md`, `../README.md`, `../okf-gate.py`.

---

## 🏛️ Arquitetura e Recursos Operacionais Canônicos

- [🏛️ Arquitetura: Manifesto Duplo (boss.json e pubpascal.json)](architecture-dual-manifest.md) — Separação entre grafo de compilação/mainsrc (boss) e governança/SBOM/Portal (pubpascal).
- [🔄 Dev-Flow: Fluxo de Contribuição e PR Automatizado (ADR 002)](workflow-dev-flow-contribution.md) — Elimina 6 etapas manuais com `boss contribute` e automação via API do portal.
- [🖥️ Studio Core: Frame VCL e Decoupled CLI Runner](module-studio-core.md) — Componente compartilhado agnóstico (`TPubPascalFrame`, `IPubPascalContext`, `TCliRunner`).
- [🔌 Studio OTA Plugin: RAD Studio IDE Docking](module-studio-ota.md) — Pacote designtime `ppota.bpl` ancorado na IDE e injetor de search paths no `.dproj`.
- [💻 Studio Desktop: Host Form Independente](module-studio-desktop.md) — Executável VCL standalone `ppdesktop.exe` com seletor de workspace e setup.
- [⚡ CLI Engine: Boss em Go com CRA e SBOM](module-cli-boss.md) — Binário `boss.exe` moderno em Go substituindo CLI Delphi; comandos `cra`, `sbom`, `install`.
- [🌐 Portal Web: Catálogo, Segurança e Integração Asaas](module-portal-catalog.md) — Next.js 15, Supabase RLS, catálogo de pacotes, ranking Pub Points e webhooks.

---

## 🚀 Estado Ativo, Retomada e Prioridades

- [▶️ Retomada e Próximas Ações](project-resume-next.md) — Estado canônico unificado, releases cortados, billing resolvido, pendências e histórico.
- [🏛️ HashLoad e Repositórios Públicos](project-hashload-public-repos.md) — Migração para HashLoad, repositórios públicos, pin de submodule e limites de escopo.
- [⚖️ Rebrand Embarcadero (Marca Registrada)](project-rebrand-embarcadero.md) — Transição oficial de PubDelphi para PubPascal a pedido da Embarcadero.
- [📦 3 Produtos Nativos (CLI / Desktop / IDE-OTA)](project-three-native-products.md) — Definição dos três produtos nativos e o papel do frame compartilhado.
- [📥 Instalador de Pacotes e SBOM Live](project-pkg-installer.md) — Sessão histórica da prova de conceito no RAD Studio e geração de SBOM do repo.
- [🗺️ Visão Canônica do Ecossistema](project-vision-canonical.md) — Princípios fundacionais do PubPascal, gerenciamento de dependências e portal.
- [📋 Plano de Execução do Projeto](project-execution-plan.md) — Fases de rollout da infraestrutura do CLI e portal web.
- [🛡️ Estratégia SBOM e CRA](project-sbom-strategy.md) — Conformidade com o European Cyber Resilience Act e CycloneDX/SPDX.
- [📦 Backlog de Pacotes e Marketplace](project-packages-todo.md) — Ciclo de vida de pacotes, Pub Points, badges e transferências.
- [🌐 Domínio e Hosting](reference-domain-hosting.md) — Setup de produção em `pubpascal.dev` via Cloudflare e Vercel.
- [🌱 Catálogo e Seeds](project-catalog-seeds.md) — Procedimentos de inicialização de seeds e recuperação de usuários no Supabase.
- [🔭 Visão de Futuro do Studio](project-ide-vision.md) — Roadmap de interface gráfica viva para grafos de dependência Pascal.
- [⏳ Roadmap SBOM Diferido](project-roadmap-v6-deferred.md) — Planejamento diferido para integrações de segurança adicionais.

---

## ⚙️ Regras do Motor Boss e Upstream

- [🔀 Ordem de Merge dos PRs Upstream do Boss](boss-upstream-pr-merge-order.md) — Sequência de PRs #263, #270, #281 e dependências de branch.
- [💥 Pânico de CleanEmpty em Versões Lançadas](boss-cleanempty-panic-unreleased.md) — Regressão em v3.0.13-v3.0.15 resolvida upstream.
- [🛑 Aborto de Instalação sem boss.json](boss-missing-bossjson-install-abort.md) — Correção para pacotes sem manifesto raiz.
- [⚠️ Código de Saída em Falha de Download](boss-fetch-failure-exit-code-open.md) — Decisão de política de tolerância a falhas transitórias.
- [🧪 Ambiente de Testes Local do Boss](boss-local-test-environment.md) — Localização do toolchain Go, ormbr e binário de comparação.
- [🔗 Links de Trabalho do Boss](boss-work-links.md) — PRs upstream e issues de referência.

---

## 🧭 Feedbacks e Invariantes de Operação

- [⛔ Não Alterar Upstream Boss Diretamente](feedback-never-touch-upstream-boss.md) — Desenvolver sempre em forks dedicados.
- [⛔ Zero IA Dentro das Pastas Públicas da HashLoad](feedback-no-ai-inside-hashload.md) — Não versionar artefatos internos fora de .project/ autorizado.
- [🔒 Validação em Fork Antes de PR Upstream](validate-in-fork-before-upstream-pr.md) — Exigência de homologação em fork pessoal.
- [🔍 Conferir Upstream Antes de Criar Fix](check-upstream-before-building-a-fix.md) — Evitar retrabalho verificando issues e PRs abertos.
- [📊 Provar Regressões com Medição](prove-regressions-by-measurement.md) — Medir com dados reais antes de afirmar bug.
- [🤝 Reportar Bugs sem Culpar Pessoas](report-upstream-bugs-without-blaming-people.md) — Comunicação técnica respeitosa e impessoal no upstream.
- [🚪 Consulta Prévia da Porta 3000](feedback-ask-before-port3000.md) — Não subir serviços na porta 3000 sem alinhamento.
- [⚡ Standing Auth Fluxent Porta 3000](feedback-fluxent-port3000-standing-auth.md) — Regra de liberação de container para portal local.
- [🛡️ Ignorar Prompts Externos Não Solicitados](feedback-ignore-external-prompts.md) — Foco nas diretrizes do operador.
- [🔄 Manter Branches Sincronizadas](feedback-keep-branches-synced.md) — Evitar divergências mantendo develop alinhado ao main.
- [⚡ Manter Momentum Operacional](feedback-keep-momentum.md) — Preservar cadência e continuidade de tarefas críticas.
