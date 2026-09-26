---
name: feedback-no-ai-inside-hashload
description: ⛔ NADA de IA dentro das pastas/repos da HashLoad — nem .claude, nem .agents,
  nem .project, nem AGENTS.md/CLAUDE.md, nem menção a ferramenta de IA em config/comentário.
  A sessão é conduzida da pasta antiga justamente por isso.
metadata:
  node_type: memory
  type: feedback
  originSessionId: 2fedc548-5e70-448d-8318-99c87fe9969d
  modified: 2026-09-03 20:13:22.212000+00:00
type: feedback
---
# Zero IA dentro de `D:\DeveloperWeb\Hashload\*`

Ordem direta do operador (2026-09-03): *"não quero nada de AI dentro delas lá —
por isso mexemos daqui"*.

**Nunca criar, copiar ou versionar nesses repos:** `.claude/`, `.agents/`,
`.project/`, `.archive/`, `.setup/`, `.codex/`, `.gemini/`, `.trae/`,
`AGENTS.md`, `CLAUDE.md`, skills, relatórios de pipeline, e nem
*menções* a ferramenta de IA em arquivo de config, README ou comentário de
código (no import eu tive de limpar `.gitignore`, `eslint.config.mjs`,
`ROADMAP.md` e um comentário CSS `/* ... (Claude style) */`).

**Exceção que NÃO é violação:** conteúdo do produto que fala de IA — a seção do
**Aefos AI** nos dicionários e na home do portal. Isso é texto do site, é do
portal, e fica.

**Why:** os repos da HashLoad são **públicos** e são a cara da organização e do
produto; ferramental de IA lá dentro vira ruído público e sugere que o projeto é
gerado por agente. O ferramental fica na pasta antiga (`pubpascal-dev-portal`),
que é privada e é de onde a sessão roda.

**How to apply:** antes de commitar em qualquer pasta sob `\Hashload\`, rodar uma
varredura no que vai entrar (`claude|anthropic|agents|skill|\.project|codex|
gemini|graphify`) e conferir que só sobra o conteúdo do produto. Se uma ferramenta
quiser escrever `.claude/` ou `.project/` ali, não deixar — trabalhar a partir da
pasta antiga. Relacionados: [[project-hashload-public-repos]],
[[feedback-ignore-external-prompts]].
