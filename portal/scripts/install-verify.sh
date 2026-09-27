#!/usr/bin/env bash
set -euo pipefail
# Tier 1 (free) — dcc32 ships with the IDE.
# When delphi is active without python/fastapi, install lizard standalone:
pip install --user lizard || true
# Tier 2 (SonarQube via Docker) and Tier 3 (FixInsight / Pascal Analyzer) are licensed/manual.
# See .setup/shared/delphi-verify-environment.md for setup.
