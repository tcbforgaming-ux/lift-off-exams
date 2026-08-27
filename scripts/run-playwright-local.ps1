$ErrorActionPreference = "Stop"

$previousPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$statusLines = & supabase status -o env 2>$null
$statusExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousPreference
if ($statusExitCode -ne 0) {
  throw "Local Supabase is not available. Run 'supabase start' first."
}

$values = @{}
foreach ($line in $statusLines) {
  if ($line -match '^([A-Z_]+)="(.*)"$') {
    $values[$matches[1]] = $matches[2]
  }
}

foreach ($required in @("API_URL", "ANON_KEY", "SERVICE_ROLE_KEY")) {
  if (-not $values.ContainsKey($required)) {
    throw "supabase status did not return $required."
  }
}

$env:VITE_SUPABASE_URL = $values["API_URL"]
$env:VITE_SUPABASE_ANON_KEY = $values["ANON_KEY"]
$env:VITE_APP_ENV = "local"
$env:SUPABASE_SERVICE_ROLE_KEY = $values["SERVICE_ROLE_KEY"]
$env:E2E_LOCAL_ONLY = "true"
$env:E2E_RUN_ID = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds().ToString()

& pnpm exec playwright test @args
exit $LASTEXITCODE
