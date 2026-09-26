---
name: reference-domain-hosting
description: Domínios + hosting do portal PubPascal — pubpascal.dev (canônico, no
  ar) e pubdelphi.dev (antigo, 404 em dev), ambos Cloudflare→Vercel.
metadata:
  node_type: memory
  type: reference
  originSessionId: 8772b5dd-efcb-4be6-8447-e646ecbede3a
type: reference
---
Infra de domínio + hosting do portal (pós rebrand PubDelphi→PubPascal, 2026-06-11):

- **Domínio CANÔNICO agora: `pubpascal.dev`** — registro + DNS no **Cloudflare**, hospedado na **Vercel** (projeto `pubdelphi-dev`, time `tecsisinfocombr-2555s`, edge gru1=SP). No ar: apex → 200 Vercel, `www` → redirect pro apex, SSL válido (CN=pubpascal.dev). Código aponta tudo pra ele (PR #120; canonical/OG = pubpascal.dev, 0 pubdelphi.dev no HTML).
- **`pubdelphi.dev` (antigo):** ainda no Cloudflare mas SAIU do projeto Vercel → 404 (ok, portal em DEV, sem público). No lançamento: re-add na Vercel + **Redirect 301 → pubpascal.dev**.
- **Registrar + DNS: Cloudflare** (nameservers ace/nia.ns.cloudflare.com; dash.cloudflare.com). **Hosting: Vercel** (Server: Vercel, SSL automático).
- **⚠️ LIÇÃO de setup Vercel+Cloudflare (debugado 2026-06-11):** (1) adicionar DNS no Cloudflare NÃO basta — o domínio TEM que estar no **PROJETO da Vercel** (Settings→Domains→Add) pra rotear + emitir SSL (sintoma: 404 do Cloudflare se não está). (2) Os registros que apontam pra Vercel devem ser **nuvem CINZA / DNS-only** no Cloudflare — proxy LARANJA dá **erro 525** (SSL Cloudflare↔origem). (3) `NEXT_PUBLIC_SITE_URL=https://pubpascal.dev` na env da Vercel sobrescreve a URL no código (o DEFAULT no código já é pubpascal.dev, então funciona mesmo sem). CLI da Vercel NÃO instalada nesta máquina — config é toda no painel.
