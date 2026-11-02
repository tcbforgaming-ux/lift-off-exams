$ErrorActionPreference = "Stop"
if ($args.Count -gt 0) {
  throw "Use the disposable runner documented in docs/stabilization/phase-1.md."
}
& node (Join-Path $PSScriptRoot "verify-backend.mjs") e2e
exit $LASTEXITCODE
