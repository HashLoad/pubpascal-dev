---
name: boss-cleanempty-panic-unreleased
description: Every released Boss (v3.0.13-v3.0.15) panics on install; the fix is on
  main but has no tag as of 2026-08-11
metadata:
  node_type: memory
  type: project
  originSessionId: 50459a60-bdf2-4fba-ab4f-b1c4304ed2d9
  modified: 2026-08-11 20:23:59.542000+00:00
type: project
---
`boss install` dies with `panic: runtime error: slice bounds out of range [:N:N-1]` right after `♻️ Updating library path...`. The number varies with the list size; the defect is the same.

Root cause: `cleanEmpty` in `utils/librarypath/librarypath.go` deleted entries while ranging over the same slice, so the index outran the shrinking length. `slices.Delete`'s internal bounds check is `_ = s[i:j:len(s)]` — a three-index slice, which is the only thing in Go that prints that `[:N:M]` shape. Triggered by any empty entry that is not last, which comes from an empty or `;`-padded `<DCC_UnitSearchPath>` in the `.dproj`. Both call sites break: `getNewPathsFromDir` (.dproj) and `getNewBrowsingPathsFromDir` (global browsing path).

- Introduced by `50ae00a` (2025-03-07), which swapped `append(paths[:i], paths[i+1:]...)` (silently wrong, never panicked) for `slices.Delete`.
- Present in **v3.0.13, v3.0.14 and v3.0.15**. Absent in v3.0.12 — measured on identical state, old binary wrote the `.dproj` correctly and exited 0.
- Reported upstream as issue #271 (`felipemesturini`) and fixed by **PR #272 (`vBaggio`, merged 2026-08-10)**, with a regression test. Not ours — see [[check-upstream-before-building-a-fix]].
- **As of 2026-08-11 no release carries the fix** (`git tag --contains f958b7d` is empty; latest release v3.0.15 is from 08-03).

**Why it still matters:** PubPascal distributes the Boss binary, so it is handing users a version that crashes on install. Release timing is HashLoad's call — Isaque was explicit that we do not push on it.

**How to apply:** when someone reports this, say it is a known bug in v3.0.13-v3.0.15, already fixed on `main`, awaiting release; the workaround is v3.0.12 or a `<DCC_UnitSearchPath>` with no empty segment and no trailing `;`.

Related: [[boss-work-links]], [[boss-local-test-environment]], [[prove-regressions-by-measurement]].
