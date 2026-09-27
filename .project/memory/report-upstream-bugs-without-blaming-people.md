---
name: report-upstream-bugs-without-blaming-people
description: Frame upstream bug reports as "we found, reproduced and fixed it", citing
  commit SHAs rather than authors
metadata:
  node_type: memory
  type: feedback
  originSessionId: 2d3eae6f-747d-4c76-81a2-00dffd3c38f6
  modified: 2026-08-03 14:42:34.768000+00:00
type: feedback
---
When reporting a defect that originated in someone else's commit, write it as *"we went after it, reproduced it, and the fix is here with a regression test"*. Cite commit SHAs and `file:line`, never the author's name. Add the mitigating context — that no single commit broke it alone, that a piece of code was correct for six years before an unrelated change turned it into a trap, that the CI gap is why review missed it.

**Why:** Isaque asked for exactly this tone — "não como 'foi o Rodrigo', e sim como 'achamos, reproduzimos e já temos a correção'". He works alongside these maintainers; being right about attribution is worth nothing if it costs the relationship. He does still want the private, precise answer when he asks who caused what — the softening is for the public artifact, not for him.

**How to apply:** in the PR body, lead with the symptom and the measurement, prove the causal chain with SHAs, and add a "note on process" section framing the gap as missing test coverage rather than someone's carelessness. Do the blame analysis honestly in chat if asked; keep names out of GitHub.

Related: [[validate-in-fork-before-upstream-pr]].
