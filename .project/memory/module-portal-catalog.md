---
type: project
name: module-portal-catalog
description: Next.js 15 Web Portal catalog, Supabase authentication, RLS and Asaas billing integration.
metadata:
  node_type: memory
  type: project
  modified: 2026-09-26T10:00:00Z
---

# Module: PubPascal Portal Web (`portal/`)

## Stack and Architecture

The official Web portal for PubPascal is built with Next.js 15, TypeScript, Tailwind CSS, and Supabase.
Production domain: `https://www.pubpascal.dev` (hosted on Vercel behind Cloudflare).

## Core Responsibilities

- Catalogo de pacotes busca marketplace delphi para distribuicao e governanca de componentes.

1. **Package Catalog & Discovery**:
   - API: `portal/src/app/api/packages/catalog/route.ts`.
   - UI: Package search, category filters, download counts, and Pub Points (0-100 quality scoring).
   - SBOM & CRA: Live SBOM manifest viewer and European CRA security badge indicator.

2. **Dev-Flow Endpoints (ADR 002)**:
   - `portal/src/app/api/packages/contribute/fork/route.ts`: Manages GitHub account OAuth integration to automate package fork.
   - `portal/src/app/api/packages/contribute/pr/route.ts`: Generates Pull Requests on behalf of the developer.

3. **Monetization & Sponsorship**:
   - Billing Webhook: `portal/src/app/api/webhooks/asaas/route.ts` handling Asaas subscription payments and sponsorship badges.

4. **Security & Data Isolation**:
   - Supabase Row-Level Security (RLS) policies isolating user profiles, personal tokens, and submission reviews.
   - Seeds initialized via `supabase/seed_*.sql`.

Related: [[workflow-dev-flow-contribution]], [[architecture-dual-manifest]], [[project-catalog-seeds]].
