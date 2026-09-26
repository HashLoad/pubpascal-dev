---
name: prove-regressions-by-measurement
description: Isaque expects "is this a regression?" answered by running both versions
  on identical state, not by reading code
metadata:
  node_type: memory
  type: feedback
  originSessionId: 2d3eae6f-747d-4c76-81a2-00dffd3c38f6
  modified: 2026-08-03 14:42:41.716000+00:00
type: feedback
---
When asked whether a behaviour is new or pre-existing, do not answer from the code alone. Run the old and new binaries against **identical** state and show a before/after table.

**Why:** on 2026-08-03 the first comparison of the `invalid auth method` bug was inconclusive because the old Boss had skipped the pulls with `already updated` — apples to oranges. Isaque pushed back with "mas isso tb existia já?", and the honest re-measurement flipped the answer from "pre-existing" to "regression from the go-git bump". Reading `GetURL()` in both versions showed identical logic and would have led to the wrong conclusion.

**How to apply:** snapshot the state (e.g. `~/.boss/cache`) and restore it between runs so each binary sees the same starting point. Engineer the condition that exposes the harm — deleting a recent tag from the cache turned "the fetch failed" into the concrete finding that the project silently resolved `cqlbr 1.1.6` instead of `1.1.51` with exit 0. Say plainly when a measurement was inconclusive rather than reporting it as evidence.

Related: [[validate-in-fork-before-upstream-pr]], [[boss-local-test-environment]].
