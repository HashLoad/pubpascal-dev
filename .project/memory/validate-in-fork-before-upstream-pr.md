---
name: validate-in-fork-before-upstream-pr
description: Open a validation PR on Isaque's fork and let CI run before opening the
  PR upstream
metadata:
  node_type: memory
  type: feedback
  originSessionId: 2d3eae6f-747d-4c76-81a2-00dffd3c38f6
  modified: 2026-08-03 14:42:24.712000+00:00
type: feedback
---
Before opening a PR on `HashLoad/boss`, open one on `isaquepinheiro/boss` first and wait for its CI.

**Why:** Isaque asked for this explicitly — "abra o PR no fork tb para ter certeza de nenhum conflito ... após abrimo lá". It is not a formality. On 2026-08-03 it caught that #268 had been merged upstream with a red Lint job on two findings that were ours, and it let us tell inherited lint failures from new ones by diffing the pre-rebase run (green) against the post-rebase one (red on files we never touched). Without it we would have opened a red PR upstream without knowing whose fault it was.

**How to apply:** push the branch, open the fork PR against the fork's `main` (sync it first if behind), watch with `gh pr checks <n> --watch`, and only open upstream once it is green. Also run `git merge-tree --write-tree` between every branch pair to prove there is no conflict before claiming it.

Related: [[report-upstream-bugs-without-blaming-people]], [[boss-work-links]].
