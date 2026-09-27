---
name: boss-work-links
description: Links to the Boss upstream PRs, the fork issue and the repositories involved
metadata:
  node_type: memory
  type: reference
  originSessionId: 50459a60-bdf2-4fba-ab4f-b1c4304ed2d9
  modified: 2026-08-17 14:27:24.050000+00:00
type: reference
---
- Upstream: https://github.com/HashLoad/boss — `main` is the base for PRs.
- Fork: https://github.com/isaquepinheiro/boss — `origin` in the submodule; `upstream` points at HashLoad.
- The Boss engine is a submodule of `pubpascal-app` at `cli/.modules/boss`, pinned to the fork's `feature/pubpascal-cra-compliance`.

Ours (all merged):

- https://github.com/HashLoad/boss/pull/263 — the PubPascal + CRA contribution (21 review threads, 17 resolved)
- https://github.com/HashLoad/boss/pull/268 — v3.0.12 config compatibility + version string
- https://github.com/HashLoad/boss/pull/269 — lint cleanup after #268 (merged 2026-08-03)
- https://github.com/HashLoad/boss/pull/270 — `invalid auth method` transport fix (merged 2026-08-03)
- https://github.com/isaquepinheiro/boss/pull/13 — fork validation PR for #270
- https://github.com/isaquepinheiro/boss/issues/12 — the `invalid auth method` bug with the full measurement (closed)

Open, waiting on Isaque:

- https://github.com/isaquepinheiro/boss/issues/14 — install aborts on a dependency with no `boss.json`
- https://github.com/isaquepinheiro/boss/pull/15 — its fix; upstream PR only after this one is approved. See [[boss-missing-bossjson-install-abort]].

Open upstream on the missing-`boss.json` bug (2026-09-03):

- https://github.com/HashLoad/boss/pull/281 — `Spelt`'s fix, open since 2026-08-26, no review. Validated by us.
- https://github.com/HashLoad/boss/pull/286 — ours, the three regression tests. **Draft on purpose**: red on `main` until #281 merges.

Not ours, but load-bearing:

- https://github.com/HashLoad/boss/issues/271 — the `slice bounds out of range` install panic (`felipemesturini`)
- https://github.com/HashLoad/boss/pull/272 — its fix + regression test (`vBaggio`, merged 2026-08-10). See [[boss-cleanempty-panic-unreleased]].

The measurement tables and reproduction steps live in the bodies of #268, #270 and issue #12 — worth re-reading before touching any of this again rather than re-deriving.
