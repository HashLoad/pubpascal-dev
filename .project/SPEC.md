# SPEC da casa — conhecimento de agente em `.project/`

**Normativo. Vale para TODOS os projetos da casa** — Aefos-Analyzer, Aefos-AI,
Aefos-Studio, Aefos-Knowledge, Axial (`developer-friends` / `developer-friends-backend`),
FluentSQL, FiscalBridge, MCIBr, WTOData, PubPascal e os que vierem.

Cada regra é rotulada com a sua origem, e essa separação é o núcleo do documento:

- **[OKF]** — vem da norma *Open Knowledge Format* v0.2 (Google Cloud, Apache 2.0).
  Citada como `SPEC.md:linha`.
- **[CASA]** — decisão nossa. O OKF não pede, e em vários casos é **silente**
  (dito explicitamente onde for o caso).

⚠️ Quando alguém disser *"isso é inválido em OKF"*, **cobre a citação**. A norma é
deliberadamente minimalista: a conformidade tem **três itens** (`SPEC.md:733-741`).
Quase tudo o mais que parece regra é convenção — inclusive convenção do próprio
Google.

---

## 1. Escopo e por quê

O problema é concreto, não teórico:

1. O acervo de memória vivia **num único PC**, dentro da pasta de configuração de
   uma ferramenta proprietária (`~/.claude/projects/<slug>/memory/`). Fora de
   qualquer repo, fora de qualquer backup, sem histórico e sem diff. PC que dá
   ruim leva tudo.
2. **Um quarto do acervo já estava perdido sem ninguém notar**: conceitos que
   **índice nenhum citava**. Estavam no disco e invisíveis — nenhuma sessão
   carregava, nenhuma sessão achava. E o índice havia **estourado o limite de
   tamanho do harness**, então na prática o número de invisíveis era maior.

   > 🔢 **O número, e como se refaz.** Na auditoria de 2026-09-16 mediu-se, no
   > acervo já migrado, **66 de 272 conceitos** não citados pelo `MEMORY.md`. O
   > "68 de 269" que circulou nos PRs #184-#186 foi medido **antes** do conserto
   > dos links quebrados e **não se reproduz** a partir de nenhum artefato
   > commitado. Regra da casa: número que pode ser gerado vem com o comando.
   > ```
   > comm -23 <(ls *.md | grep -vE '^(MEMORY|index)\.md$' | sed 's/\.md$//' | sort)    >          <(grep -oE '\]\([^)]+\.md\)' MEMORY.md | sed 's/](\(.*\))//;s/\.md$//' | sort -u) | wc -l
   > ```
3. O **único leitor** do acervo era o harness. Formato dele, regra dele, vida útil
   dele.

O OKF resolve (1) e (3) — formato legível sem tooling (`SPEC.md:10-13`), diffável
em controle de versão e portável "across tools, organizations, **and time**"
(`SPEC.md:28-31`). E resolve (2) por consequência, porque força um índice que
cobre tudo.

O que o OKF **não** resolve, e é bom saber desde já:

- **Não entrega backup, réplica nem sincronia.** `SPEC.md:63` põe *"storage,
  serving, or query infrastructure"* como **non-goal** explícito. OKF torna o
  acervo *portável*; **não o transporta**. Quem transporta é o **git**.
- **Não existe validador.** Nem na norma, nem no tooling do Google. Ver §9.
- **Não entrega integridade de link** — link quebrado é legal por desenho
  (`SPEC.md:461-463`). Ver §6.

---

## 2. Onde mora

### 2.1 A regra principal

> **[CASA] Todo conhecimento de que um agente precisa DEVE viver em `.project/`,
> versionada no repositório do próprio projeto.**
>
> A memória global do harness **NÃO DEVE** ser a única cópia de nada. Se um fato
> só existe lá, ele não existe.

Isso é exatamente a terceira forma de distribuição prevista pela norma:
`SPEC.md:127-132` — *"A bundle MAY be distributed as: a git repository
(**recommended**, since it provides history, attribution, and diffs) … **a
subdirectory within a larger repository**."*

**[CASA] A pasta chama-se `.project/`, no singular.** Fixado porque as skills da
casa (`analyst-*`, `auditor`, `pipeline`) já produzem e leem nesse caminho.
`.projects/` não existe.

### 2.2 O que entra

| Entra | Não entra |
|---|---|
| Memória do projeto (os tipos do §4) e conceitos product com fontes medidas | Código-fonte, build artifacts, `target/`, `dist/` |
| Dossiês de estudo destilados (spec para implementador) | Árvores de estudo de terceiros (`.local-readonly/` continua fora) |
| Decisões e o **porquê** delas | O que o git já registra (histórico, autoria, diff) |
| Regras técnicas medidas | O que o código já diz (estrutura, assinatura, quem chama quem) |
| Convenções do produto que o código não expressa | Segredo, credencial, token — **nunca**, em repo nenhum |

**[CASA]** Um fato que o repo **já registra** só vira conceito product
quando oferece um mapa de recuperação com citações verificáveis e limite de
validade; não se copia a implementação. As outras memórias guardam o que se
perde: o porquê, a medição, a armadilha e a correção do dono.

### 2.2.1 O bundle técnico separado

**[CASA]** `docs/` é um segundo bundle OKF, com tipos descritivos próprios:
decision, roadmap, research, guide e language-rule. São documentos técnicos
completos, não memórias de trabalho. Todo .md não reservado ali tem
frontmatter YAML e type; `docs/index.md` é gerado sem frontmatter.
`.project/docs-okf.py` valida os três itens mínimos da norma e, como regras
da casa, cobertura integral, ausência de entrada morta e links locais válidos.
O vocabulário fechado do portão de memory/ não se aplica a docs/.

README.md e CLAUDE.md da raiz e .project/README.md são documentos de
entrada/operação fora dos bundles. Sua ausência de frontmatter não reprova
nenhum dos dois bundles.

### 2.3 O caso difícil: fato de um produto no repo de outro

É real e é grande — o acervo do Analyzer cobre Aefos AI, Lazarus, Axial, releases,
PubPascal. Regra de decisão, **[CASA]**:

> **O fato mora onde ele morre.** Pergunte: *"se este produto fosse arquivado
> amanhã, este fato ainda importa?"*
> - **Não importa mais** ⇒ é do produto. Mora no `.project/` **daquele** repo.
> - **Ainda importa** ⇒ é conhecimento de **casa** (§2.4).

Corolários:

- **[CASA]** Um fato **NÃO DEVE** ser duplicado em dois repos. Duplicata deriva, e
  na hora em que derivar ninguém vai saber qual está certa.
- **[CASA]** O repo onde o fato foi *aprendido* PODE guardar um **ponteiro** — um
  conceito curto de `type: reference` que diz o que é e onde está, com link. O
  ponteiro carrega a frase, nunca a prova.
- **[CASA]** Ao mover um fato de repo, o conceito antigo vira ponteiro; **não se
  apaga**, porque há links apontando para ele.

### 2.4 Conhecimento de casa (transversal)

Algumas coisas não pertencem a projeto nenhum: como o dono trabalha, armadilhas de
ferramenta (PowerShell 5.1 × 7, `gh pr merge` que não atualiza a árvore local,
disco cheio dando erro que não diz "cheio"), convenções de código que valem em
todo Delphi da casa.

> **[CASA] Conhecimento de casa DEVE ter UM lar único, designado, e os demais
> repos o alcançam por ponteiro. NÃO DEVE ser copiado para cada `.project/`.**

⚠️ **Qual repo é esse lar ainda não está decidido, e este documento não decide por
conta própria.** Até que o dono nomeie, conhecimento de casa fica no `.project/`
do repo onde foi aprendido, marcado com `tags: [casa]`, para ser recolhido depois
sem caça.

---

## 3. O formato

**[OKF] OKF v0.2.** Um diretório de markdown com frontmatter YAML. Sem registro de
schema, sem autoridade central, sem tooling obrigatório (`SPEC.md:10-13`).

### 3.1 Os três itens de conformidade — o mínimo absoluto

`SPEC.md:733-741`:

1. Todo `.md` **não-reservado** contém bloco de frontmatter YAML **parseável**.
2. Todo frontmatter contém um campo `type` **não-vazio**.
3. Os nomes reservados (`index.md`, `log.md`), **quando presentes**, seguem §8 e §9.

E o outro lado, `SPEC.md:752-759` — o consumidor **MUST NOT** rejeitar um bundle
por: campo opcional ausente · `type` desconhecido · chave extra desconhecida ·
**link quebrado** · `index.md` ausente.

⇒ **Consequência prática [CASA]:** um acervo migrado pela metade continua
consumível. **Não existe big-bang obrigatório.**

### 3.2 `type` DEVE estar na raiz do frontmatter

**[OKF, por inferência — a norma é SILENTE quanto à palavra "top-level"].**
`SPEC.md:739` diz apenas *"Every frontmatter block contains a non-empty `type`
field"*. O modelo de dados (`SPEC.md:163-173`) põe `type` como chave raiz, e
`SPEC.md:187-188` diz *"`type` is the only always-required key"*.

A **definição operacional** fecha a questão: a implementação de referência declara
`REQUIRED_FRONTMATTER_KEYS = ("type",)` e lê a chave na **raiz**, sem descer em
`metadata` (`src/reference_agent/bundle/document.py:10,59`).

> **Um `type` aninhado sob `metadata` é indistinguível de `type` ausente.**

**[CASA]** Onde o harness também exigir a chave aninhada, ela **PODE** ser mantida
duplicada — é chave desconhecida legal (`SPEC.md:205-207`) e é o preço de o acervo
servir a dois leitores. Mas a **raiz é que manda**.

### 3.3 Identidade: o caminho é o ID

**[OKF]** `SPEC.md:79-80` — *"**Concept ID**: The path of the concept's file within
the bundle, with the `.md` suffix removed."*

> **[CASA] `name:` DEVE espelhar o caminho do arquivo sem `.md`.**

O OKF não exige `name:`; quem identifica é o arquivo. A regra da casa existe para
que o documento não diga de si uma coisa e o formato entenda outra — divergência
silenciosa é a pior espécie.

### 3.4 Um fato por arquivo

**[CASA]** Um conceito = **um** fato, com o seu porquê e a sua prova. Arquivo que
carrega três assuntos não se atualiza sem reescrever, não se aponta com precisão e
não se apaga quando um dos três morre.

⚠️ Não é verificável por máquina. É disciplina de escrita, cobrada em revisão.

### 3.5 Frontmatter canônico

```yaml
---
# ── obrigatório ────────────────────────────────────────────────────────────
type: project                       # [OKF §11.2] única chave sempre obrigatória, NA RAIZ
name: project-analyzer-117-member-not-offered
                                    # [CASA] espelha o caminho do arquivo sem `.md`
description: '#117 fechado pela #171 — a chave do índice virou (nome, aridade), e `TBox` deixou de engolir `TBox<T>`'
                                    # [OKF recomendado, SPEC.md:194-195] — a norma
                                    # NÃO escreve "SHOULD" aqui: `description` vive
                                    # sob "**Recommended:**" (SPEC.md:190) e a frase
                                    # é descritiva. A obrigatoriedade é [CASA] (§9.1).
                                    # ⚠️ UMA linha física, e ASPAS SIMPLES: `: ` num
                                    # escalar plano quebra o YAML (7 arquivos deste
                                    # acervo estavam assim), e aspas DUPLAS engolem
                                    # `\` de caminho Windows como escape.
                                    # é esta frase que o índice gerado repete

# ── adotados pela casa (opcionais no OKF) ──────────────────────────────────
title: "#117: o membro que não era oferecido"
                                    # [OKF SPEC.md:192-193] título humano, ≠ slug
tags: [issue-117, indice, corpus, d12, d13]
                                    # [OKF SPEC.md:199,146-149] eixos transversais
status: stable                      # [OKF SPEC.md:409-419] ausente ⇒ stable
generated:                          # [OKF SPEC.md:370-377]
  by: claude-opus-5/1M               #   `by` é REQUIRED aqui dentro (SPEC.md:374).
                                    #   ⚠️ a convenção escrita tem TRÊS formas
                                    #   (SPEC.md:488-495): `<producer>/<version>`,
                                    #   `human:<id>`, `process:<id>`. `agent:` NÃO é
                                    #   nenhuma delas — estava aqui como se fosse [OKF].
  at: 2026-09-16T14:00:00Z          #   ISO 8601 COM offset UTC (§7)
verified:                           # [OKF SPEC.md:379-396]
  - by: human:isaque                #   prefixo `human:` é MUST (SPEC.md:497-498)
    at: 2026-09-16T18:20:00Z
sources:                            # [OKF SPEC.md:290-310]
  - resource: https://github.com/ModernDelphiWorks/Aefos-Analyzer/issues/117
    id: issue-117                   #   `resource` é REQUIRED na entrada (SPEC.md:302-305)
  - resource: "crates/aefos-analyzer-index/src/lib.rs:269-270"
    id: indice-uses

# ── chaves da casa (desconhecidas para o OKF, legais por SPEC.md:205-207) ───
metadata:
  visibility: private               # [CASA] §11
  node_type: memory                 # [CASA] compatibilidade com o harness
---
```

**[OKF]** Corpo: **não há seção obrigatória** (`SPEC.md:215-216`). Os headings que
a casa já usa ("💀 Por que…", "🔑 A RTL decide") satisfazem o SHOULD de favorecer
markdown estrutural (`SPEC.md:211-213`). **NÃO DEVE** copiar os headings
convencionais do Google (`# Schema`, `# Examples`, `# Computation`,
`SPEC.md:218-222`) — não se aplicam.

### 3.6 Layout de diretório

**[OKF]** A norma **não impõe nada**: `SPEC.md:111-113` — *"The directory structure
is **independent of the domain**"*. Diretório plano com centenas de arquivos é
plenamente conforme. O único nome de diretório que a norma cita é `references/`, e
ela mesma o encerra com *"It is a **naming convention, not a requirement**"*
(`SPEC.md:482`).

**[CASA]** Diretório plano por padrão. Fragmentar em subpastas (com `index.md` por
nível, `SPEC.md:504`) só quando o índice de um nível ficar ilegível — e a
fragmentação **DEVE** ser por *assunto*, nunca por `type`, porque `type` já está no
frontmatter e o prefixo do nome já o repete.

⚠️ **NÃO DEVE** copiar o layout das amostras do Google (`tables/`, `metrics/`,
`policies/`, `skills/`, `attesters/`, `computations/`). Nenhuma dessas pastas
aparece na parte normativa — é invenção da amostra. Copiar amostra como se fosse
norma é o erro que este documento existe para evitar.

---

## 4. O vocabulário de `type` da casa

**[OKF]** Não há registro central: `SPEC.md:182-185` — *"Type values are **not**
registered centrally. Producers SHOULD pick values that are descriptive and
self-explanatory; consumers MUST tolerate unknown types gracefully"*. E
`SPEC.md:62` põe *"Defining a fixed taxonomy of concept types"* como **non-goal**.
Os valores que aparecem em `SPEC.md:178-180` são **exemplos**, não reservados.

**[CASA] Cinco valores, e só estes cinco:**

| `type` | É | NÃO é |
|---|---|---|
| `user` | Quem é o dono: papel, expertise, preferência durável, como ele decide. | Uma opinião pontual dele sobre um PR. |
| `feedback` | Orientação de **como trabalhar** — correção ou abordagem confirmada. **DEVE** trazer o **porquê** e o **como aplicar**. | Uma regra do produto. Se vale para o código e não para o modo de trabalhar, é `reference`. |
| `project` | Trabalho em andamento, meta, restrição, estado. Datas **absolutas**. | Histórico que o git já conta. Estado que expirou sem ninguém marcar. |
| `reference` | Regra técnica dura, **medida**: a armadilha, o número, o ponteiro para a prova. | Suposição. Explicação que *parece* mecanismo e não foi medida. |
| `product` | **O que o produto É**, lido do código que está no repo: responsabilidade de um crate, contrato de uma fronteira, invariante que o código declara sobre si. Cada afirmação com `arquivo:linha` **medido**. | Uma armadilha aprendida numa tarde (isso é `reference`). Uma decisão de roadmap (isso é `project`). Um resumo do `CLAUDE.md` — a fonte é o **código**, não a prosa que fala dele. |

### 4.1 Por que `product` é um `type` próprio, e não `reference`

**[OKF]** A norma é **SILENTE** e não tem preferência: não há registro central
(`SPEC.md:182-185`), taxonomia fixa é non-goal (`SPEC.md:62`), e `Reference` na
lista de `SPEC.md:178-180` é exemplo. O único quase-normativo é o SHOULD de
`SPEC.md:182-183` — *"Producers SHOULD pick values that are **descriptive and
self-explanatory**"* — e ele pende **a favor** do tipo novo: "a responsabilidade do
crate `index`" não é a mesma espécie de coisa que "portão de latência mede a
máquina".

**[CASA]** A separação tem uma razão operacional e uma de manutenção:

- **O acervo passa a ter duas metades com vidas diferentes.** Memória de trabalho
  envelhece por *decisão* (o dono muda de ideia); documentação de produto envelhece
  por *commit* (o código anda e a citação `arquivo:linha` reaponta para outra coisa).
  São regimes de revisão distintos, e um `type` que os mistura esconde isso.
- **O índice gerado ganha seção própria** (§5.1), que é onde a diferença fica
  visível para quem lê.

> ⚠️ **`product` NÃO é licença para escrever de memória.** É o contrário: é o único
> `type` da casa cuja definição exige a citação medida. Um conceito `product` sem
> `sources[]` e sem `arquivo:linha` no corpo é um `reference` mal classificado.

**Proveniência, com os campos que o OKF já tem** (parecer do `okf-specialist`,
2026-09-19) — nada de campo inventado onde a norma já provê:

- `sources[]`, uma entrada por arquivo citado. ⚠️ `resource` é **REQUIRED em cada
  entrada** (`SPEC.md:302`): pôr o caminho numa chave "natural" como `file:` deixa a
  entrada sem o campo obrigatório dela. `source` no **singular não existe** na norma
  (`SPEC.md:284-287`) — seria chave desconhecida legal e invisível a todo consumidor.
- **A LINHA vai na prosa do corpo**, não no `resource`: `SPEC.md:466-474` não prevê
  fragmento, e `arquivo:linha` dentro de um `resource` é string opaca para o OKF.
- `generated: { by, at }`. ⚠️ **`by` é REQUIRED assim que `generated` existe**
  (`SPEC.md:374`) — escrever só `at:` é o disparo acidental mais provável.
- **Commit/sha: a norma é SILENTE** e fechou a porta de propósito — *"Deeper lineage
  … is out of scope for v0.2"* (`SPEC.md:343-345`). A casa registra o sha em
  `metadata.measured_at_commit`, **chave da casa**, legal por `SPEC.md:205-207`.
- ⛔ **`verified[].by` NÃO leva `human:`** numa doc medida por agente: `human:`
  promove o conceito a *human-reviewed* (`SPEC.md:400-404`), e afirmar revisão
  humana que não houve é a mesma família de "verde por omissão".
- ⛔ **Nenhum conceito `product` usa o heading `# Computation`**: com `computation`
  ausente no frontmatter, `SPEC.md:594-595` faz o corpo sob esse heading **ser** a
  computação. Num acervo sobre um motor, é um acidente plausível.

⚠️ **[CASA]** `Reference` também aparece na lista de exemplos do Google, com outro
sentido ("documento de referência externa"). Não há conflito normativo — não há
registro — mas na leitura humana o nosso `reference` é **regra técnica dura
aprendida**. Está dito aqui de propósito.

> **[CASA] NÃO DEVE usar `type: Attested Computation`.** É o único `type` com peso
> normativo: `SPEC.md:586-588` torna `runtime` **REQUIRED** no instante em que ele
> é usado. Adotá-lo cria obrigação do nada.

**[CASA]** Um `type` novo só entra por decisão do dono, e entra **neste documento**
junto — vocabulário que cresce sem registro vira ruído. `product` entrou assim, em
2026-09-19: a linha da tabela, o §4.1, o vocabulário do portão
(`.project/okf-gate.py`) e a seção do gerador de índice (`.project/okf-index.py`)
mudaram **no mesmo PR**, e o merge é a decisão.

---

## 5. Dois índices, e por que são dois

### 5.1 `index.md` — GERADO, cobertura total

**[OKF]** `SPEC.md:502-526`. O conjunto de obrigações é pequeno:

- **MUST, único:** `SPEC.md:510-511` — *"Index files contain **no frontmatter**,
  with one exception: a bundle-root `index.md` MAY carry an `okf_version` key"*.
- Corpo em seções, cada uma agrupando conceitos sob um heading
  (`SPEC.md:511-512`). **Nível de heading, marcador de lista e separador: a norma
  é SILENTE.**
- **SHOULD:** as entradas devem repetir o `description` do conceito linkado
  (`SPEC.md:524`).
- **MAY:** o produtor **PODE gerar** o índice automaticamente e o consumidor
  **PODE sintetizá-lo** quando não houver (`SPEC.md:525-526`). E ausência de
  `index.md` não invalida bundle (`SPEC.md:759`).

> **[CASA] `index.md` DEVE ser GERADO e DEVE cobrir 100% dos conceitos, sem
> exceção.**

É a resposta direta aos 68 arquivos invisíveis. Como é gerado, **NÃO DEVE** ser
editado à mão — edição manual em arquivo gerado é mentira com data de validade.

**[CASA] O gerador é `.project/okf-index.py`**, e existir é o ponto: enquanto a
regeração era um passo manual descrito na documentação, ela era **dívida, não
entrega** — o índice só cobria tudo enquanto alguém lembrasse. `--check` falha
sem escrever, para rodar junto do portão.

**[CASA]** A entrada repete o `description` do arquivo (o SHOULD do OKF), e não uma
frase editorial. Frase editorial vive no outro índice.

### 5.2 `MEMORY.md` — CURADO, prioridade

**[CASA]** O OKF **não tem campo** para o que dá valor a um índice curado: *"leia
este primeiro"*, *"os outros são história"*, a ordem de ataque. `status:
deprecated` (`SPEC.md:417`) chega perto de "história"; "leia primeiro" não tem
nada.

> **[CASA] `MEMORY.md` DEVE existir, DEVE ser curado à mão, e é o índice que o
> agente carrega em sessão.** Ele carrega prioridade e julgamento; não precisa
> cobrir tudo.

**[CASA]** Sendo um `.md` não-reservado, ele **DEVE** ter frontmatter com `type`
(item 1 e 2 do §11) — `type: curated-index`.

**[CASA]** `MEMORY.md` **DEVE** caber no limite de contexto do harness. Quando
estourar, encurta-se **entrada**, nunca cobertura — a cobertura é do `index.md`.

### 5.3 Quem manda na divergência

> **[CASA] Em divergência, manda o `index.md`, porque ele é derivado dos arquivos.**
> Divergência entre os dois é **defeito do `MEMORY.md`**: entrada morta, ou
> conceito novo que ninguém curou.

### 5.4 `log.md`

**[OKF]** `SPEC.md:530-549`: **PODE** existir, em qualquer nível; lista plana
agrupada por data, **mais novo primeiro**; o **único MUST** é headings de data em
`YYYY-MM-DD` (`SPEC.md:547`). As palavras em negrito (`**Update**`, `**Creation**`)
são *"a convention, not a requirement"*.

> **[CASA] NÃO DEVE existir `log.md`, por ora.**

Dois motivos: (a) o git já é o log, e é por isso que a própria norma recomenda git
(`SPEC.md:128-130`) — `log.md` seria segunda cópia manual, e **a norma não diz qual
vence quando as duas existem**; (b) há divergência real e não resolvida entre spec,
amostra e código sobre `log.md` poder ter frontmatter. Não se resolve silêncio de
norma por conta própria.

---

## 6. Links

**[OKF]** `SPEC.md:84-85` e `SPEC.md:438`: link é um **link markdown padrão**.
`SPEC.md:436-454` enumera **duas** formas, e só duas: absoluta iniciada por `/`, e
relativa.

### 6.1 A forma que a casa usa

> **[CASA] DEVE usar a forma RELATIVA: `[texto](outro-slug.md)`.**

⚠️ Isso **contraria a recomendação escrita da norma** — `SPEC.md:441-443` chama a
forma absoluta de *"recommended"*, por sobreviver a mover documentos. A decisão é
deliberada, porque o ecossistema real consome o contrário:

- o gerador de grafo da implementação de referência **descarta** links absolutos
  (`src/reference_agent/viewer/generator.py:74`);
- o prompt do agente de referência diz textualmente *"Never start a link with `/`"*;
- nos 4 bundles publicados pelo Google: **0 links absolutos**, em qualquer
  método de contagem. (O total de relativos varia com o critério — 24 contando
  todo alvo não-URL, 23 só alvos `.md`, 5 fora do `index.md`. O **0 absolutos**
  é que é robusto, e é ele que sustenta a decisão. O "25" que estava aqui não
  saía de nenhum dos três.)

Em diretório plano as duas formas colapsam no mesmo alvo, então o custo é zero hoje
e a compatibilidade é real.

### 6.2 Os wiki-links `[[slug]]`

**[OKF]** `[[slug]]` **não é um link markdown** e portanto **não é um link OKF**.
A norma é **SILENTE**: não proíbe, apenas não reconhece. Não quebra conformidade —
nenhum dos três itens do §11 fala de links.

O custo é declarado: **os wiki-links são texto inerte para qualquer consumidor
OKF**. Neste acervo, em 2026-09-16, são ~800 ocorrências e ~223 alvos distintos
(acervo vivo: o número deriva a cada merge, por isso vem datado) — **o grafo inteiro
fica invisível** de fora.

> **[CASA] `[[slug]]` PODE continuar, como atalho de escrita, e o portão (§9) DEVE
> cobrar que todo alvo exista.** Um conceito que queira ser navegável de fora DEVE
> trazer também o link markdown relativo.

Regra prática: `[[slug]]` no meio da prosa; link markdown na linha "Ver também".

### 6.3 Link quebrado

**[OKF]** É **legal por desenho**, duas vezes: `SPEC.md:461-463` — *"a link whose
target does not exist in the bundle is not malformed; it **may simply represent
not-yet-written knowledge**"* — e `SPEC.md:758`.

> **[CASA] A casa NÃO aceita.** Link quebrado é **erro de portão** (§9).

O motivo: com centenas de links, **um rename quebra N referências e nenhuma
ferramenta OKF reclama**. A norma decidiu não cobrir esse risco; a casa cobre. Um
alvo ainda-não-escrito **DEVE** ser marcado como tal no texto, não deixado como
link solto.

### 6.4 O que o link NÃO carrega

**[OKF]** `SPEC.md:456-459`: a relação é **não-tipada** — *"The specific kind … is
conveyed by the **surrounding prose**, not by the link itself"*. "Mesma família
de", "corrigido por", "supersedido por" **viram todos a mesma aresta**.

**[CASA]** Logo, a prosa ao redor do link **DEVE** dizer a relação. "Ver [[x]]"
sozinho perde informação que ninguém recupera.

---

## 7. Timestamps

**[OKF, texto canônico consultado em 2026-09-19]** O
[SPEC.md upstream](https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md)
define em suas linhas 255-256 que toda chave de timestamp usa data e hora ISO
8601 com offset UTC explícito. A cópia local antiga de 1003 linhas continua útil
para os demais conceitos, mas suas definições de data para alguns campos
opcionais divergem do texto canônico atual, ainda chamado de **v0.2**.

> **[CASA] Todo timestamp DEVE ter offset UTC explícito.** Uma data civil
> isolada NÃO DEVE aparecer em chave temporal de frontmatter.

No corpo, uma data por extenso DEVE ser absoluta: 10/09 sem ano fica ambíguo
no ano seguinte.

Isso atinge **cinco famílias** de campos opcionais: sources[].last_modified
(SPEC.md upstream:269), usage_window.from e .to (:270,299-301),
generated.at (:339-341), verified[].at (:348-351) e stale_after (:382-389).
O valor de stale_after agora é um **instante**, com comparação
now >= stale_after; não uma data civil. Em 2026-09-19, este acervo não usa
os três campos recém-alterados, então não havia valores legados a converter.

**[CASA]** O portão verifica esses campos quando presentes. A exigência de
formato fica separada dos **três itens mínimos** de conformidade do §11
(SPEC.md upstream:664-688): a ausência deles não reprova um conceito.

⚠️ **Alerta de método, [CASA]:** o Google **alterou texto normativo mantendo o
número da versão** — a cópia local (1003 linhas) e a upstream (1006) dizem as duas
"Version 0.2" e **não são o mesmo documento**. `SPEC.md:763-771` define minor como
adição compatível, e essa emenda é **aperto de requisito**, sem bump.

> **[CASA] Declarar `okf_version` NÃO basta.** Quem declarar conformidade **DEVE**
> registrar junto **a data ou o commit do SPEC consumido**. E como
> `index.md` só admite a chave `okf_version` no frontmatter (`SPEC.md:773-775`),
> esse registro vai **na prosa** do índice.

Fonte canônica atual: **`GoogleCloudPlatform/open-knowledge-format`**. O
`knowledge-catalog/okf/` está **congelado** e ainda é citado por instruções antigas
da casa.

---

## 8. Campos opcionais

**[OKF]** Todos são opcionais (`SPEC.md:281-282`) e a ausência nunca é rejeitada.

### 8.1 Adotados

| Campo | Citação | Por que na casa |
|---|---|---|
| `title` | `SPEC.md:192-193` | O título editorial ("A TELA DELE achou o que 4 rodadas de revisor não acharam") hoje vive **só no índice curado** e se perde se ele for regerado. O lugar dele é o frontmatter. |
| `tags` | `SPEC.md:199`, `146-149` | Os eixos transversais (número de issue, D12/D13, corpus, revisor, live-verify) hoje são emoji e prosa. Tags são o mecanismo first-class, e a visão por tag é **sintetizada no consumo** — sem arquivo por tag. |
| `generated{by,at}` | `SPEC.md:370-377` (`by` REQUIRED em `:374`) | Substitui a data solta no corpo e chaves fora-da-norma. Formato de ator em `SPEC.md:486-495`. |
| `verified[]` | `SPEC.md:379-396`, tiers `:398-408` | **A maior vitória.** A casa distingue obsessivamente "eu afirmei" de "o `dcc32` confirmou" de "a tela dele provou" — e isso hoje só existe em prosa. `verified: {by: human:isaque, at: …}` **é** o registro de live-verify. O prefixo `human:` é **MUST** (`SPEC.md:497-498`). |
| `status` | `SPEC.md:409-419` | Mapeia direto em "Concluídos (histórico)". `deprecated` = *"kept for links and history; no longer current"* (`:417`). Ausente ⇒ `stable` (`:419`), então **só se anota a exceção**. |
| `sources[]` | `SPEC.md:290-310` (`resource` REQUIRED em `:302-305`) | A casa já cita procedência real (`System.Classes.pas:16402`, `#179`, `ToolsAPI.pas`). Aceita URL, caminho bundle-relativo **ou descritor de escopo** que o consumidor não consegue seguir. Com `id`, vem atribuição por afirmação via footnote **keyed** (`SPEC.md:347-357`) — desenhada justamente porque agentes reescrevem o documento. |

**PODE, com parcimônia:**

- `resource` (`SPEC.md:196-198`) — *"Absent for concepts that describe abstract
  ideas"*. A maioria das memórias é abstrata ⇒ **omitir**.
- `stale_after` (`SPEC.md:421-430`, upstream `424-433`) — **instante absoluto, não
  TTL**. Só faz sentido em memória de **estado** (o "retomar por aqui"), que de
  fato caduca. Observação não expira, envelhece.

### 8.2 Rejeitados — é convenção do Google, não norma

- **A família `Attested Computation` / §10** (`runtime`, `parameters`,
  `computation`, `executor`, `attester`, `SPEC.md:553-667`) — irrelevante, e
  `runtime` vira REQUIRED no instante em que se toca nela.
- **`usage_count` / `usage_window`** (`SPEC.md:320-338`) — sinal de adoção de
  query/dashboard; a própria norma o chama de *"a coarse signal … not a precise
  cross-kind ranking"*. Sem significado aqui.
- **Layout `tables/`, `metrics/`, `policies/`, `skills/`, `attesters/`** — amostra.
- **Headings convencionais de corpo** (`SPEC.md:218-222`) — `SPEC.md:215-216`:
  *"There are **no required body sections**"*.
- **`type: Log` no `log.md`** — isso é a amostra do Google, e a norma é silente.

### 8.3 Chaves da casa

**[OKF]** `SPEC.md:205-207`: produtor **PODE** incluir qualquer chave, consumidor
**SHOULD** preservá-las em round-trip e **MUST NOT** rejeitar.

**[CASA]** As chaves da casa vivem sob `metadata:`, agrupadas, para que se
distingam de campo da norma num relance. Chave da casa que passe a existir na norma
**DEVE** migrar para a raiz e deixar de ser da casa.

---

## 9. O portão

**[OKF → o vazio]** Não existe validador de OKF **em lugar nenhum**: nem na norma
(o §11 define conformidade mas não obriga ninguém a checá-la), nem no tooling do
Google (só `enrich` e `visualize`; a única checagem em código roda na **escrita** e
só cobra `type`). **Nada valida um bundle na leitura.**

> **[CASA] Cada repo com `.project/` DEVE ter um portão que roda antes do commit e
> falha o commit.**

O fluxo da casa — agente escrevendo memória a cada merge — é exatamente o cenário
em que um `type` some e ninguém nota.

### 9.1 O que o portão DEVE checar

**Conformidade OKF (erro):**

1. Todo `.md` não-reservado tem frontmatter YAML **parseável**.
2. Todo frontmatter tem `type` **não-vazio na RAIZ**.
3. `index.md` **sem** frontmatter — exceto `okf_version` no índice da raiz.
4. `log.md`, se existir, com headings `YYYY-MM-DD`, mais novo primeiro.
5. Nome reservado nunca usado como conceito (`SPEC.md:137-144`).

**Regras da casa (erro):**

6. `type` ∈ { `user`, `feedback`, `project`, `reference`, `curated-index` }.
   *A norma manda tolerar tipo desconhecido na LEITURA; a casa é PRODUTORA, e
   produtora fecha o vocabulário.*
7. `name:` == caminho do arquivo sem `.md`.
8. `description:` presente, não vazia, **uma linha**.
9. **Integridade de link**: todo alvo relativo e todo `[[slug]]` resolve para
   arquivo existente. *O OKF tolera de propósito; a casa não (§6.3).*
10. `index.md` **em dia**: nenhum conceito ausente, nenhuma entrada morta.
11. Todo timestamp de frontmatter com **offset UTC explícito**.
12. `verified[].by` de humano com prefixo `human:`.
13. `metadata.visibility`, **quando presente**, ∈ { `private`, `public` }.
    *Ausente ⇒ `private` (§11.1). Exigir a chave em todo conceito seria regra
    escrita e não cumprida — ela existe em 2 dos 272 arquivos.*

**Aviso, não erro:**

14. Entrada do `MEMORY.md` apontando para conceito inexistente, ou conceito sem
    nenhuma entrada curada há muito tempo.
15. `status: deprecated` ainda linkado como se fosse corrente.
16. **`MEMORY.md` acima do orçamento de contexto do harness** (§5.2). Não torna
    o bundle não-conforme — a norma é silente sobre tamanho de índice — mas o
    harness **trunca em silêncio**, e prioridade curada que não carrega é
    prioridade que não existe. O portão imprime o excesso e as linhas longas.

### 9.2 Como o portão se comporta

> **[CASA] O portão DEVE FALHAR, nunca degradar.**

Regra já paga com o tempo do dono: *"aspas faltando devolveram relatório com cara
de válido"*. **Degradar é pior que falhar** — modo reduzido só por bandeira
explícita, nunca por acidente.

**[CASA]** O portão **NÃO DEVE** consertar sozinho, exceto regerar o `index.md`
(item 10), que é derivado por definição.

### 9.3 O que o portão NÃO alcança

**[CASA]** Declarado, para ninguém confundir verde com garantia:

- **Um fato por arquivo** (§3.4) — não verificável; é revisão.
- **O fato ser verdadeiro.** O portão prova forma, não conteúdo. Conteúdo se prova
  medindo, e é o dono quem confirma (`verified[]`).
- **Relação de link** (§6.4) — o OKF não a tipa e o portão não a adivinha.

---

## 10. Ciclo de vida

### 10.1 Quando se escreve

**[CASA] DEVE** virar conceito:

- O dono **corrigir** o agente — a correção e **o porquê** dela.
- Algo **medido** contradizer uma suposição que estava sendo usada.
- Uma armadilha **custar tempo** (ferramenta que mente, gate que mede a máquina,
  script que morre em silêncio).
- Uma **decisão** ser tomada com alternativa descartada — grava-se a decisão **e** o
  que foi descartado, ou ela volta à mesa.
- Um **merge** mudar estado que o código não conta.

**NÃO DEVE** virar conceito: o que o código diz, o que o git conta, o que só
importa nesta conversa.

### 10.2 Atualizar em vez de duplicar

> **[CASA] Antes de escrever, DEVE procurar conceito existente que já cubra o
> assunto, e atualizar esse arquivo.**

Duplicata é pior que ausência: duas versões do mesmo fato derivam, e no dia da
divergência ninguém sabe qual vale. Ao atualizar, `generated.at` muda e o corpo
**DEVE** dizer o que mudou — não se apaga a medição anterior em silêncio quando ela
explica o caminho.

### 10.3 Quando se apaga

**[CASA] DEVE** apagar quando o fato se provou **errado**. Fato errado é pior que
nenhum — é ativamente enganoso.

**NÃO DEVE** apagar quando o fato apenas **passou** (o trabalho terminou, a versão
saiu): isso é `status: deprecated` (`SPEC.md:417`), porque há links apontando para
ele e porque o caminho percorrido é parte do conhecimento.

⚠️ Apagar arquivo **quebra links** e o OKF não avisa (§6.3). Antes de apagar,
**DEVE** varrer quem aponta para ele.

### 10.4 Como entra

**[CASA]**

1. A memória entra **por commit**, no repo do projeto. Nunca só no harness.
2. **PODE** e **DEVE** ir no **mesmo PR** do trabalho que a produziu — é onde ela
   tem contexto e revisor.
3. Memória avulsa (correção do dono fora de um PR) entra em PR próprio, pequeno.
4. O portão (§9) roda antes do commit.
5. **[CASA]** `git status` **DEVE** estar limpo antes de qualquer build — regra
   antiga da casa, e subagente que escreve vai para worktree.

---

## 11. Privacidade e classificação

**[OKF]** A norma **não diz absolutamente nada** sobre classificação, redaction ou
escopo de publicação. É silêncio total. Tudo abaixo é **[CASA]**.

### 11.1 A chave

> **[CASA] Todo conceito DEVE declarar `metadata.visibility`: `private` ou
> `public`.** Ausente ⇒ tratado como `private` pelo portão.

### 11.2 A regra

| | Repo **privado** | Repo **público** |
|---|---|---|
| `type: project`, `reference` do próprio produto | ✅ | ✅ se `visibility: public` |
| `type: user` | ✅ | ⛔ **nunca** |
| `type: feedback` | ✅ | ⛔ **nunca** — descreve o modo de trabalhar do dono |
| Medição sobre árvore de **empregador** ou de **cliente** | ✅ | ⛔ **nunca** |
| Segredo, credencial, token, chave | ⛔ | ⛔ |

**[CASA]** Nome de pessoa: por **papel** ("o dono", "o revisor", "um colega"), não
por nome ou e-mail, salvo o próprio dono no `verified[].by`.

**[CASA] Árvore de empregador e de cliente é o caso mais perigoso**, porque a
medição parece inócua ("19 descendentes de `TThread`") e carrega estrutura de código
que não é nossa. Em repo privado, PODE. Em repo público, **NÃO DEVE**, nem
anonimizada — a forma denuncia.

### 11.3 O momento do risco

> **[CASA] Tornar um repo público é operação que DEVE passar por revisão de
> classificação do `.project/` inteiro, feita ANTES, com o dono decidindo.**

O git **não esquece**: apagar depois não desfaz — o conceito continua no histórico.
Por isso a classificação é escrita no conceito, na hora em que ele nasce, e não
descoberta no dia da abertura do repo.

---

## 12. Conformidade deste documento

Este SPEC declara conformidade com **OKF v0.2**, texto **upstream** de
`GoogleCloudPlatform/open-knowledge-format`, lido em **2026-09-16**.

Onde a casa é **mais estrita** que o OKF, está marcado: vocabulário de `type`
fechado (§4), integridade de link como erro (§6.3), índice gerado cobrindo 100%
(§5.1), portão obrigatório (§9), classificação obrigatória (§11).

Onde a casa **diverge** de uma recomendação escrita do OKF, está marcado e
justificado: forma de link relativa em vez de absoluta (§6.1).

Onde o OKF é **silente**, está dito: "top-level" para `type` (§3.2), frontmatter em
`log.md` (§5.4), forma do corpo do índice (§5.1), tamanho do índice, convenção de
nome de arquivo, sintaxe não-markdown de link (§6.2), precedência entre `log.md` e
git (§5.4), classificação e privacidade (§11).
