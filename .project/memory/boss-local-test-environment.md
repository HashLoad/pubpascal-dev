---
name: boss-local-test-environment
description: Where the Go toolchain, the old Boss binary and the Boss test bed live
  on this machine
metadata:
  node_type: memory
  type: reference
  originSessionId: 2d3eae6f-747d-4c76-81a2-00dffd3c38f6
  modified: 2026-08-03 14:52:57.772000+00:00
type: reference
---
Facts about this machine that are not discoverable from the repo and cost time to rediscover:

- **Go is not on `PATH`.** The toolchain is at `D:\DeveloperWeb\go\go\bin` (go1.26.0). Prepend it: `$env:PATH = 'D:\DeveloperWeb\go\go\bin;' + $env:PATH`.
- **Boss v3.0.12 (the last pre-GoReleaser release) is at `D:\Delphi Tools\Boss\boss.exe`.** It is the historical baseline for any "is this a regression?" comparison.
- **`HashLoad/ormbr` is the test bed of choice.** Its four public deps (dbcbr, dbebr, cqlbr, jsonbr) exercise clone, cache pull and version resolution without needing private access. It was cloned to `D:\Delphi Tools\Boss\ormbr` during the 2026-08-03 session and deleted afterwards at Isaque's request — clone it again rather than assuming it is there.
- The global Boss config is `~/.boss/boss.cfg.json`. **Back it up before any test that runs `boss login`**, and restore it afterwards — testing auth rewrites it, and a Boss newer than v3.0.12 silently drops fields it does not recognise.
- Issues were disabled on `isaquepinheiro/boss` (the GitHub default for forks) and had to be enabled via `gh api -X PATCH repos/isaquepinheiro/boss -F has_issues=true`.
- PowerShell here has no heredoc — use the Bash tool for multi-line `git commit -F -` messages.

Related: [[boss-upstream-pr-merge-order]].
