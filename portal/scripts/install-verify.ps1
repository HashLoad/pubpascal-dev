# scripts/install-verify.ps1
$ErrorActionPreference = 'Stop'
# Tier 1 (free) — dcc32 ships with the IDE.
# When delphi is active without python/fastapi, install lizard standalone:
try { pip install --user lizard } catch { Write-Warning "pip not available — install Python for delphi complexity gate" }
# Tier 2 (SonarQube via Docker) and Tier 3 (FixInsight / Pascal Analyzer) are licensed/manual.
# See .claude\.setup\shared\delphi-verify-environment.md for setup.
