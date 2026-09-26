---
name: boss-missing-bossjson-install-abort
description: 'Boss v3.0.13-v3.0.17 aborts the whole install on any dependency without
  boss.json; upstream fix is Spelt''s PR #281 (open, validated by us), our tests are
  PR #286 (draft) as of 2026-09-03'
metadata:
  node_type: memory
  type: project
  originSessionId: f445200b-14a5-4fc7-9ab3-06ee639269a6
  modified: 2026-09-03 00:00:00+00:00
type: project
---
`boss install` / `boss update` dies with `failed to load package from .../modules/<dep>/boss.json: The system cannot find the file specified.` as soon as **any** dependency in the graph ships no `boss.json`. The dependency clones fine; the install dies right after.

Root cause: `verifyDependencyCompatibility` in `internal/core/services/installer/core.go` returns the load error instead of tolerating a missing manifest, and `installDependency` turns that into a failed install. It used to be `return "", nil`; commit `cef145b` (2025-12-15, a lint sweep, probably to satisfy `nilerr`) flipped it to `return "", err`.

It is a regression, not a policy: every other stage treats a manifest-less dependency as normal — `processOthers` skips it, `loadGraph` makes it a leaf, `buildSearchPath` guards on `err == nil`, and the build stage has a dedicated `consts.StatusMsgNoBossJSON` printed as `⏭️ <dep> has no boss.json`.

- Present in **v3.0.13 through v3.0.17** (every tag containing `cef145b`) and still on upstream `main` as of 2026-09-03. **Not ours** — nothing to do with the PubPascal/CRA work.
- Reported by Vinicius Sanchez running `boss update` on `DestakAPI`: 23 dependencies installed, `github.com/andre-djsystem/hashlib4pascal` killed the run. That library has no `boss.json` on `master` or on either tag.
- Reproduced end to end 2026-08-17 with two binaries from the same tree: baseline exits 1, fixed exits 0 — see [[prove-regressions-by-measurement]].

**Our fix:** tolerate only `errors.Is(err, fs.ErrNotExist)`; a `boss.json` that exists but does not parse still errors, so the `nilerr` intent behind `cef145b` survives. Three tests in `internal/core/services/installer/compatibility_test.go`. Lint neutral: 20 findings before, 20 after.

## State as of 2026-08-17

- Fork `main` was fast-forwarded to `upstream/main` (`1ea375d`) — now 0 ahead / 0 behind, done with `git push origin upstream/main:main` because the `gh` API was degraded during a GitHub outage.
- Fork issue **#14** (closed) and fork PR **#15** — **merged** into fork `main` on 2026-08-17, merge commit `5e31d12`, fix commit `882770c`. The issue did not auto-close because the PR body said "Fecha #14": GitHub only honours the English keywords (`Closes`/`Fixes`/`Resolves`), so it had to be closed by hand.
- Tester build: `D:\Delphi Tools\Boss\issue-14\boss-issue14-Windows_x86_64.zip`, identifies itself as `v3.0.15+issue14.882770c`. Built with
  `go build -ldflags "-X github.com/hashload/boss/internal/version.version=v3.0.15 -X ...metadata=issue14.<short> -X ...gitCommit=<sha>"`.
- Reproduction recipe: a `boss.json` whose only dependency is `github.com/andre-djsystem/hashlib4pascal: ^1.0.0`, then `boss install`.

**Second independent report, 2026-09-03:** a Boss user on **v3.0.17** (`1ea375d`, the v3.0.17 tag exactly) hit it on a fresh clone — `github.com/academiadocodigo/localcache4d` (no `boss.json` on any tag or on the default branch) killed a 12-dependency install with the same message. Two dependencies in that project were affected. So the bug is now confirmed in the wild by two unrelated users, on two different libraries.

## Upstream state as of 2026-09-03

**We never opened the upstream PR** (it stayed parked on Vinicius). Someone else did: **HashLoad/boss#281** by `Spelt`, opened 2026-08-26, branch `Spelt/boss:fix/missing-bossjson`, single commit `7d9d587` on top of `1ea375d`. Same fix as ours (`os.ErrNotExist` == `fs.ErrNotExist`), `+4/-0`, **no tests**. Still open, no review. Five more PRs from the same author (#280, #282-#284) are parked alongside it; the last human PR merged upstream was #275 on 2026-08-12.

Validated #281 by measurement on 2026-09-03: two binaries from the v3.0.17 tree differing only by the patch, run against `academiadocodigo/localcache4d` — baseline exit 1 reproducing the user's output byte for byte, patched exit 0. Our three tests all pass on `7d9d587`; reverting only the fix makes `WithoutBossJSON` fail and leaves the other two green. Full suite 29 packages ok, `go vet` clean. The `errors.Is` chain holds: `os.ReadFile` → `*fs.PathError` → unwrapped through `FilePackageRepository.Load` → `%w` in `PackageService.Load`.

**Our contribution: HashLoad/boss#286** — tests only, no production code, opened as a **draft on purpose** because `WithoutBossJSON` is red on `main` until #281 merges. Plus a comment on #281 with the full measurement. We have `push: false` on `HashLoad/boss`, so #281's `maintainerCanModify: true` does not let us push into it — that is why the tests went into a separate PR. Isaque picked that route over a PR into Spelt's fork.

**Still unreleased either way:** v3.0.17 was published 2026-08-22. Even after #281 merges, users stay broken until a new tag — same shape as [[boss-cleanempty-panic-unreleased]].

**Vinicius has NOT tested the binary yet.** #15 was merged before his return, on the strength of the local reproduction alone. The upstream PR is **blocked on his confirmation on `DestakAPI`** — Isaque was explicit about that. Do not open it before he brings that feedback back.

**Next, once he confirms:** PR from `isaquepinheiro:main` to `HashLoad/boss:main` (nothing goes upstream before he says so — [[validate-in-fork-before-upstream-pr]]; cite `cef145b`, never the author — [[report-upstream-bugs-without-blaming-people]]) → then decide separately whether to bump the `cli/.modules/boss` submodule in pubpascal-app, still pinned at `ae9d612` without the fix.

Related: [[boss-work-links]], [[boss-cleanempty-panic-unreleased]], [[boss-local-test-environment]].
