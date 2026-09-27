#!/usr/bin/env python3
"""Portao de conformidade do acervo OKF da casa.

Existe porque NAO existe validador de OKF em lugar nenhum -- nem na spec, que
define conformidade (SPEC.md:733-741) sem obrigar ninguem a checa-la, nem no
tooling de referencia do Google, que so tem `enrich` e `visualize`. A unica
checagem em codigo de la roda na ESCRITA, e cobra apenas `type`.

Sem isto, um `type` some num commit e ninguem nota ate a memoria deixar de ser
recuperada em sessao -- que e uma falha silenciosa por construcao.

⚠️ O portao PARSEIA o YAML. A versao anterior conferia o frontmatter por regex e
imprimia "§11.1 ok" sobre 7 arquivos cujo bloco o PyYAML RECUSA -- afirmacao
sobre algo que ele nunca mediu. `SPEC.md:737-738` cobra frontmatter *parseable*,
e a implementacao de referencia chama `yaml.safe_load` e levanta
`OKFDocumentError` (`bundle/document.py:42-47`). Regex nao verifica isso, e ler
por regex ainda diverge do consumidor em chave duplicada: `re.search` pega a
PRIMEIRA ocorrencia, o YAML fica com a ULTIMA.

Uso:  python .project/okf-gate.py [caminho-do-bundle]
Sai 0 se conforme, 1 se nao. Imprime os tres itens do §11 um a um.
"""

import datetime
import io
import os
import re
import sys

if hasattr(sys.stdout, "reconfigure"):  # o console do Windows nao e UTF-8
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    import yaml
except ImportError:  # [CASA] SPEC.md(casa):§9.2 -- FALHAR, nunca degradar.
    sys.stderr.write(
        "okf-gate: PyYAML ausente.\n"
        "O §11.1 exige frontmatter YAML PARSEAVEL; sem parser este portao nao\n"
        "tem como verificar o item 1 e NAO vai fingir que verificou.\n"
        "Instale:  python -m pip install pyyaml\n"
    )
    sys.exit(2)

RESERVED = {"index.md", "log.md"}  # SPEC.md:136-144, em QUALQUER nivel
CURATED = "MEMORY.md"
# [CASA] vocabulario fechado. O OKF nao registra tipos (SPEC.md:182-185) e o
# consumidor DEVE tolerar tipo desconhecido; quem fecha e o PRODUTOR.
VOCAB = {"user", "feedback", "project", "reference", "product", "curated-index"}
# [CASA] `product` (SPEC da casa §4.1) e o unico type cuja definicao exige
# proveniencia medida. O portao cobra o que consegue verificar sem ler o codigo:
# que a entrada de `sources` traga `resource`, que e REQUIRED por SPEC.md:302 --
# o mesmo item que um `file:` ou `path:` "natural" deixaria em falta.
PROVENANCED = {"product"}

# [CASA] orcamento do indice curado. §5.2 do SPEC da casa: `MEMORY.md` DEVE
# caber no limite de contexto do harness. O numero NAO e do OKF (a norma e
# silente sobre tamanho de indice): e o limite que o proprio harness reportou
# ao truncar o arquivo -- "MEMORY.md is 28.3KB (limit: 24.4KB) ... Only part of
# it was loaded". Aviso, nao erro (§9.1, bucket "Aviso"): passar do limite nao
# torna o bundle nao-conforme, mas apaga prioridade curada em toda sessao.
CURATED_BUDGET_CHARS = 24 * 1024 + 410  # 24,4 KiB, como o harness reporta
CURATED_LINE_HINT = 200  # o proprio harness pede "one line under ~200 chars"

# Texto upstream consultado em 2026-09-19: todas as cinco familias de chaves
# temporais opcionais exigem datetime ISO 8601 com offset explicito. A copia local
# antiga da SPEC ainda descreve tres delas como datas civis.
TS_OK = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$")
DATE_OK = re.compile(r"^\d{4}-\d{2}-\d{2}$")
# SPEC.md:488-498 -- tres formas de ator, e `human:` e MUST para humano.
ACTOR_OK = re.compile(r"^(human:\S+|process:\S+|[^/\s]+/[^/\s]+)$")


def split_frontmatter(text):
    """Devolve (bloco, resto) ou (None, texto) quando nao ha frontmatter."""
    if not text.startswith("---\n"):
        return None, text
    end = text.find("\n---", 4)
    if end == -1:
        return None, text
    return text[4:end], text[end + 4 :]


def concept_ids(root):
    """Todo `.md` nao-reservado da ARVORE (SPEC.md:737 -- 'in the tree').

    Devolve {concept_id: caminho_no_disco}. O Concept ID e o caminho relativo
    dentro do bundle sem `.md` (SPEC.md:79-80), com barra POSIX -- a norma e
    silente quanto ao separador, mas a implementacao de referencia usa
    `rel.parts` / `split("/")` (`bundle/paths.py:23-34`).
    """
    out = {}
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for fn in filenames:
            if not fn.endswith(".md") or fn in RESERVED:
                continue
            rel = os.path.relpath(os.path.join(dirpath, fn), root)
            out[rel.replace(os.sep, "/")[:-3]] = os.path.join(dirpath, fn)
    return out


def walk_scalars(node, path=()):
    """Gera (caminho_de_chaves, valor) para todo escalar do frontmatter."""
    if isinstance(node, dict):
        for k, v in node.items():
            yield from walk_scalars(v, path + (str(k),))
    elif isinstance(node, list):
        for v in node:
            yield from walk_scalars(v, path + ("[]",))
    else:
        yield path, node


def check_index(path, at_bundle_root, ids, curated, fails):
    """§11.3 + regra da casa: sem frontmatter, cobre tudo, sem entrada morta."""
    text = io.open(path, encoding="utf-8").read()
    if text.startswith("---"):
        block, _ = split_frontmatter(text)
        allowed = False
        if block is not None and at_bundle_root:
            try:  # SPEC.md:510-511 e :773-775 -- UMA excecao, so na raiz
                d = yaml.safe_load(block)
                allowed = isinstance(d, dict) and set(d) == {"okf_version"}
            except yaml.YAMLError:
                allowed = False
        if not allowed:
            fails.append(
                "[§11.3] %s: frontmatter proibido (SPEC.md:510-511; so a raiz "
                "PODE levar `okf_version`, sozinha)" % os.path.basename(path)
            )
    listed = set(re.findall(r"\]\(([^)]+)\.md\)", text))
    # [CASA] §9.1 item 10: "nenhum conceito ausente, nenhuma entrada morta".
    # O lado "entrada morta" nunca foi checado -- apagar um conceito que so o
    # indice citava deixava o portao verde e o indice mentindo.
    dead = sorted(t for t in listed if t not in ids and t != CURATED[:-3])
    if dead:
        fails.append(
            "[CASA] index.md com %d entrada(s) MORTA(s) (conceito nao existe): %s"
            % (len(dead), ", ".join(dead[:5]))
        )
    missing = sorted(set(ids) - listed - curated)
    if missing:
        fails.append(
            "[CASA] index.md nao cobre %d conceito(s): %s"
            % (len(missing), ", ".join(missing[:5]))
        )


def check_log(path, fails):
    """§9 do OKF: headings de data `YYYY-MM-DD`, mais novo primeiro (SPEC.md:547)."""
    text = io.open(path, encoding="utf-8").read()
    if text.startswith("---"):
        fails.append("[§11.3] log.md tem frontmatter")
    dates = re.findall(r"^#+\s*(\S+)\s*$", text, re.M)
    bad = [d for d in dates if not DATE_OK.match(d)]
    if bad:
        fails.append("[§11.3] log.md: heading nao-data %s (SPEC.md:547)" % bad[:3])
    ok = [d for d in dates if DATE_OK.match(d)]
    if ok != sorted(ok, reverse=True):
        fails.append("[§11.3] log.md: datas fora de ordem (mais novo primeiro)")


def main(root):
    fails, notes = [], []
    ids = concept_ids(root)
    if not ids:
        print("nenhum conceito em %s" % root)
        return 1

    curated = set()

    # ---- §11 itens 1 e 2, mais as regras da casa, arquivo a arquivo ----------
    for cid in sorted(ids):
        path = ids[cid]
        text = io.open(path, encoding="utf-8").read()
        block, _ = split_frontmatter(text)
        if block is None:
            fails.append("[§11.1] %s: sem bloco de frontmatter YAML" % cid)
            continue
        try:
            fm = yaml.safe_load(block)
        except yaml.YAMLError as exc:
            first = str(exc).splitlines()[0]
            fails.append("[§11.1] %s: YAML nao parseia -- %s" % (cid, first))
            continue
        if not isinstance(fm, dict):
            # bundle/document.py:46-47 -- "Frontmatter must be a YAML mapping"
            fails.append("[§11.1] %s: frontmatter nao e um mapping YAML" % cid)
            continue

        # A implementacao de referencia le `type` na RAIZ do mapping
        # (document.py:10,59): um `type` sob `metadata` e indistinguivel de
        # type ausente, e uma chave `type:` DUPLICADA vale a ULTIMA.
        t = fm.get("type")
        t = t.strip() if isinstance(t, str) else t
        if not t:
            nested = isinstance(fm.get("metadata"), dict) and fm["metadata"].get("type")
            fails.append(
                "[§11.2] %s: sem `type` na raiz do frontmatter%s"
                % (cid, " (existe aninhado sob `metadata`)" if nested else "")
            )
        elif t == "curated-index":
            curated.add(cid)
        elif t not in VOCAB:
            fails.append("[CASA] %s: type `%s` fora do vocabulario %s" % (cid, t, sorted(VOCAB)))

        # [CASA] o Concept ID do OKF e o CAMINHO (SPEC.md:79-80); `name:` que
        # diverge e o documento discordando do formato sobre a propria
        # identidade. Ausente tambem e divergencia: nao havia checagem nenhuma.
        n = fm.get("name")
        if n is None:
            fails.append("[CASA] %s: sem `name`" % cid)
        elif str(n).strip() != cid:
            fails.append("[CASA] %s: `name: %s` nao espelha o caminho" % (cid, n))

        d = fm.get("description")
        if cid != CURATED[:-3]:
            if not (isinstance(d, str) and d.strip()):
                fails.append("[CASA] %s: sem `description`" % cid)
            elif "\n" in d.strip():
                # §9.1 item 8: uma linha. Um bloco `>-` de tres linhas dobra em
                # frase unica e passa; um `|-` preserva a quebra e nao passa.
                fails.append("[CASA] %s: `description` com mais de uma linha" % cid)

        for keys, val in walk_scalars(fm):
            # PyYAML transforma timestamps validos em datetime e datas civis
            # em date. Validar os dois evita que o parser pule a propria regra.
            if isinstance(val, (datetime.datetime, datetime.date)):
                lexical = val.isoformat()
            elif isinstance(val, str):
                lexical = val.strip()
            else:
                continue
            temporal = (
                keys[-1] == "at"
                or keys == ("stale_after",)
                or keys == ("sources", "[]", "last_modified")
                or (keys[:1] == ("usage_window",) and keys[-1] in ("from", "to"))
            )
            if temporal and not TS_OK.match(lexical):
                fails.append("[CASA] %s: `%s: %s` sem datetime com offset UTC explicito"
                             % (cid, ".".join(keys), val))
            if keys[:1] == ("verified",) and keys[-1] == "by" and not ACTOR_OK.match(val.strip()):
                # SPEC.md:488-498 -- `human:<id>`, `process:<id>` ou
                # `<producer>/<version>`; `human:` e MUST para humano.
                fails.append("[CASA] %s: `verified[].by: %s` fora das tres formas "
                             "de ator (SPEC.md:488-498)" % (cid, val))

        # SPEC.md:374 -- `by` e REQUIRED assim que `generated` existe. Vale para
        # TODO type, nao so `product`: escrever so `at:` e o disparo acidental
        # mais provavel de um REQUIRED condicional (parecer okf-specialist,
        # 2026-09-19). Nao derruba o §11 -- derruba a leitura de proveniencia.
        gen = fm.get("generated")
        if isinstance(gen, dict) and not str(gen.get("by") or "").strip():
            fails.append("[OKF] %s: `generated` presente sem `by` (SPEC.md:374)" % cid)

        # SPEC.md:302 -- `resource` e REQUIRED em CADA entrada de `sources`.
        for i, entry in enumerate(fm.get("sources") or []):
            if not isinstance(entry, dict):
                fails.append("[OKF] %s: `sources[%d]` nao e um mapping" % (cid, i))
            elif not str(entry.get("resource") or "").strip():
                fails.append(
                    "[OKF] %s: `sources[%d]` sem `resource` (SPEC.md:302) -- um "
                    "`file:`/`path:` no lugar dele deixa a entrada sem o campo "
                    "obrigatorio" % (cid, i)
                )

        # [CASA] SPEC da casa §4.1: `product` e o type que afirma ter sido MEDIDO.
        # Sem `sources`, a afirmacao nao tem onde ser conferida.
        if t in PROVENANCED and not (fm.get("sources") or []):
            fails.append(
                "[CASA] %s: type `%s` sem `sources` -- §4.1 exige a proveniencia "
                "medida; sem ela e um `reference` mal classificado" % (cid, t)
            )

        vis = (fm.get("metadata") or {}).get("visibility") if isinstance(fm.get("metadata"), dict) else None
        if vis is not None and vis not in ("private", "public"):
            # §11.1 da casa: ausente ⇒ tratado como `private`. So o valor
            # INVALIDO e erro -- exigir a chave em todo arquivo seria regra
            # escrita e nao cumprida (esta em 2 de 272).
            fails.append("[CASA] %s: `metadata.visibility: %s` invalido" % (cid, vis))

    # ---- §11 item 3: os nomes reservados, em qualquer nivel ------------------
    seen_index = False
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for fn in filenames:
            if fn == "index.md":
                seen_index = True
                check_index(os.path.join(dirpath, fn),
                            os.path.abspath(dirpath) == os.path.abspath(root),
                            ids, curated, fails)
            elif fn == "log.md":
                notes.append("log.md em %s: a casa nao usa (o git e o log); §9 vale para ele"
                             % os.path.relpath(dirpath, root))
                check_log(os.path.join(dirpath, fn), fails)
    if not seen_index:
        # SPEC.md:759 -- consumidor NAO DEVE rejeitar bundle sem index.
        # [CASA] mas o indice gerado e o que impede conceito invisivel.
        fails.append("[CASA] index.md ausente: sem ele nao ha garantia de cobertura")

    # ---- integridade de link: o OKF NAO cobre isto de proposito -------------
    # SPEC.md:461-463 + :758 -- link quebrado "may simply represent
    # not-yet-written knowledge" e o consumidor NAO DEVE rejeitar por causa
    # dele. [CASA] aqui e erro: com centenas de links, um rename silencioso
    # apaga relacoes que ninguem reconstroi depois.
    broken = {}
    for cid in sorted(ids):
        base = os.path.dirname(cid)
        text = io.open(ids[cid], encoding="utf-8").read()
        targets = re.findall(r"\[\[([^\]]+)\]\]", text)
        targets += [t for t in re.findall(r"\]\(([^)]+)\)", text)
                    if "://" not in t and t.endswith(".md")]
        for raw in targets:
            t = raw.strip().split("#")[0].split("|")[0].strip()
            if t.endswith(".md"):
                t = t[:-3]
            if not t:
                continue
            resolved = (t.lstrip("/") if t.startswith("/")
                        else os.path.normpath(os.path.join(base, t)).replace(os.sep, "/"))
            if resolved in ids or resolved.rsplit("/", 1)[-1] in ("index", CURATED[:-3]):
                continue
            broken.setdefault(resolved, []).append(cid)
    for t, where in sorted(broken.items()):
        fails.append("[CASA] link para conceito inexistente `%s` (em %s)" % (t, ", ".join(where[:3])))

    # ---- aviso: o indice curado tem de CABER (§5.2 da casa) ------------------
    cpath = os.path.join(root, CURATED)
    if os.path.exists(cpath):
        ctext = io.open(cpath, encoding="utf-8").read()
        if len(ctext) > CURATED_BUDGET_CHARS:
            longest = [l for l in ctext.splitlines() if len(l) > CURATED_LINE_HINT]
            notes.append(
                "%s tem %d chars, %d ACIMA do orcamento de %d -- o harness TRUNCA e a "
                "prioridade curada some da sessao sem aviso. §5.2: encurta-se ENTRADA, "
                "nunca cobertura. %d linha(s) passam de %d chars e somam %d de excesso."
                % (CURATED, len(ctext), len(ctext) - CURATED_BUDGET_CHARS,
                   CURATED_BUDGET_CHARS, len(longest), CURATED_LINE_HINT,
                   sum(len(l) - CURATED_LINE_HINT for l in longest))
            )

    # ---- relatorio ----------------------------------------------------------
    subdirs = sum(1 for c in ids if "/" in c)
    print("bundle: %s" % root)
    print("conceitos: %d  (em subdiretorio: %d)  |  parser: PyYAML %s"
          % (len(ids), subdirs, yaml.__version__))
    print("")
    print("§11.1 frontmatter YAML PARSEAVEL em todo .md nao-reservado .. %s" % verdict(fails, "§11.1"))
    print("§11.2 `type` nao-vazio na raiz do mapping .................. %s" % verdict(fails, "§11.2"))
    print("§11.3 index.md/log.md seguem §8/§9 ......................... %s" % verdict(fails, "§11.3"))
    print("CASA  identidade, vocabulario, links, indice, timestamps ... %s" % verdict(fails, "[CASA]"))
    for n in notes:
        print("  aviso: %s" % n)
    if fails:
        print("")
        for x in fails:
            print("  %s" % x)
        print("")
        print("REPROVADO: %d problema(s)" % len(fails))
        return 1
    print("")
    print("APROVADO")
    # O portao nao alcanca: um fato por arquivo, veracidade do conteudo, se o
    # fato pertence a ESTE produto, e o TIPO da relacao que um link afirma
    # (SPEC.md:456-459 -- toda aresta e nao-tipada). Verde aqui nao e garantia
    # de acervo bom.
    return 0


def verdict(fails, tag):
    return "FALHA" if any(tag in f for f in fails) else "ok"


if __name__ == "__main__":
    base = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "memory")
    sys.exit(main(os.path.abspath(base)))
