# Security Policy

## Reporting a vulnerability

Please report security vulnerabilities through **GitHub's private vulnerability
reporting** — never a public issue:

→ **[Report a vulnerability](https://github.com/isaquepinheiro/pubpascal-app/security/advisories/new)**
(Repository → **Security** → **Advisories** → *Report a vulnerability*.)

This keeps the report private between you and the maintainers until a fix is
released. No email address is exposed.

We aim to acknowledge a report within a few business days and to keep you posted
as we investigate, fix, and coordinate disclosure.

## Scope

This repository hosts the PubPascal developer tools:

- **`cli/`** — the `pubpascal` command-line tool (login, clone, workspace
  status/update/push/commit/diff, sbom, …).
- **`ide/`** — the PubPascal IDE desktop app, a WebView2 host that drives the
  CLI and renders the workspace dependency graph.

In scope: the CLI and the desktop app, their handling of tokens, the local
git/process execution, and the WebView2 ↔ host bridge. Out of scope: the portal
(reported at https://www.pubpascal.dev), and third-party dependencies (report
those upstream).

## Supported versions

This project is in active development (pre-1.0). Security fixes land on the
latest release. There is no long-term support branch yet.

## Handling of secrets

The CLI stores your `manifest:read` token in plaintext under
`%USERPROFILE%\.pubpascal\config.json` (Windows) or `$HOME/.pubpascal/config.json`.
Treat that file as a secret. Tokens can be revoked any time at
https://www.pubpascal.dev/profile/tokens.
