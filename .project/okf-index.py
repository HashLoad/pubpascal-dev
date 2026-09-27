#!/usr/bin/env python3
"""Gera o `index.md` do bundle -- o indice de COBERTURA.

Existe porque o `README.md` mandava "regere o index.md" e **nao havia com o
que**. Passo manual descrito e passo manual esquecido: o indice so cobria 100%
enquanto alguem lembrasse de refazer a mao o arquivo que o SPEC da casa (§5.1)
proibe editar a mao. Era divida, nao entrega.

O que a norma obriga, e so isto (§8, SPEC.md:502-526):
  - MUST unico: indice NAO leva frontmatter (SPEC.md:510-511). A unica excecao
    e `okf_version` no indice da RAIZ -- e a casa nao usa, porque registra a
    data do SPEC lido na PROSA (a chave sozinha nao identifica o texto: a v0.2
    foi emendada no lugar sem bump).
  - Corpo em secoes sob heading (SPEC.md:511-512). Nivel de heading, marcador
    de lista e separador: a norma e SILENTE.
  - SHOULD: a entrada repete o `description` do conceito linkado (SPEC.md:524).
  - MAY: o produtor PODE gerar o indice (SPEC.md:525-526).

[CASA] cobertura de 100% dos conceitos, agrupados por `type`, link RELATIVO
(§6.1). `MEMORY.md` fica de fora: e o OUTRO indice, o curado, e nao um conceito.

Uso:  python .project/okf-index.py [caminho-do-bundle] [--check]
      --check nao escreve; sai 1 se o arquivo em disco difere do que geraria.
"""

import io
import os
import re
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    import yaml
except ImportError:  # [CASA] falhar, nunca degradar
    sys.stderr.write("okf-index: PyYAML ausente.  python -m pip install pyyaml\n")
    sys.exit(2)

RESERVED = {"index.md", "log.md"}
CURATED = "MEMORY.md"

# [CASA] ordem e glosa das secoes. O `type` e o do §4 do SPEC da casa; a norma
# nao registra tipos (SPEC.md:182-185), quem fecha o vocabulario e o produtor.
SECTIONS = [
    ("product", "Product", "o que o produto E, lido do codigo que esta no repo: crate, fronteira, contrato, invariante -- cada afirmacao com arquivo:linha MEDIDO"),
    ("project", "Project", "trabalho em andamento, metas e restricoes que o codigo e o git nao registram"),
    ("reference", "Reference", "regra tecnica dura, MEDIDA: a armadilha, o numero, o ponteiro para a prova"),
    ("feedback", "Feedback", "como trabalhar: correcao do dono ou abordagem confirmada, com o porque"),
    ("user", "User", "quem e o dono: papel, expertise, preferencia duravel, como ele decide"),
]

HEADER = """# PubPascal — memory bundle

Acervo de memoria do projeto, em **OKF (Open Knowledge Format) v0.2**.
Um fato por arquivo; `type` na raiz do frontmatter; o **Concept ID e o caminho
do arquivo sem `.md`**, e `name:` espelha esse caminho.

Este `index.md` e **GERADO** por `.project/okf-index.py` e cobre os {n} conceitos,
sem excecao — **nao se edita a mao**. A curadoria (o que ler primeiro, o que e
historia) vive em `MEMORY.md`, que e o indice que o agente carrega em sessao;
este aqui existe para que **nenhum conceito fique invisivel**, que foi como um
quarto do acervo se perdeu de vista antes da migracao, com o disco saudavel.

Validado contra `SPEC.md` v0.2 **upstream** (`GoogleCloudPlatform/open-knowledge-format`),
lido em 2026-09-16 — a v0.2 foi emendada no lugar sem bump, entao a versao sozinha
nao identifica o texto. Todo timestamp de frontmatter leva offset UTC explicito.
"""


def concepts(root):
    """{concept_id: frontmatter} de todo `.md` nao-reservado da ARVORE."""
    out = {}
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]
        for fn in sorted(filenames):
            if not fn.endswith(".md") or fn in RESERVED or fn == CURATED:
                continue
            path = os.path.join(dirpath, fn)
            text = io.open(path, encoding="utf-8").read()
            if not text.startswith("---\n"):
                raise SystemExit("okf-index: %s sem frontmatter -- rode o portao antes" % fn)
            end = text.find("\n---", 4)
            fm = yaml.safe_load(text[4:end])
            if not isinstance(fm, dict):
                raise SystemExit("okf-index: %s: frontmatter nao e mapping" % fn)
            rel = os.path.relpath(path, root).replace(os.sep, "/")[:-3]
            out[rel] = fm
    return out


def render(root):
    cs = concepts(root)
    parts = [HEADER.format(n=len(cs))]
    seen = set()
    for key, title, gloss in SECTIONS:
        ids = sorted(c for c, fm in cs.items() if fm.get("type") == key)
        if not ids:
            continue
        seen |= set(ids)
        parts.append("\n## %s — %d\n\n*%s*\n" % (title, len(ids), gloss))
        for cid in ids:
            d = cs[cid].get("description") or ""
            d = re.sub(r"\s+", " ", str(d)).strip()
            parts.append("* [%s](%s.md)%s" % (cid, cid, " - " + d if d else ""))
        parts.append("")
    rest = sorted(set(cs) - seen)
    if rest:
        # Vocabulario do §4 e fechado, mas o indice NUNCA esconde um conceito:
        # tipo fora da lista aparece aqui e o portao reprova em separado.
        parts.append("\n## Fora do vocabulario da casa — %d\n\n"
                     "*o portao reprova estes; o indice os mostra para que nao sumam*\n" % len(rest))
        for cid in rest:
            parts.append("* [%s](%s.md) - `type: %s`" % (cid, cid, cs[cid].get("type")))
        parts.append("")
    return "\n".join(parts).rstrip() + "\n"


def main(root, check):
    text = render(root)
    path = os.path.join(root, "index.md")
    old = io.open(path, encoding="utf-8").read() if os.path.exists(path) else None
    if check:
        if old == text:
            print("index.md em dia (%d conceitos)" % text.count("\n* ["))
            return 0
        print("index.md DESATUALIZADO: rode `python .project/okf-index.py`")
        return 1
    io.open(path, "w", encoding="utf-8", newline="").write(text)
    print("index.md gerado: %d conceitos, %d bytes%s"
          % (text.count("\n* ["), len(text.encode("utf-8")),
             "" if old is None else ("" if old == text else "  (mudou)")))
    return 0


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != "--check"]
    base = args[0] if args else os.path.join(os.path.dirname(__file__), "memory")
    sys.exit(main(os.path.abspath(base), "--check" in sys.argv))
