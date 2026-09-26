---
name: boss-fetch-failure-exit-code-open
description: Boss still reports success and exits 0 when a dependency fetch fails;
  deliberately left out of scope
metadata:
  node_type: memory
  type: project
  originSessionId: 2d3eae6f-747d-4c76-81a2-00dffd3c38f6
  modified: 2026-08-03 14:42:00.187000+00:00
type: project
---
Boss prints `✅ Installation completed successfully!` and exits 0 even when every dependency fetch failed. PR #270 removes the `invalid auth method` cause, but failures from network trouble, an expired token or a removed repository still pass silently.

**Why:** this was left out of scope on purpose. Turning any failed fetch into a non-zero exit changes the contract for people working offline or behind unstable networks, and for third-party CI. It is a policy change, not a bug fix.

**How to apply:** if it gets picked up, it deserves its own PR with the discussion first — do not smuggle it into a bug-fix PR. It is recorded on `isaquepinheiro/boss` issue #12 (now closed) and in the #270 body.

Related: [[boss-upstream-pr-merge-order]].
