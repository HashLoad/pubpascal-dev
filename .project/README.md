# `.project/` — o conhecimento que os agentes deste repo usam

Tudo o que um agente precisa saber sobre este projeto e que **não dá para deduzir
do código nem do git** vive aqui, versionado com o resto. Antes, vivia só em
`%USERPROFILE%\.claude\projects\…\memory\`: fora de qualquer repositório, sem
histórico, sem diff, legível por um harness só, e a um disco de distância de
sumir inteiro.

| | |
|---|---|
| `SPEC.md` | **A regra.** O que é norma OKF e o que é decisão da casa — cada linha rotulada `[OKF]` ou `[CASA]`. Leia antes de escrever memória. |
| `memory/` | O acervo: um fato por arquivo, em OKF v0.2. |
| `memory/index.md` | **Gerado** por `okf-index.py`. Cobertura total — todo conceito aparece aqui. Não edite à mão. |
| `memory/MEMORY.md` | **Curado.** Prioridade: o que ler primeiro, o que é história. É o índice que o agente carrega a cada sessão. |
| `okf-gate.py` | O portão. Exige PyYAML — sem parser ele **falha**, não degrada. |
| `okf-index.py` | O gerador do `index.md`. `--check` não escreve e falha se estiver desatualizado. |
| `docs-okf.py` | Portão e gerador do bundle técnico `../docs/`: verifica frontmatter, type, índice e links locais; `--write` regenera `docs/index.md`. |

## Dois bundles, duas responsabilidades

`memory/` registra decisões, estado e aprendizado que um agente recupera ao
trabalhar neste projeto. `../docs/` é o acervo técnico OKF: ADRs, roadmap,
estudos e regras ADLS com seus probes. README.md e CLAUDE.md na raiz são
entrada e instruções fora dos bundles. A documentação técnica não é copiada
para a memória: `memory/product-docs-and-decisions-map.md` cataloga cada
documento.

Após alterar um documento técnico, rode:

```powershell
python .project/docs-okf.py --write
python .project/docs-okf.py
```

A memória usa portões independentes: `python .project/okf-index.py --check`
e `python .project/okf-gate.py`.

## A pasta de memória do harness **é** esta pasta

`~/.claude/projects/D--DeveloperWeb-pubpascal-dev/memory` é uma **junção
de diretório** apontando para `.project/memory`. Não são duas cópias: é o mesmo
lugar por dois caminhos.

⇒ **Toda memória gravada numa sessão nasce dentro do repo**, e só falta o commit.
A alternativa — gravar fora e copiar depois — é exatamente o passo que
silenciosamente deixa de acontecer.

### Se a memória "sumir" — medido, não suposto

É a junção apontando para um lugar que a branch atual não tem. Uma branch cortada
**antes** de `.project/memory` existir não carrega esses arquivos, e o checkout
apaga `.project/` **inteira** — o alvo da junção deixa de existir e lê-la dá
`Could not find a part of the path`, não "pasta vazia".

Verificado em 2026-09-16 num clone descartável: 273 arquivos → `git checkout` de
branch pré-bundle → 0 arquivos e junção pendurada → `git checkout main` → 273 de
volta. **Nada se perde**: está versionado.

Na medição de **2026-09-16** havia **7** branches remotas nessa condição;
a lista abaixo é histórica e deve ser refeita pelo comando seguinte:

```
census/member-not-offered          feat/the-chain-is-the-leak
ci/on-our-own-machine  ← TEM o bundle    feat/the-creation-names-the-type
feat/a-mark-that-becomes-the-lamp  fix/the-echo-invents-a-position
feat/an-enumeration-has-members    spike/can-we-write-in-the-structure-pane
```

Para refazer a lista (o número deriva a cada merge):

```bash
for b in $(git branch -r --format='%(refname:short)' | grep -v HEAD); do
  git ls-tree --name-only "$b" .project/memory/ | grep -q . || echo "$b"
done
```

> 🕳️ **O modo pior, que não é o descrito acima.** Se uma sessão **gravar** memória
> enquanto você está numa branch pré-bundle, o arquivo nasce **untracked** — e aí
> voltar para o `main` **falha**:
>
> ```
> error: The following untracked working tree files would be overwritten by checkout:
>         .project/memory/MEMORY.md
> ```
>
> ⛔ **Não obedeça ao "move or remove them"** — o arquivo a remover é a memória
> nova. Mova para fora (`mv .project/memory/<novo>.md ~/`), faça o checkout, e
> devolva o arquivo depois.

**A prevenção, e é barata:** trabalhe em branch **cortada do `main` atual**, ou
rebaseie a antiga antes de usá-la. `git merge origin/main` numa branch velha
resolve de vez.

Para conferir para onde a junção aponta:

```powershell
(Get-Item "$env:USERPROFILE\.claude\projects\D--Ecossistema-Delphi-PubPascal\memory").Target
```

Para recriá-la (não precisa de admin, e a IDE pode estar aberta):

```powershell
$live = "$env:USERPROFILE\.claude\projects\D--Ecossistema-Delphi-PubPascal\memory"
if (Test-Path $live) { Rename-Item $live "memory-pre-okf-<data>" }
New-Item -ItemType Junction -Path $live -Target "D:\Ecossistema-Delphi\PubPascal\.project\memory"
```

⚠️ **Renomeie, nunca apague** a pasta que estiver lá.

### ⚠️ `memory-pre-okf-junction` **não é** um backup

O que existe hoje ao lado da junção com esse nome é **outra junção**, apontando
para `~\.claude\projects\D--Ecossistema-Delphi-Aefos-AI\memory`. Confira:

```powershell
(Get-Item "$env:USERPROFILE\.claude\projects\D--Ecossistema-Delphi-PubPascal\memory-pre-okf-junction" -Force).LinkType
```

Duas consequências que valem saber:

1. **A pasta de memória deste projeto sempre foi COMPARTILHADA** com a do
   `Aefos-AI` (e ainda é com a do `Aefos-CodeSense`, que continua apontando para
   lá). Não havia 269 memórias "do Analyzer": havia um acervo só, visto por três
   caminhos. É por isso que o acervo cobre Lazarus, WebView2, loja de addons e
   releases 1.5.x/1.6.0 — ver §2.3 do `SPEC.md`, "o fato mora onde ele morre".
2. **Não existe cópia pré-OKF em lugar nenhum.** A migração de 2026-09-16 reescreveu
   o frontmatter **no lugar**, através da junção, e só depois copiou para o repo —
   os 271 arquivos daquela pasta estão migrados, não originais. O que se perdeu é
   pequeno (frontmatter, não corpo) e o `git` cobre daqui para a frente, mas a
   regra *"backup antes de reescrever centenas de arquivos"* não foi cumprida e
   está registrada aqui para não se repetir.

## Acrescentar uma memória

1. Um arquivo, **um fato**, em `memory/<type>-<slug>.md`. Se já existe arquivo
   que cobre aquilo, **atualize-o** em vez de criar irmão — duplicata é como o
   acervo passa a se contradizer.
2. Frontmatter com `type` **na raiz** (não só sob `metadata`), `name` igual ao
   caminho do arquivo sem `.md`, e `description` de **uma linha**. O `SPEC.md` tem
   o frontmatter canônico completo.

   > 🩸 **Ponha a `description` entre aspas SIMPLES.** Um `: ` no meio de um escalar
   > YAML sem aspas quebra o bloco inteiro — foi assim que **7** arquivos deste
   > acervo ficaram com frontmatter ilegível sem ninguém notar. E **não use aspas
   > duplas**: elas transformam o `\` de caminho Windows em escape (`D:\Ecossistema`
   > → `\E` inválido), que foi o oitavo caso. Em aspas simples só a própria aspa
   > precisa dobrar (`''`).

3. Uma linha no `MEMORY.md` se o fato merece prioridade — **abaixo de ~200
   caracteres**, senão o índice curado estoura o contexto e o harness trunca em
   silêncio. O `index.md` **não** se edita: regere.
4. Rode o gerador e o portão. Commite.

## Rodar o portão

```
python .project/okf-gate.py
```

Sai 0 conforme, 1 reprovado, e imprime os três itens do §11 um a um.

Ele existe porque **não existe validador de OKF em lugar nenhum** — nem na spec,
que define conformidade sem obrigar ninguém a checá-la, nem no tooling de
referência do Google, cuja única checagem roda na escrita e cobra apenas `type`.
Sem portão, um `type` some num commit e ninguém nota até a memória deixar de ser
recuperada em sessão, que é uma falha silenciosa por construção.

Ele cobra, além dos três itens: identidade (`name` espelhando o **caminho**),
vocabulário de `type`, `description` de uma linha, timestamps com offset UTC nas
duas chaves que a norma tipa como datetime, cobertura **e entradas mortas** do
`index.md`, e **integridade de link** — que o OKF deliberadamente **não** cobre
(`SPEC.md:461-463`: link quebrado "may simply represent not-yet-written
knowledge").

### O portão **parseia** o YAML — e por que isso é a linha mais importante

A primeira versão conferia o frontmatter por expressão regular e imprimia
`§11.1 ok` sobre **7 arquivos que o PyYAML recusa**. Uma auditoria independente
em 2026-09-16 achou os 7: o portão estava afirmando algo que nunca mediu, que é
exatamente a falha registrada em `reference-a-door-that-warns-and-carries-on`
— e que era, ironicamente, um dos 7.

Outras armadilhas que só o parser pega, todas provadas por mutação:

- **`type:` duplicado** — a regex lê a **primeira** ocorrência, o YAML fica com a
  **última**. Portão e consumidor lendo valores diferentes do mesmo arquivo.
- **`.md` em subdiretório** — o portão varria um nível só (`os.listdir`). A norma
  diz *"every non-reserved `.md` file **in the tree**"* (`SPEC.md:737`). Hoje o
  acervo é plano, então o custo era zero — e no dia da primeira subpasta o portão
  mentiria sem mudar uma linha. Agora usa `os.walk`.
- **entrada morta no `index.md`** — apagar um conceito que só o índice citava
  deixava tudo verde e o índice mentindo.

Sem PyYAML o portão **sai com erro**, nunca em modo reduzido: `§9.2` do `SPEC.md`
— *degradar é pior que falhar*.

🩸 **Verde não é garantia de acervo bom.** O portão não alcança um fato por
arquivo, não julga se o fato é verdadeiro, não sabe se o fato pertence a **este**
produto, e não sabe que relação um link afirma — em OKF toda aresta é não-tipada.

## Regerar o `index.md`

```
python .project/okf-index.py            # regera
python .project/okf-index.py --check    # não escreve; sai 1 se está desatualizado
```

O índice é derivado: cobre todos os conceitos, com a `description` de cada um, e
não leva frontmatter (`SPEC.md:510-511`). Regere sempre que conceitos entrarem ou
saírem — e deixe o portão dizer se sobrou alguém de fora.

> Até 2026-09-16 esta seção mandava "regere" e **não havia com o quê**. Passo
> manual documentado é passo manual esquecido: o índice só cobria 100% enquanto
> alguém lembrasse de refazer à mão o arquivo que o `SPEC.md` proíbe editar à mão.
