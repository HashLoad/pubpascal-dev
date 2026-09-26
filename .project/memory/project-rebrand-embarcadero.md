---
name: project-rebrand-embarcadero
description: ⭐ MOTIVO REAL do rebrand PubDelphi→PubPascal — pedido FORMAL da Embarcadero
  por email (marca 'Delphi' é deles). Não foi só preferência. O nome PubDelphi MORREU;
  é PubPascal daqui pra frente.
metadata:
  node_type: memory
  type: project
  originSessionId: 5f38386d-c6d5-46ad-a532-2c45663b54e0
type: project
---
# Rebrand PubDelphi → PubPascal — motivo: Embarcadero (trademark)

O rebrand **PubDelphi → PubPascal** NÃO foi só uma escolha estética/estratégica do operador. Foi por **solicitação FORMAL da Embarcadero, recebida por email**: a marca **"Delphi"** é da Embarcadero, então o nome de produto "PubDelphi" tinha que sair.

**Why:** "Delphi" é marca registrada da Embarcadero. Usar no nome do produto/portal exporia a um problema legal. O operador atendeu e migrou TUDO para **PubPascal** (Object Pascal = a linguagem; Delphi é só um dialeto — também fica mais internacional, abrange Lazarus/FPC). É o mesmo tipo de motivo que derrubou "DelphiSense" → "Aefos AI" (trademark).

**How to apply:**
- **Esquecer "PubDelphi" como marca.** Daqui pra frente é **PubPascal**, sempre. Nunca reintroduzir "PubDelphi" em nada user-facing, copy, docs, títulos, logos.
- A palavra **"Delphi" sozinha = a linguagem/IDE**, pode aparecer em contexto técnico ("dev Delphi", "RAD Studio"). O que NÃO pode é "Delphi" como **nome do nosso produto/marca**.
- Os identificadores técnicos `pubdelphi` que SOBRAM no código (catálogo `id:"pubdelphi"`, namespace interno `src/PubDelphi/`, fallback `pubdelphi.json`, units `PubDelphi.*`) são **resíduo interno mantido de propósito** (trocar quebra registry/CLIs instalados) — não são marca exposta, então não violam o pedido. Mas se for criar identificador NOVO, usar `pubpascal`.
- Rebrand mecânico (marca + manifesto + domínio `pubpascal.dev` + app/CLI/installer + repos GitHub) já está **100% completo** — ver [[project-resume-next]] e [[reference-domain-hosting]]. Esta memória é o **por quê** por trás daquilo.
