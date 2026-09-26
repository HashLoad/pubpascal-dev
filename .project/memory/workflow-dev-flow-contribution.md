---
type: project
name: workflow-dev-flow-contribution
description: Automated contribution flow eliminating manual 6-step Git fork and PR burocracy.
metadata:
  node_type: memory
  type: project
  modified: 2026-09-26T10:00:00Z
---

# Workflow: Dev-Flow Automated Contribution and PR Integration

## Intent and Problem Solved

In traditional dependency management, fixing a third-party package inside `.modules/` or `modules/` requires a painful 6-step manual process: manual GitHub fork, remote renaming, personal fork remote addition, branch creation, commit push, and manual PR opening on GitHub.
ADR 002 automates this entire lifecycle directly from CLI and Studio GUI.

## Operational Commands and Entry Points

1. **CLI Commands**:
   - `boss contribute <pkg-name>`: Prepares local dependency for contribution (ensures fork exists via Portal API, configures git remotes).
   - `boss contribute <pkg-name> --pr`: Pushes commits to personal fork and automatically triggers PR creation against upstream repository.
2. **Studio GUI Actions**:
   - `studio/core/PubPascal.View.pas:306-343` (`BtnContributeClick`): Triggers `FCli.Run('contribute "' + LPkg + '"')` on a background thread.
   - `studio/core/PubPascal.View.pas:345-385` (`BtnSubmitPRClick`): Triggers `FCli.Run('contribute "' + LPkg + '" --pr')` and updates status bar.
3. **Portal API Endpoints**:
   - `portal/src/app/api/packages/contribute/fork/route.ts`: Automates GitHub fork creation via user's linked GitHub account.
   - `portal/src/app/api/packages/contribute/pr/route.ts`: Automates Pull Request opening via Octokit GitHub API.

## Invariants and Safety

- Frame disables `BtnContribute` and `BtnSubmitPR` while command runs asynchronously to prevent duplicate actions.
- Background execution via `TThread.CreateAnonymousThread` ensures VCL UI thread never freezes.
- Results marshaled back to main thread via `TThread.Queue`.

## References

- Documented in `docs/adr-002-dev-flow-contribuicao.md`.
- Implemented in `studio/core/PubPascal.View.pas:306-385` and `portal/src/app/api/packages/contribute/`.

Related: [[module-studio-core]], [[module-cli-boss]], [[module-portal-catalog]].
