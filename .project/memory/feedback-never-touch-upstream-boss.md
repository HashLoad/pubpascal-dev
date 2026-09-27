---
name: feedback-never-touch-upstream-boss
description: '⛔ NUNCA agir em HashLoad/boss (upstream) — o operador NÃO é dono. Trabalhar
  só no fork isaquepinheiro/boss; e todo merge no branch feature/pubpascal-cra-compliance
  PUBLICA no PR #263 da HashLoad na hora.'
metadata:
  node_type: memory
  type: feedback
  originSessionId: 9ebd4834-e920-427a-8e11-4b509c164a0a
  modified: 2026-07-22 17:02:08.009000+00:00
type: feedback
---
O operador **não é dono do `HashLoad/boss`**. Instrução repetida e enfática dele (2026-07-22): *"por favor não faça nada no repo original, não sou dono dele"* e depois *"amigão resolva, só não toque o repo original"*.

**Nunca**: abrir PR, comentar, pushar ou mergear em `HashLoad/boss`. Todo trabalho vai no fork `isaquepinheiro/boss`.

**A pegadinha que já causou dano:** o branch `feature/pubpascal-cra-compliance` no fork é o **`head` do PR `HashLoad/boss#263`**. Mergear qualquer coisa nele **atualiza o #263 e dispara o CI da HashLoad imediatamente** — mesmo sem tocar no repo original. Foi assim que um merge com conserto pendente gerou e-mail de "PR run failed" no repo de terceiro e irritou o operador com razão.

**Why:** agir no repo de outra pessoa sem ser dono é exposição pública em nome dele; e um check vermelho lá é custo reputacional dele, não meu.

**How to apply:**
- Trabalho sempre em branch novo no fork → PR **no fork** (base `feature/pubpascal-cra-compliance`) → **o operador mergeia**.
- **Nunca entregar um merge com trabalho pendente atrás.** Provar CI 5/5 verde ANTES de apresentar o PR. Se houver conserto na fila, dizer explicitamente *"não mergeia ainda"* — não listar como "próximo passo".
- Para rodar o `ci.yml` completo (build+test+security), só dispara em PR com base `main`: abrir PR temporário `→ isaquepinheiro/boss:main`, ler o resultado, **fechar sem mergear** (mergear despejaria a feature branch no `main` do fork e o faria divergir do upstream).
- Actions no fork precisou de habilitação manual única do operador (botão na aba Actions); fork é público → grátis.

Ver [[project-vision-canonical]] (por que o Boss voltou ao jogo).
