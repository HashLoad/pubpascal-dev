---
name: check-upstream-before-building-a-fix
description: Fetch upstream and search its issues/PRs before writing a fix — someone
  else may have already landed it
metadata:
  node_type: memory
  type: feedback
  originSessionId: 50459a60-bdf2-4fba-ab4f-b1c4304ed2d9
  modified: 2026-09-03 00:00:00+00:00
type: feedback
---
Before writing a line of a fix for an upstream project, `git fetch --all` and search the upstream issues and merged PRs for the symptom.

**Why:** on 2026-08-11 a Boss panic was diagnosed, reproduced and fixed here — and only then did the upstream check reveal that issue #271 and PR #272 had already covered it, fix *and* regression test, merged the day before. The local pin was 8 commits stale, so nothing in the working copy hinted at it. Isaque then had to reconcile "open the PR" against a fix that already existed, which cost a round of confusion.

It happened a second time, mirrored, on 2026-09-03: the missing-`boss.json` fix was built and validated here in August but never sent up, and by the time we looked, `Spelt` had opened the same fix upstream as #281. Checking upstream is not a one-off at the start — re-check before *sending*, not just before building, because a parked fix goes stale while someone else's PR takes the slot. See [[boss-missing-bossjson-install-abort]].

**How to apply:** fetch first, then `gh issue list --state all --search "<symptom>"` and `gh pr list --state all --limit 10` on the upstream repo. Check whether the fix is in a *release*, not just on `main` — a merged fix with no tag still leaves users broken, and that gap is often the only thing left worth reporting. If the work is already done upstream, say so and stop instead of opening a duplicate.

Related: [[validate-in-fork-before-upstream-pr]], [[boss-cleanempty-panic-unreleased]].
