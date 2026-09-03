# Roadmap — PubPascal-Dev

> A centralized package and project directory web portal for Delphi, Lazarus, C++ Builder, and RAD Studio.

**Last updated:** 2026-06-04 (Phase 7 seed registered: Workspace DAG builder with package library panel + drag-and-drop; operator-flagged 2026-06-04)

---

## Phases

### Phase 1 — MVP Setup and Infrastructure

**Goal:** Establish project setup, database schema, authentication, and deployment.
**Target:** Q2 2026

- [ ] Next.js base project initialization and deployment
- [ ] Supabase database schema design (packages, ads, partners, users)
- [ ] Supabase Auth integration

---

### Phase 2 — Catalog, Search, and Details

**Goal:** Create dynamic pages to search, view details, and showcase projects.
**Target:** Q2 2026

- [ ] Home Page layout with filters
- [ ] Search results page with highlighted search results
- [ ] Project details pages with tabs (Readme, Changelog, Example, Installing, Versions, Scores)
- [ ] UX: remover "Buscar Pacotes" do menu (busca já no hero da home) + manter acesso discreto ao catálogo — Epic 7/7 ad-hoc (em pipeline 2026-05-29)
- [ ] Likes (curtidas por usuário autenticado) + contagem de curtidas no card/detalhe — Epic 9/9 ad-hoc Demand 4/6 (em pipeline 2026-05-30)
- [ ] Conteúdo curado por aba (Example + Installing) — formulários no `/publish` + dashboard edit, render curated-first nas abas — Epic 9/9 ad-hoc Demand 6/6 (em pipeline 2026-05-30; última demanda do Epic 9 e da Roadmap v2)

---

### Phase 3 — Validation Pipeline (Esteira) and Commercial/Partnerships

**Goal:** Implement package publishing forms, pipeline validation, ads, and partnerships.
**Target:** Q3 2026

- [ ] Submission form for package URLs
- [ ] GitHub Actions Validation Pipeline (Esteira)
- [ ] Validation status updates integration
- [ ] Discreet advertisement spaces setup
- [ ] Partner management and display section
- [ ] Publish-time validation framework — pluggable validator registry + runner fired from `/publish`, lenient launch (records verdict, no hard block) — Epic 1/1 v3 Demand 1/2 (em pipeline 2026-05-30, ESP-002)
- [ ] README gate (first publish-time rule) + publisher surfacing en/pt-BR — Epic 1/1 v3 Demand 2/2

---

### Phase 4 — Workspace & Multi-Repo Dev (Roadmap v4)

**Goal:** Make multi-repo maintenance a first-class portal capability — a Workspace DAG of portal packages + private external repo links, ref-pinned, exported as a manifest the future Delphi CLI consumes.
**Target:** Q3 2026

- [x] Workspace foundation — schema/RLS + CRUD UI + form-based dependency editor (Epic 1/6) — delivered v0.13.0 2026-05-31
- [x] Private external repo links + node binding + public privacy resolution (Epic 2/6) — delivered v0.14.0 2026-05-31
- [x] Visual graph editor — read-only React Flow canvas of the workspace DAG (Epic 3/6 — Demand 1/2) — delivered v0.15.0 2026-06-01
- 📦 Visual graph editor — interactive canvas editing (add/remove nodes + edges, pin refs, cycle rejection) parity with the form editor (Epic 3/6 — Demand 2/2) — COMMITTED 3e73b1e, awaiting /release
- [ ] Manifest export + CLI auth (Epic 4/6)
  - 📦 Manifest export endpoint — versioned JSON (repos, pinned refs, push targets), per-viewer fork resolution (RN-006), public/private enforced; Q7 → distinct manifest, not `boss.json` (Epic 4/6 — Demand 1/2, COMMITTED, awaiting /release, ESP-002/ADR-072/073/074)
  - 📦 CLI auth — scoped revocable manifest-read PAT (hashed-at-rest) + token UI; manifest `route.ts` second auth path (bearer → owner_id, ADR-073/A2 seam); Q "device-flow / PAT" → PAT MVP (Epic 4/6 — Demand 2/2, COMMITTED ae3ef90, awaiting /release, ESP-002/ADR-075/076/077/078) — last demand of Epic 4, HARD GATE satisfied
- [ ] Delphi CLI — auth + clone + Boss-orchestrated install (Epic 5/6) — **HARD GATE satisfied 2026-06-01 (Epics 1–4 ✅ Done); first CLI Epic.** Delivery model resolved (Q8 → ADR-079): a **separate Delphi CLI that shells out to `boss`** (complements, never replaces it — per v4 intent + RN-010); upstream-into-Boss rejected.
  - 📦 Delphi CLI scaffold — project structure + registry-driven command/arg parsing + fail-soft config store (`portalBaseUrl` default + reserved `authToken`, no git push credential RN-007); built-in `help`/`version`; reserved stubs for `login`/`clone`/`status`/`update`/`push`; no network/git/`boss`-spawn. First Delphi demand — `Active stacks: delphi` registered (Epic 5/6 — Demand 1/3, COMMITTED 5d56679 awaiting /release, ESP-002/ADR-079/080/081/082)
  - 📦 `login` (PAT-paste to portal) + `clone <workspace>` — fetch manifest via bearer GET, `git clone` every repo at its pinned ref into one workspace folder; per-repo fail-soft. First network + git use in the CLI; device-flow deferred (PAT MVP, ADR-084); push/`writable` ignored (Epic 6); no boss (Demand 3/3) (Epic 5/6 — Demand 2/3, COMMITTED 539e97d awaiting /release, ESP-002/ADR-083/084/085/086)
  - [ ] Per-repo `boss install` orchestration after clone — delegate dependency install + Delphi IDE search-path setup to Boss (RN-010) (Epic 5/6 — Demand 3/3)
- [ ] Delphi CLI — status/update/push routing (Epic 6/6, gated on Epics 1–4) — **HARD GATE satisfied; Epic 5 released v0.16.0.**
  - 📦 `status` + `update` across all workspace repos — manifest-driven, fast-forward-only sync; two new Core seams `GitClient` (git read/sync over `ProcessRunner`, no `push`) + `WorkspaceContext` (shared config/manifest/folder preamble). `status` = per-repo branch/dirty/ahead-behind (local-by-default, `--fetch` opt-in); `update` = dirty/diverged skip-with-guidance + branch `pull --ff-only` / tag `fetch`+`checkout`, never clobber. No `git push` (Demand 2/2) (Epic 6/6 — Demand 1/2, COMMITTED f3d727f awaiting /release, ESP-002/ADR-090/091/092/093)
  - 📦 `push` with routing (RN-008) — push only to writable/fork targets; upstream-bound nodes read-only, refused with guidance to register a fork-link. Adds the withheld git write surface `GitClient.Push` (no force ever — relies on git's native non-ff rejection); consumes the dormant `Writable`/`PushUrl` manifest fields; mirrors status/update (`WorkspaceContext` preamble), dpr/registry untouched; fork→upstream PR deferred (Q6). **Last demand of Epic 6 and Roadmap v4** (Epic 6/6 — Demand 2/2, COMMITTED bc47c2e awaiting /release, ESP-002/ADR-094/095/096/097)

---

---

### Phase 5 — Workspace Maturity (Roadmap v5)

**Goal:** Duas frentes paralelas — tornar o portal workspace realmente utilizável (UX graph-first) e aprofundar o CLI como ferramenta de co-desenvolvimento multi-repo (estado local, codename branching, PR assist, test scaffold).
**Target:** Q3 2026

- [ ] **Portal Workspace UX redesign** (Epic 1/4)
  - 📦 1/2 — Lista → cards + botão "Create Workspace" → página própria com cabeçalho + canvas como interface principal (Workspace list cards + dedicated Create page — COMMITTED c625b4d, awaiting /release, ESP-002/ADR-098/ADR-099)
  - [ ] 2/2 — Sidebar no canvas com Add Node / Add Link via popups; remover formulários empilhados; edges por arrastar
- [ ] **Context-aware CLI + local state** `.pubpascal/` (Epic 2/4)
  - 📦 1/2 — `clone` grava workspace-local `.pubpascal/state.json` + `manifest.json` (cache byte-faithful); `status`/`update`/`push` auto-detectam o workspace via upward-walk → `<workspace-id>` opcional + fallback offline ao cache. CLI-only, sem portal/schema/dependência; distinto do global `~/.pubpascal/config.json` (COMMITTED beb8b2b, awaiting /release — ESP-002/ADR-104/105/106/107)
  - 📦 2/2 — `clone --codename <name>`: cria branch `<base>-<codename>` em nós Writable+branch/default (base = HEAD), persiste o codename em `state.json`; `push` lê o codename e empurra as branches (origin `-u` / fork nomeado); read-only + pinned ficam no ref sem branch. Constrói sobre o state da Demand 1/2 + `TGitClient`/push routing do Epic 6; **nunca força** (ADR-097). `--codename` registrado como value-flag no `ArgParser`. CLI-only, diff ⊆ `cli/` (6 arquivos), `pubpascal.dpr`/registry intocados. **Última demanda do Epic 2** (COMMITTED 8d2f864, awaiting /release — ESP-002/ADR-108/109/110/111)
- [ ] **fork→upstream PR assist** (Epic 3/4 — 🔄 Active)
  - 🔄 1/1 — Após push bem-sucedido ao fork, imprime o link compare fork→upstream (`…/compare/<base>...<forkOwner>:<head>?expand=1`) e, com `--open-pr`, abre via o `gh` do usuário (fail-soft). Novo `PrLink` (puro, GitHub-only) + `GhRunner` (espelha `BossRunner`); gatilho `prPushed`∧writable∧fork; base = strip `-<codename>` senão default. Sem novo `git push`/force (ADR-097), sem `ArgParser`, sem credencial no CLI (RN-007/RN-010). Fecha Q6 deferido de v4. In pipeline 2026-06-02 (ESP-002/ADR-112/113/114/115)
- [ ] **CLI convergence + test scaffold** (Epic 4/4)
  - [ ] 1/2 — Refatorar `clone` para usar `WorkspaceContext` (debt A8)
  - [ ] 2/2 — Test scaffold DUnitX: projeto de teste + primeiros casos para guards de `Execute`

---

### Phase 6 — Production Hardening & Quality (Roadmap v6)

**Goal:** Pay down the biggest production risks before adding features — portal test suite (0% app tests today), security headers, abuse/rate-limiting, Dependabot audit, i18n correctness (debt #41), and T2/T3 structural-debt (DRY, component splitting).
**Target:** Q3 2026

- [ ] **Portal test foundation** (Epic 1/4)
  - 📦 D1/2 — Vitest harness + config + `test` script + unit tests for pure functions: `slug`, `stripMarkdown`, `searchParams`, `github`, `pubPoints`, publish-validation rules. Closes Q1. (COMMITTED 79d7722, awaiting /release)
  - [ ] D2/2 — Key component/render tests (React Testing Library) + CI coverage gate (`vitest --coverage`, threshold enforcement).
- [ ] **Security & abuse hardening** (Epic 2/4 — 🔄 Active)
  - 📦 D1/3 — Security headers in `next.config.ts` via `async headers()`: enforced pragmatic CSP (strong everywhere except `script-src`/`style-src` `'unsafe-inline'`, required by Next inline bootstrap) + HSTS (2y preload) + X-Frame-Options DENY + Referrer-Policy + deny-list Permissions-Policy + nosniff. Static/ISR preserved (no nonce — strict nonce CSP deferred as follow-up); Supabase https+wss origins env-derived. Closes the T3 "no security headers" debt. COMMITTED ca1e43a/9694dd8, awaiting /release (ESP-002/ADR-128/129/130/131).
  - 🔄 D2/3 — Rate limiting on portal-owned sensitive routes (publish, cli-token, manifest) + partner-apply anti-spam. **Store = Upstash Redis via Vercel Marketplace** (`@upstash/ratelimit` sliding window; Vercel KV discontinued); **anti-spam = Cloudflare Turnstile** server-verify + per-IP throttle. Fail-open. Auth login/register run client-side (browser→Supabase) → delegated to Supabase Auth native limits + named follow-up (server-side auth gateway). In pipeline 2026-06-03 (ESP-002/ADR-132/133/134/135).
  - [ ] D3/3 — Dependabot advisory audit + safe dependency bumps.
- [ ] **i18n correctness** (Epic 3/4 🔄 Active)
  - 📦 D1/2 — `localizedHref(path, locale)` helper threaded through `Header`, `Footer`, `PackageCard`, `PackageListRow`, `PackageMetaSidebar`; closes EN locale-loss debt #41. COMMITTED 70b078e, awaiting /release (ESP-003/ADR-141/142/143)
  - [ ] D2/2 — Hardcoded PT strings ("Destaque Gold/Silver/Bronze", "Planos de Destaque") moved to `dictionaries/`.
- [ ] **Structural DRY & maintainability** — centralize compact-number formatter (4 copies) + SQL column consts + admin form consts (Epic 4/4 D1/2); split `Header.tsx` + `PackageSubmitForm.tsx`, tighten ESLint, converge package row types (Epic 4/4 D2/2).

---

---

### Phase 7 — Workspace DAG Builder (Roadmap v7 seed)

**Goal:** Redesign the workspace editor UX from popup-based node addition to a drag-and-drop package library experience — a searchable left panel of registry packages that you drag onto the React Flow canvas to build your dependency tree.
**Target:** post-v6 (to be confirmed at Roadmap v7 A1 planning)

- [ ] **Package library panel + drag-and-drop placement** — `WorkspacePackageLibrary` fixed left panel with search input + draggable package cards; drop onto canvas calls existing `addWorkspaceNode` action; auto-layout via `graph-layout.ts`; edge creation by dragging between node handles (React Flow native `onConnect` → `addWorkspaceEdge`). Zero new dependencies (`@xyflow/react` already installed). Zero schema/migration changes. Prerequisite: W1 (Add Node bug fix).
- [ ] **Ref pin inline + manifest YAML view** — inline badge/popover per node to edit `ref_type`/`ref_value` (new `updateWorkspaceNodeRef` Server Action; absorbs ADR-071 deferred item); optional YAML/JSON manifest panel (uses existing `buildManifest` from `src/lib/workspaces/manifest.ts`).
- [ ] **W1–W4 workspace fixes** (details in `project-evolution.md` Potential improvements — W1 Add Node bug; W2 hierarchy surfacing; W3 version-pin surfacing; W4 public workspace import + "Import to my profile") — to be absorbed into Epic structure at v7 A1 planning.

---

## Backlog

Items identified but not yet prioritized:

- TBD

---

## Sprint log

Each sprint documented by `/sprint` is recorded here.
`/sprint` ticks the corresponding item when closing a round.

- [ ] Sprint 1 — Initial Setup & Infrastructure — 2026-05-27
