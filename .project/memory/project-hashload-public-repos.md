---
name: project-hashload-public-repos
description: ⭐⭐ MUDANÇA DE CASA (2026-09-03) — os projetos foram para a org HashLoad
  e agora são PÚBLICOS. O trabalho passa a ser nas pastas D:\DeveloperWeb\Hashload\*,
  não mais nas antigas. E nada de AI dentro desses repos.
metadata:
  node_type: memory
  type: project
  originSessionId: 2fedc548-5e70-448d-8318-99c87fe9969d
  modified: 2026-09-03 20:13:08.927000+00:00
type: project
---
# A partir de 2026-09-03: casa nova (HashLoad) e repos PÚBLICOS

## Onde se trabalha agora

| O que | Pasta NOVA (usar) | Pasta antiga (não é mais o alvo) |
|---|---|---|
| Portal web | `D:\DeveloperWeb\Hashload\pubpascal-dev` | `D:\DeveloperWeb\pubpascal-dev-portal` |
| Apps nativos | `D:\DeveloperWeb\Hashload\pubpascal-app` | `D:\DeveloperWeb\pubpascal-app` |

As pastas novas são **irmãs** das antigas no disco. Remotes: `HashLoad/pubpascal-dev`
e `HashLoad/pubpascal-app`, ambos **PUBLIC** (decisão do operador, confirmada).
As antigas continuam existindo como origem histórica — o histórico longo e as
branches de trabalho estão lá; os repos novos nasceram com **1 commit de import**.

⚠️ **A sessão continua sendo conduzida DAQUI** (`D:\DeveloperWeb\pubpascal-dev-portal`,
onde vivem `.claude/`, skills e esta memória) — palavras do operador: *"não quero
nada de AI dentro delas lá, por isso mexemos daqui"*. Ou seja: **o ferramental de
IA fica na pasta antiga; o código que vai para o ar fica nas pastas da HashLoad.**
Editar lá, nunca instalar nada de IA lá.

## As duas regras que vêm junto

1. **Nada de AI dentro dos repos da HashLoad.** O import foi feito deliberadamente
   sem `.claude/`, `.agents/`, `.project/`, `.archive/`, `AGENTS.md`, `CLAUDE.md`,
   `scripts/install-verify.*` e sem as referências a ferramenta de IA que existiam
   em `.gitignore`, `eslint.config.mjs`, `ROADMAP.md` e num comentário CSS. **Não
   recriar nada disso lá.** Conteúdo do PRODUTO sobre IA (a seção do Aefos AI nos
   dicionários do portal) é do portal e fica.
2. **São públicos** — tudo que entrar é legível pelo mundo: migrations, políticas
   de RLS, seeds, regras da esteira. Nada de estado local de máquina, binário sem
   checksum ou PII nova. Auditoria do import: **nenhuma chave/token vazou**; o
   único achado foi `supabase/.temp/` (project ref + org id + string do pooler),
   removido, e o histórico do portal foi **reescrito para 1 commit** com
   force-push (o commit órfão antigo ainda responde no GitHub pelo SHA até o GC
   deles — conteúdo é identificador, não credencial). Segue de pé: e-mail pessoal
   do operador nos `supabase/seed_*.sql` e 24 MB de binários sem checksum em
   `public/downloads/`. `supabase/.temp/` também saiu do rastreamento no repo
   antigo (commit `19c8d0d`, ainda **sem push**).

## Detalhes do import que importam depois

- Submodule do CLI: `cli/.modules/boss` aponta para **`HashLoad/boss`** (não mais
  o fork), pinado em `ae9d612` = head do **PR HashLoad/boss#263**. O SHA é
  alcançável no upstream (`refs/pull/263/head`), então `git submodule update
  --init --recursive` funciona. **Quando o #263 mergear, re-pinar no `main`.**
  O `.gitmodules` está sem a chave `branch` de propósito, para ninguém puxar a
  engine para o `main` com `--remote` sem querer.
- `.env.example` **não está versionado** no repo público (o `.gitignore` herdado
  ignora `.env*`) — quem clonar não tem o template das variáveis.
- A infraestrutura (Vercel, Supabase, DNS, Upstash, Asaas, Turnstile, OAuth App)
  **continua em conta pessoal do operador**; o pedido de transferência é a
  **issue HashLoad/pubpascal-dev#4**. Ver [[reference-domain-hosting]].
- Repo público destrava **CodeQL e dependency-review de graça** — o `quality.yml`
  tem comentário dizendo que foram desligados por ser repo privado sem GHAS.
  Podem voltar.

**Why:** o código passou para a organização dona da marca; continuar editando as
pastas antigas produz trabalho que não chega no repo que está no ar, e qualquer
descuido agora é público, não privado.

**How to apply:** ao começar qualquer tarefa nesses projetos, confirmar o
diretório antes de editar — se o caminho não tem `\Hashload\`, perguntar ao
operador se é para trabalhar na cópia antiga. Antes de commitar num repo da
HashLoad, verificar que nenhum arquivo de IA ou estado local entrou.
Relacionados: [[project-resume-next]], [[project-three-native-products]].
