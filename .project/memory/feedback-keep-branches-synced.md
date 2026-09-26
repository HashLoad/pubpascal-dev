---
name: feedback-keep-branches-synced
description: Manter main e develop SEMPRE iguais (sem diff) — o operador NÃO quer
  divergência entre as branches do portal.
metadata:
  node_type: memory
  type: feedback
  originSessionId: 8772b5dd-efcb-4be6-8447-e646ecbede3a
type: feedback
---
Manter as branches `main` e `develop` do portal **SEMPRE iguais (sem diff)**. Quando uma andar, igualar a outra — não deixar divergência.

**Why:** o operador disse "não deixe diff, iguale" (2026-06-10). Mantém o fluxo simples e evita a "confusão de versões" (`package.json` divergindo) que gera conflito nos PRs de release.

**How to apply:**
- Depois de mergear um PR develop→main, o `main` ganha o merge commit → **sincronizar o develop** (`git checkout develop && git merge origin/main` → fast-forward) e `git push origin develop`. Confirmar `git rev-list origin/develop..origin/main --count` == 0 **e** `origin/main..origin/develop` == 0.
- Os commits de release feitos direto no main (bump/changelog/tracker) devem voltar pro develop — foi a causa do conflito do PR #108 (main 0.17 vs develop 0.18).
- Antes de abrir um PR de release, reconciliar main→develop primeiro pra não conflitar.

Ver [[project-resume-next]].
