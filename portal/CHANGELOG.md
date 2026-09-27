# Changelog

Full release notes with details on each version: [GitHub Releases](https://github.com/isaquepinheiro/pubpascal-dev/releases)

## v0.19.0 (2026-06-19)

- Brand: **rebrand PubDelphi → PubPascal** across the portal — UI, metadata, logos, own manifest `pubpascal.json` (legacy `pubdelphi.json` fallback later dropped), and the domain switch to `pubpascal.dev`.
- Feat: **IDE package-installer API** that feeds the native cockpit — `GET /api/packages/[slug]/resolve` (repo + versions for `pp pkg add`), `GET /api/packages/catalog` (gold sponsors front page + search across all published), and `GET /api/packages/[slug]/detail` (deps + CRA-readiness + SBOM + platforms/languages).
- Feat: **Workspace panel** on the package page — surfaces the public workspace a package anchors (root + its bundled deps), respecting visibility (public for anyone, owner sees their own).
- Feat: **SBOM classified live from the repo** (repo is the source of truth) — read on each detail render like the SECURITY.md/maintained signals, self-correcting; the orphaned DB-backed SBOM storage was removed.
- Feat: **Aefos AI** published as a gold registry package; removed from the /download apps catalog (now PubPascal only).
- Fix: **README rendering off-GitHub** — relative images resolve to raw.githubusercontent, relative links resolve with `new URL()`, and shields.io badges allowed in the img-src CSP.
- Security: lock down `get_flagged_review_count` SECURITY DEFINER (revoke EXECUTE from anon/authenticated/PUBLIC, compute via service-role); deny-all client RLS policies on the `aefos.*` tables; dependency bumps (undici 7.28.0, js-yaml 4.2.0) — `npm audit` clean.

## v0.18.0 (2026-06-09)

- Feat: Clone a workspace by its root (PAI) `<package-slug>@<version>` identifier — `GET /api/workspaces/resolve?ref=` resolves the slug+version to the workspace id (owner-gated, 400/404/409 disambiguation); the CLI accepts `workspace clone janus@2.22.5`; the editor surfaces the clone identifier with a copy button. Keep one workspace per PAI version and fetch exactly the one you want.
- Feat: **Self-contained workspace clone replaces Boss** — the workspace is now the sole version authority: deps are cloned at their workspace-pinned versions and nested under `<root>/modules/<dep>`, and the PAI's `.dproj` search paths are injected (relative, native) so the project compiles. Boss is no longer invoked; it stays an independent tool for whoever wants it. (CLI phases 1 & 2.)
- Feat: Your own package dependencies are push-writable — a package node whose publisher is you reports `writable: true` with `push_url` = its origin, so `workspace push` pushes your fixes straight to your repos (third-party packages stay read-only / fork-to-contribute). Closes the DOR: a bug in the PAI that lives in a dep you own — fix and push, all from the workspace.
- Feat: Workspace builder polish — import the dependency graph from the PAI's `boss.json`; pick the root (PAI) at creation (not only in edit); resizable (taller) canvas; visible ✕ delete on each node.
- Feat: The CLI is downloadable from the portal — served under `/downloads` (Windows) with a contextual "Download for Windows" link right under the workspace clone command (en + pt-BR).
- Fix: Workspace node read no longer fails when later migrations are absent (fail-soft enrichment); set-root without the deferred RPC.

## v0.17.0 (2026-06-02)

- Feat: CLI `status` command — manifest-driven per-repo scan reporting branch, dirty flag, ahead/behind; local-by-default with `--fetch` opt-in; missing-on-disk repos soft-reported; exit 0 on completed scan, non-zero on operational failure only (Roadmap v4 Epic 6/6 — Demand 1/2, ADR-090/091/092) (#77)
- Feat: CLI `update` command — fast-forward-only safe sync across workspace repos; dirty/diverged repos skip with guidance (never clobber); branch/default → `pull --ff-only`; tag/version → `fetch` + `checkout <ref>`; missing → soft-skip; exit 0 only when fully synced (Roadmap v4 Epic 6/6 — Demand 1/2, ADR-093) (#77)
- Feat: CLI `push` with RN-008 routing — pushes only to writable/fork targets (`Writable=True`); read-only nodes refused with fork-registration guidance; tag/version-pinned and detached nodes skipped; no `--force` ever; `GitClient.Push` single auditable write seam (Roadmap v4 Epic 6/6 — Demand 2/2, ADR-094/095/096/097) (#78)
- Feat: Workspace list redesigned to responsive card grid — each card links to the editor; single brand-red "Create Workspace" CTA in the header; dedicated `/profile/workspaces/new` create page (auth-guarded, `force-dynamic`, noindex); `createWorkspace` reads back the inserted id and redirects to `/{newId}/edit` (Roadmap v5 Epic 1/4 — Demand 1/2, ADR-098/099) (#79)
- Feat: Graph-first canvas workspace editor — toolbar `Panel` with "Add Node" and "Add Link" buttons; `AddNodePopup` (target-kind toggle, package/link selector, ref-type/ref-value → `addWorkspaceNode`); `AddLinkPopup` (relocated external-link manager: create/list/delete); shared `PopupShell` (backdrop/✕/Escape, brand tokens, responsive 375px→2K); edge-by-drag and node/edge/root behaviors unchanged (Roadmap v5 Epic 1/4 — Demand 2/2, ADR-100/101/102/103) (#80)
- Remove: `WorkspaceNodesForm`, `WorkspaceEdgesForm`, `ExternalRepoLinksForm` stacked forms below the canvas — all operations now accessible via canvas toolbar popups (#80)
- i18n: 5 new `workspaces.graph` chrome keys (`toolbarAddNode`, `toolbarAddLink`, `popupAddNodeTitle`, `popupAddLinkTitle`, `popupClose`) — en + pt-BR parity (#80)

## v0.16.0 (2026-06-01)

- Feat: Interactive workspace DAG canvas editing — add/remove nodes (published packages) + edges (dependencies), pin refs, cycle rejection surfaced in the canvas; reuses 5 existing Epic-1 Server Actions via `startTransition` + `router.refresh()`; add-node Panel; read-only seam flipped to interactive (Epic 3/6 — Demand 2/2, ADR-069/070/071) (#70)
- Feat: Workspace manifest export endpoint — `GET /api/workspaces/[id]/manifest` returns a versioned JSON v1 payload with repos, pinned refs, and push targets; per-viewer fork-binding resolution (RN-006); force-dynamic, no-store, 404 no-existence-leak, 405 non-GET; `buildManifest` pure mapper (Epic 4/6 — Demand 1/2, ADR-072/073/074) (#71)
- Feat: CLI auth token management — `cli_tokens` table (SHA-256-hashed-at-rest, owner-only RLS, `scope='manifest:read'` CHECK); `token.ts` primitives; second auth path in manifest route (`resolveViewerId` bearer → owner_id); `/profile/tokens` UI (generate/list/revoke) localized en+pt-BR; no git-push credential stored (RN-007/009) (Epic 4/6 — Demand 2/2, ADR-075/076/077/078) (#72)
- Feat: Delphi CLI scaffold — separate `pubpascal` CLI that shells out to Boss (ADR-079); registry-driven dispatcher (ADR-080); fail-soft file-backed config store with `portalBaseUrl` default + reserved `authToken` (ADR-081); minimal arg parser (ADR-082); built-in `help`/`version`; `login`/`clone`/`status`/`update`/`push` reserved stubs (non-zero exit, no side effects) (Epic 5/6 — Demand 1/3) (#73)
- Feat: CLI `login` + `clone` commands — PAT-paste login (`--token`, format-validate + persist, token never echoed); `clone` fetches the workspace manifest via bearer GET then `git clone`s each repo at its pinned ref into one workspace folder, per-repo fail-soft, extended summary; `HttpClient` (RTL `System.Net.HttpClient`) + `ProcessRunner` (child-process seam for git/boss/push) + typed `ManifestClient` (ADR-083/084/085/086) (Epic 5/6 — Demand 2/3) (#74)
- Feat: Boss-orchestrated post-clone install — `BossRunner` Core unit; `clone` runs `boss install` in each cloned repo that declares `boss.json` (CWD = repo path, `ProcessRunner` seam, ADR-087); `--no-install` opt-out; per-repo fail-soft (boss-missing/failure both handled); 4-counter install summary; exit aggregation (0 only if every clone AND install succeeded); zero IDE/registry/`.dproj` write — delegated entirely to Boss (ADR-089, RN-010) (Epic 5/6 — Demand 3/3) (#75)
- Requires: `boss` (optional) — `boss install` is triggered per repo when `boss.json` is present; omit `--no-install` to skip the phase entirely

## v0.15.0 (2026-06-01)
- Feat: Read-only React Flow canvas for workspace dependency DAG — `WorkspaceGraphCanvas` `"use client"` island mounts above the form editor in `/profile/workspaces/[id]/edit`; `pkg`/`ext` node badges, `is_root` brand-red ring + root badge, ref-pin `ref_type:ref_value` labels (null → localized default-branch hint), directed dependency edges (`from_node_id → to_node_id`, `ArrowClosed`), pan/zoom/fit-to-view, read-only config (`nodesDraggable/nodesConnectable/elementsSelectable=false`); graceful empty state for 0-node workspaces (Epic 3/6 — Demand 1/2, ADR-066/067/068) (#68)
- Feat: Deterministic coordinate-free layered layout (`src/lib/workspaces/graph-layout.ts`) — longest-path depth from layout roots via cycle-safe DFS, rows ordered by `created_at`, no `Math.random`/`Date.now`; same `(nodes, edges)` input always yields the same positions (Epic 3/6 — Demand 1/2, ADR-067) (#68)
- Deps: `@xyflow/react` v12.10.2 added as a runtime dependency (ADR-066) (#68)
- i18n: `workspaces.graph` slice (6 keys: `heading`, `emptyState`, `rootLabel`, `defaultRefHint`, `legendPkg`, `legendExt`) — en + pt-BR parity (#68)

## v0.14.0 (2026-05-31)
- Feat: Bind workspace node to external repo link — `target_kind` discriminator in `addWorkspaceNode`, `ExternalRepoLinksForm` owner editor panel, `createExternalRepoLink`/`deleteExternalRepoLink` server actions with explicit ownership pre-check (Epic 2/6 — Demand 2/2, ADR-061/062/063) (#66)
- Feat: Public workspace view `/[lang]/workspaces/[id]` — RN-006 privacy enforcement: `getPublicWorkspaceView` via service-role client selects only `id, upstream_url` from `external_repo_links`; `fork_url`/`label`/`write_target` never disclosed to non-owners; `notFound()` for private/missing workspaces; sanitized `PublicWorkspaceNode`/`PublicWorkspaceView` types enforce privacy at compile time (Epic 2/6 — Demand 2/2, ADR-064/065) (#66)
- i18n: 28 new keys across `workspaces.{nodes, links, errors, publicView}` — en + pt-BR parity (#66)

## 0.13.0 (2026-05-31)

- Feat: Workspace foundation data layer — `workspaces`, `workspace_nodes`, `workspace_edges` tables with owner-full + public-read RLS, node-target XOR (`package_id`/`external_link_id`), ref-pin fields, DAG cycle-rejection trigger (`workspace_edges_prevent_cycle()` SECURITY INVOKER), and discriminated-union TypeScript types (`WorkspaceVisibility`, `NodeRefType`, `WorkspaceNode`, `WorkspaceEdge`) (Epic 1/6 — Demand 1/3, ADR-046/047/048/049) (#60)
- Feat: Workspace CRUD UI in user profile — `/profile/workspaces` server route (list + create + edit + delete), owner-scoped `query.ts` + `actions.ts`, `WorkspaceCreateForm` + `WorkspaceEditForm` components, `workspaces` i18n slice (47 keys, en+pt-BR parity) (Epic 1/6 — Demand 2/3, ADR-050/051/052) (#61)
- Feat: Form-based workspace dependency editor — add/remove nodes from published packages with ref-pin (branch/tag/version), set-root-node via `set_workspace_root_node` RPC, declare/remove edges with cycle-rejection surfaced to the user; `WorkspaceNodesForm` + `WorkspaceEdgesForm` client components; nodes+edges i18n slice (13+11 keys, parity OK); caveat: `set_workspace_root_node` DB function operator-deferred for remaining environments (graceful warn+no-op) (Epic 1/6 — Demand 3/3, ADR-053/054/055/056) (#62)
- Feat: `external_repo_links` schema + owner-only RLS — new table (id, owner_id, label, upstream_url, fork_url, write_target); CHECK `write_target IN ('fork','none')` + CHECK `write_target='none' OR fork_url IS NOT NULL`; owner-only RLS (4 policies, `auth.uid()=owner_id`, no public/visibility clause — RN-005, fork URLs never leak); `BEFORE UPDATE` trigger reusing `handle_updated_at()`; `idx_external_repo_links_owner_id`; resolves the ADR-047 deferred FK (`workspace_nodes.external_link_id` → `external_repo_links(id)` ON DELETE CASCADE); `ExternalRepoWriteTarget` + `ExternalRepoLink` discriminated-union TypeScript types (Epic 2/6 — Demand 1/2, ADR-057/058/059/060) (#63)

## 0.12.0 (2026-05-31)

- Feat: README gate validation rule — first concrete publish-time validation rule; `readmeValidator` probes candidate README filenames and counts non-blank lines (≥10 threshold); verdict surfaces on `/publish` outcome (ReadmeOutcomeBlock component: green/amber/rose) and `/dashboard` per-package badge (fail-soft batch read); fully localized en+pt-BR with 7 i18n keys; lenient at launch (verdict recorded and displayed, enforcement stays off); closes the "empty README passes" loophole and establishes the pattern future rules reuse (Epic 1 / Demand 2, ADR-044/045) (#58)

## 0.11.0 (2026-05-30)

- Feat: Extensible publish-time validation framework — pluggable validator registry + runner invoked from `/publish`, persisting structured `package_publish_validation` result aligned with existing `validation_report` shape; lenient by default (records verdict, no hard publish block); enforcement flag scaffolded off; framework ships with empty registry, first rule (README gate) deferred to next demand (Epic 1 / Demand 1, ADR-041/042/043) (#56)

## 0.10.1 (2026-05-30)

- Fix: Localize Header, Footer, ProfileHeader, AvatarUpload, and PackageListRow shared components — 46 new i18n keys (header, footer, common, packageStatus, githubHosting) added to both en.json and pt-BR.json; HeaderServer.tsx thin async wrapper injects dict.header to the client Header component; Footer now self-resolves locale internally; ProfileHeader and AvatarUpload receive locale/dict props; PackageListRow statusLabels prop replaces module-level constant; all 13 page call-sites swap `<Header />` → `<HeaderServer />`; login/register/profile pages split into server shell + *Client.tsx to support async HeaderServer and Footer (Epic 11 / Demand 1, ADR-038/039/040) (#54)
- Fix: ISR cache invalidation for catalog and home pages after package likes toggle — `revalidatePath` now targets the `[lang]` route segment instead of the page path, ensuring both locales are invalidated

## 0.10.0 (2026-05-30)

- Feat: Real Pub Points (0–100) computed render-time from the `validation_report` — `src/utils/pubPoints.ts` helper over 8 validator rules (readme/changelog/examples/installing/images/pascal_sources/license/repo_clonable); Scores tab breakdown per section+rule with pass/warn/fail; Points displayed in detail sidebar and catalog list row; `packageDetail.scores` i18n slice (en+pt-BR, 29 keys) (Epic 9 / Demand 3, ADR-033) (#47)
- Feat: Likes — `package_likes` table (UNIQUE per user+package, RLS, FK→`auth.users`), batch-rendered count metrics on detail sidebar and catalog rows, authenticated `LikeButton` + `toggleLike` Server Action (Epic 9 / Demand 4, ADR-034) (#48)
- Feat: Curated tab content (Example + Installing) — `package_tab_content` satellite table (1:1 with packages, cascade delete), fail-soft read/upsert helpers, both tabs render curated markdown first with git fetch as fallback, optional textareas on `/publish` and `/dashboard` edit with 8000-char limit and control-char stripping, graceful degradation when migration deferred (Epic 9 / Demand 6, ADR-035) (#49)
- Fix: Localized `/publish` and `/dashboard/*` forms — `getRequestLocale()` via `x-locale` header resolves the active locale on non-`[lang]` routes; all labels, helpers, placeholders, buttons, metadata, and server-action messages now render in the user's language (EN fully reachable; pt-BR implemented but requires proxy locale-threading follow-up per ADR-036); publisher display name editable on the dashboard edit form (writes `profiles.full_name`, blank = no-op); home Featured card resolves real publisher names (dropped hardcoded `"Comunidade"`) (Epic 10 / Demand 1, ADR-036/037) (#51)
- Fix: HomeSearch placeholder and submit button localized in both `/en` and `/pt-BR` -- were hardcoded pt-BR strings leaking under the EN locale
- Security: Role self-escalation guard — RLS profile-update policy now prevents users from setting their own `role='admin'`; operator must apply migration `20260529250000`
- Deps: Override `postcss` to `>=8.5.10` to resolve the moderate advisory on the default `postcss@8.4.x` transitive

## 0.9.0 (2026-05-29)

- Feat: User profile dashboard (`/dashboard`) in the pub.dev style — avatar header (photo upload to Supabase Storage, with initials fallback), display name, e-mail and "member since", over the publisher's own packages rendered as dense rows with a status badge (pending/validating/active/rejected) and a per-item Edit button (Epic 9 / Demand 6, partial)
- Feat: Publisher display name — a "how you want to be called" field on the publish form, saved to the profile and shown on the package detail over the raw git username
- Feat: Markdown editor for the description on both publish and dashboard-edit forms (write/preview tabs + toolbar); description cap raised to 2000 chars
- Feat: Versions tab pulls live from the GitHub repo — prefers Releases, falls back to Tags; rendered as a pub.dev-style table (Versão / Lançado / Notas / .zip download), fetched only when the tab is opened (Epic 9 / Demand 5)
- Feat: Forks mirrored live from the repo in the detail sidebar; the Stars stat links to the GitHub repo so users can star it there; the unmeasurable Downloads metric was removed
- Security: Ad-counter and portal-status RPCs are now called only server-side via the service-role client, with EXECUTE revoked from anon/authenticated — closes a vector where visitors could inflate ad metrics by calling the RPC directly. Migration also pins `search_path` on trigger functions and drops the over-broad public-bucket SELECT policy
- UX: Clearer profile access in the header user menu — "Meu Perfil" (the dashboard) and "Conta & Segurança"; the menu shows the avatar photo when set
- Fix: Locale redirect now preserves the query string, so `?tab=…` and `?readme=1` survive — tab switching and the lazy README expand work again
- Fix: Header no longer blanks out while logged in — auth state resolves from the session without waiting on the profile fetch, with a safety timeout
- Chore: Removed third-party project names (Horse, Skia4Delphi, Indy) from search/publish placeholders

## 0.8.0 (2026-05-29)

- Feat: pub.dev-style package detail page — 2-column layout with a metadata sidebar (stars, points, downloads, repo/website links, license, publisher, platforms, IDE/dialect); slim title header; curated summary with the repo README lazily fetched only on "expandir" (`?readme=1`); GitHub-style syntax highlighting in code blocks (`highlight.js` + github-dark theme) and GitHub-like README typography (Epic 9 / Demand 1)
- Feat: Dense catalog list — `/packages` replaces the card grid with one `PackageListRow` per package (name, badges, 2-line description, clickable platform/dialect chips, license) plus a right-aligned Stars / Points / Downloads metric block, like pub.dev search results (Epic 9 / Demand 2)
- Feat: Markdown editor on `/publish` for the package description — write/preview tabs + bold/italic/code/link/list toolbar; rendered formatted on the detail page and flattened via `stripMarkdown` in cards, the catalog list and SEO meta; description cap raised to 2000 chars (Epic 9 / Demand 6, partial)
- Feat: Live repo mirroring on the detail page — license (SPDX) and stargazers fetched from the GitHub API (1h cache, no token required) for open-source GitHub packages, falling back to stored values
- Fix: Detail page 500 on Vercel — replaced `isomorphic-dompurify` (loads jsdom, which fails in a serverless function) with `sanitize-html`; `MarkdownView` degrades to safe plaintext instead of throwing
- Feat: English is now the default locale — `/` redirects to `/en`; pt-BR remains available via the header toggle
- Feat: Real empty states on the home page — removed the hardcoded demo packages/partners (Horse, Skia4Delphi, Embarcadero, …) that rendered third-party names as fake seed data
- Add: JsonFlow (`ModernDelphiWorks/JsonFlow`) seeded as the first real package via `supabase/seed_jsonflow.sql`

## 0.7.2 (2026-05-29)

- Fix: GitHub OAuth login now works end-to-end — `proxy.ts` skips `updateSession` on `/auth/*` so the PKCE code-verifier cookie survives until the `/auth/callback` route exchanges it (was failing `exchangeCodeForSession`); paired with Supabase config (provider enabled, Site URL + Redirect URLs set to the production domain) and a corrected `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel (was throwing `Invalid API key`)
- Feat: GitHub OAuth button on login/register gated behind `NEXT_PUBLIC_GITHUB_AUTH_ENABLED` — hides the provider until it is configured, preventing the `Unsupported provider` error from reaching users
- Fix: Remove invalid `document-title` attributes from mobile nav `<Link>` elements in `Header`

## 0.7.1 (2026-05-29)

- Fix: Hero `HomeSearch` invisible on `/pt-BR` and `/en` — `mask-image` radial gradient moved off the hero `<section>` (was cascading to all descendants) onto a dedicated `aria-hidden` `pointer-events-none` `absolute inset-0` child layer; content wrapper remains `relative z-10`; decorative grid fade preserved (#44)

## 0.7.0 (2026-05-29)

- UX: Remove "Buscar Pacotes" text link from desktop primary nav and mobile menu — primary nav now contains exactly: Parcerias, Status, Publicar (#42)
- Feat: Add discreet Search icon to Header desktop actions area (`aria-label="Buscar pacotes"`, `href="/packages"`) — catalogue reachable from all pages without a prominent nav item (#42)
- Feat: Add secondary "Catálogo de Pacotes" entry in mobile menu (Search icon + label, closes menu on click, `href="/packages"`) — preserves catalogue access on mobile after primary item removal (#42)

## 0.6.0 (2026-05-29)

- Feat: EN/pt-BR locale routing — 4 public pages (Home, Catalog, Detail, Partners) moved under `app/[lang]/`; URLs shift to `/en/` and `/pt-BR/` sub-paths; pt-BR remains the default; root paths redirect to `/pt-BR/` equivalents (#39)
- Feat: `proxy.ts` replaces `middleware.ts` — locale redirect for public paths plus `x-locale` header forwarded to root layout; admin/dashboard/auth paths excluded from redirect (#39)
- Feat: EN/pt-BR JSON dictionaries at `src/dictionaries/{en,pt-BR}.json` — server-only `getDictionary` lazy-loads the correct locale; `hasLocale`/`Locale` helpers enforce valid values; invalid `lang` parameter returns `notFound()` (#39)
- UX: Header locale toggle — `PT | EN` switcher swaps the locale prefix while preserving the rest of the path (#39)
- Feat: Bilingual sitemap — `alternates.languages` for the 4 public routes in `sitemap.ts` (#39)
- Feat: Partner tier badges — `partners.tier` column (`platinum` / `gold` / `silver` / `bronze`); discreet inline badge on `PartnerCard`; admin partner form now exposes a tier selector; existing partners default to `platinum` (#38)
- Fix: Lint errors cleared — `<a>` replaced with `<Link>` in `ReviewsTab`; unused `Link` import removed from login page (#39)

## 0.5.0 (2026-05-28)

- Feat: Reviews moderation in `/admin/reviews` — admins can flag/unflag reviews (hidden from public via RLS), delete reviews, and ban/unban users; banned users blocked at Server Action layer for both `submitReview` and `deleteReview`; `ReviewsTab` shows hidden-review count placeholder "N avaliação(ões) oculta(s) por moderação" when `flaggedCount > 0` (#35)
- Feat: Public reviews UI on `/packages/[slug]` — star-rating form, review cards with author/date, and aggregate rating badge in `PackageCard`; `package_reviews` table with RLS (only non-flagged reviews visible publicly) and B-Tree index on `package_id` (#33, #34)
- Feat: Sponsorship expiry cron — daily GitHub Actions workflow resets `highlight_level` to `none` on packages whose `sponsorship_ends_at` has passed; zero-dependency Node.js script using Supabase service-role client (#32)
- Feat: Asaas webhook handler — `/api/webhooks/asaas` activates subscriptions on `PAYMENT_CONFIRMED` and updates `packages.highlight_level` based on plan tier; signature-less validation with `ASAAS_WEBHOOK_TOKEN` header check (#31)
- Feat: Gateway-agnostic checkout — `subscriptions` table, Asaas adapter (`src/lib/gateways/`), and `startCheckout` Server Action; `/dashboard/sponsorship` plan selection page with `CheckoutButton` redirects to Asaas-hosted checkout URL (#30)
- Feat: Public partner application form — `/partners/apply` with `PartnerApplyForm` submits to `partners` table in `pending` status; accessible from `/partners` page header (#29)
- Feat: Owner-scoped publisher dashboard — `/dashboard` lists the authenticated user's packages with inline edit (`/dashboard/packages/[id]/edit`) using `PackageEditForm`; guarded by `requireOwnerOrThrow` (#27, #28)

## 0.4.0 (2026-05-29)

- Feat: Admin CRUD for ads and partners -- `/admin/ads` and `/admin/partners` deliver list (all statuses), create, edit, status toggle (`active ↔ paused` for ads, `active ↔ inactive` for partners), `sort_order` editor (partners), and confirm-then-delete; replaces Supabase Studio for both commercial tables (#23)
- Feat: Admin plans management -- new `plans` table (tier, billing cycle, `price_cents`, currency, JSONB features, `external_price_id`, provider, `is_active`, `sort_order`) with full CRUD at `/admin/plans`; data foundation for publisher sponsorship selection (Epic 3) and payment integration (Epic 4) (#24)
- Feat: Admin Server Actions with defense-in-depth -- `createAd`/`updateAd`/`toggleAdStatus`/`deleteAd`, partner equivalents, and `createPlan`/`updatePlan`/`togglePlanStatus`/`deletePlan` each re-check `profiles.role = 'admin'` server-side, validate UUID/enum/JSON inputs, and revalidate affected routes (#23, #24)
- Feat: Friendly duplicate-key handling -- unique `(tier, billing_cycle)` on plans and unique partner name surface Postgres `23505` as human-readable form errors instead of crashing (#23, #24)
- Add: Defensive RLS migration for ads/partners admin writes -- idempotent `20260528130000_admin_ads_partners_rls.sql` guarantees admin INSERT/UPDATE/DELETE policies exist (#23)
- Add: `plans` table migration -- `20260528140000_plans_table.sql` with RLS (admin full access + public SELECT for active), `updated_at` trigger, and active/order index (#24)
- UX: AdminSidebar navigation -- `Anúncios` and `Parceiros` links replace the placeholder entry; `Planos de Destaque` now resolves to the live `/admin/plans` route, all with active-route highlight (#23, #24)
- Requires: Apply migrations `supabase/migrations/20260528130000_admin_ads_partners_rls.sql` and `supabase/migrations/20260528140000_plans_table.sql` before the admin ads/partners/plans screens can write through RLS (#23, #24)

## 0.3.0 (2026-05-28)

- Feat: Vercel Analytics integration -- `<Analytics />` injected in root layout; zero extra bundle on the client; no cookie consent required (#16)
- Feat: `/portal-status` public page -- live counts (active packages, weekly submissions, weekly validations, pending backlog) via `portal_status_rpc` Supabase RPC; degraded-safe empty state when DB is unreachable (#16)
- Feat: Dynamic SEO baseline -- `sitemap.ts` covering all static routes + per-slug package URLs; `robots.ts` allowing all crawlers; site-wide `og:image` + `twitter:image` via `next/og` edge runtime; per-package OG image generated at `/packages/[slug]`; canonical meta tag on every public route; `siteConfig` singleton for base URL + brand copy (#17)
- Fix: Env-tolerant Supabase clients -- `createBrowserClient` and `createServerClient` factories degrade to placeholder URL/key when `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are absent; unblocks `/_not-found` static prerender in CI (#17)
- Feat: Admin route guard + `/admin` dashboard shell -- middleware redirects anonymous to `/login?next=/admin`; `admin/layout.tsx` server-side re-checks `profiles.role = 'admin'` and renders `AdminAccessDenied` 403 for non-admins; `/admin` overview shows four live count metrics (pending packages, active packages, total partners, active ads) with degraded-safe fallback (#19)
- Feat: `/admin/submissions` moderation queue -- server-rendered table listing packages in `pending | validating | rejected` (default `pending`); filter chips via `?status=`; one-click **Aprovar** / **Rejeitar** flips `packages.status`; inline `highlight_level` selector (`none | bronze | silver | gold`) persists in two clicks; branded empty state (#20)
- Feat: Server Actions for admin mutations -- `approveSubmission`, `rejectSubmission`, `setHighlightLevel` each re-check `profiles.role = 'admin'` server-side, validate UUID and level inputs, mutate via user-scoped Supabase client, and dual-revalidate `/admin/submissions` + `/admin` (#20)
- Feat: Admin-UPDATE RLS policy on `packages` -- migration `20260528120000_admin_packages_rls.sql` adds `packages_admin_update` policy; existing owner policy preserved (#20)
- Requires: Apply migration `supabase/migrations/20260528091500_portal_status_rpc.sql` for `/portal-status` live counts (#16)
- Requires: Apply migration `supabase/migrations/20260528120000_admin_packages_rls.sql` before Aprovar/Rejeitar/setHighlightLevel can write through RLS (#20)

## 0.2.0 (2026-05-28)

- Feat: Discreet advertisement spaces -- `placement` column on `ads` with CHECK constraint and composite index; `SECURITY DEFINER` RPCs `increment_ad_clicks` and `increment_ad_impressions`; server-rendered `AdSlot` with mandatory "Anúncio" chip; click handler `/api/ads/click/[id]` redirects 302 to the DB's `target_url` (no open-redirector); Home + Catalog wired with hero / sidebar placements (#14)
- Feat: Public `/partners` directory -- reusable `PartnerCard` Server Component shared between Home (top-3 featured) and `/partners` (full directory with `sort_order` ordering); empty-state panel; `mailto:` "Tornar-se parceiro" CTA; indexable SEO metadata (#15)
- Refactor: Home page partner section -- replaced inline card markup with `<PartnerCard>` and added "Ver todos os parceiros →" link (#15)
- Requires: Apply migration `supabase/migrations/20260528060000_ads_placement.sql` via Supabase Studio or `supabase db push` before the ad surfaces can render live content (#14)
- Docs: Operator runbook comment on `src/app/partners/page.tsx` listing the columns operators populate when adding a partner (#15)

## 0.1.0 (2026-05-28)

- Feat: Bootstrap Next.js project, brand tokens, responsive shell, and CI workflow (#1)
- Feat: Supabase relational schema for packages, package versions, partners, ads, and profiles with RLS and GIN/B-Tree indexes (#2)
- Feat: Supabase Auth integration -- AuthContext, edge middleware for protected routes, brand-styled pt-BR `/login` and `/register` (#3)
- Feat: Home page -- dynamic featured packages, partner grid, search input with Ctrl+K, platform/dialect filter badges (#4)
- Feat: Catalog `/packages` -- four-tier ordered sub-queries enforce sponsored precedence across pagination boundaries; active filter chips, empty state, filter-aware `generateMetadata` (#5)
- Feat: Package detail `/packages/[slug]` -- six URL-driven tabs (Readme, Changelog, Example, Installing, Versions, Scores), best-effort GitHub raw fetch with 5 s timeout and 200 KB cap, server-side Markdown render through `marked` + `isomorphic-dompurify` (#6)
- Feat: Authenticated submission form `/publish` -- Server Action with typed `SubmitState`, slug derivation, idempotent insert with `status='pending'` (#7)
- Add: Esteira validator -- zero-dependency Node 20 ESM script that inspects repository structure against 8 locked rules; manually-dispatched GitHub Actions workflow uploads `validation-report.json` with `schema_version: 1` (#8)
- Add: Esteira sync workflow -- scheduled `*/30 * * * *` cron that drains pending packages, runs the validator, and writes `status` + `validation_report` back to Supabase with an idempotent `where status='pending'` guard (#9)
- Deps: marked, isomorphic-dompurify, @tailwindcss/typography (#6)
- Requires: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` repo secrets before the Esteira sync schedule fires (#9)
