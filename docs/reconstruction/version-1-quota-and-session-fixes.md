# Version 1: Free Test Limits And Session Recovery

Baseline: `codex/local-reconstruction` at
`67eb541615262e3e0e23722f41e53a8b86672e57` (includes Demo).
The audit was at `76ba65730ab4d4ee8d314f15dc4eb1182e4b3250`.
Starting status contained only untracked `phase-f-focused-audit.md` and
`version-1-current-state-audit.md`; both were preserved.

## V1-01: Partial

PRD 17.3, 33 and 43 require a free 40-question generation maximum, no more
than three tags, three generated tests and seven Test ID attempts per week.
The November 4 decision supersedes local-time reset with Monday 00:00 UTC.
Phase B preserves the first 40 saved members on free shared launch; the later
Hardcore approval shares a ten-completion Test/Hardcore ceiling.

Reproduced at the starting schema via two rollback-only probes:
`docker exec -i supabase_db_liftoff-verification-isolated psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres`
(both successful probes exit 0). As a synthetic authenticated free user,
four distinct custom generation keys each returned success and selected 41
questions from four selected in-blueprint tags. A second fixture generated
eight distinct one-question IDs and launched them directly through the legacy
RPC; all eight returned distinct session IDs. The first same-ID probe returned
the same resumable session eight times; it is not evidence of eight uses.

Forward migrations `20261106000200_free_test_generation_caps.sql` and
`20261106000300_guard_derived_test_generation.sql` add trusted caps to custom,
saved and updated generation and constrain free length on both Test launch
wrappers. Custom uses distinct requested tags; direct saved/updated uses the
applicable saved rules, including owned derived blueprints. No identity,
membership, order or in-progress attempt is rewritten. Expired subscriptions
and unpaid staff are not paid for size/tag limits; the existing staff study
permission is unchanged. No public schema type change is expected.

**Still open:** Confirm whether successful updated regeneration charges a
generated slot, whether the first launch of a freshly generated ID is exempt
from ID usage, and whether starting an attempt reserves a shared completion
slot or the completion guard keeps charging at submission. No weekly ledger,
historical backfill, or dashboard balances were added; the existing completion
guard and unpaid Quiz behavior are unchanged. Weekly last-slot concurrency,
failure/replay charging and dashboard acceptance remain open.

## V1-03: Bounded Recovery

The original intermittent cause is unknown. The old bootstrap awaited
`getSession` and profile reads without deadlines and ignored returned Auth
errors. In an ignored archive of the baseline commit, a held token refresh
entered Checking session and never showed recovery within the eight-second
assertion. Holding only the first profile read did not reproduce the stall;
holding every profile read did, with Checking session visible in the failure
snapshot. These reproduce controlled failure modes, not the original
intermittent incident's cause.

`AuthProvider` now bounds each stage to six seconds, preserves the route and
session uncertainty, and ignores stale request generations. The Supabase
browser client's auth-token fetch also has a network deadline so a stalled
refresh can release SDK work. `RouteGate` shows Retry without granting access
or redirecting to login on error. Successful signed-out resolution still
redirects normally. Existing role, suspension and recovery-only decisions
remain in force.

## Verification

Only the marked `liftoff-verification-isolated` project (API port 58431) was
used. Interactive port 58421 and hosted services were untouched.

- `supabase --workdir .tmp/isolated-verification-backend migration up --local`
  applied the cap migration, exit 0. Clean verification applied both forward
  migrations. The initial focused quota test queried the configured RPC as a
  table instead of JSON; after correcting the test, the command below passed.
- `supabase --workdir .tmp/isolated-verification-backend test db "$PWD/supabase/tests/database/035_free_generation_caps.sql"`:
  final exit 0, 10 passed, 0 failed. Covers 40/41, three/four, paid/free/expired/
  unpaid staff and independent attempts through both launch wrappers.
- `pnpm test:backend`: exit 0, 856 assertions, 0 failed; public schema drift
  and generated types identical. `pnpm test:hosted-grants`: exit 0, 856
  database and 8 extra grant checks, 0 failed.
- `pnpm test:e2e tests/e2e/auth-bootstrap-recovery.spec.ts tests/e2e/auth-redirects.spec.ts tests/e2e/permissions.spec.ts`:
  initial exit 0, 13 passed, 0 failed.
- Pre-fix ignored snapshot:
  `pnpm exec playwright test tests/e2e/auth-bootstrap-recovery.spec.ts`
  exited 1, 0 passed and 2 failed (held refresh and inconclusive single held
  profile lookup). Repeating with all profile lookups held using
  `pnpm exec playwright test tests/e2e/auth-bootstrap-recovery.spec.ts --grep 'held profile'`
  exited 1, 0 passed and 1 failed as expected: no recovery UI and the loader
  remained visible. Only the ignored baseline copy of the harness changed.
- `pnpm test:e2e tests/e2e/generate.spec.ts tests/e2e/phase-b.spec.ts tests/e2e/hardcore.spec.ts tests/e2e/account-erasure.spec.ts`:
  initial exit 1, 8 passed and 1 failed. The competing-tab case observed a
  paused session instead of the expected another-tab alert; the existing
  assertion was not changed.
- `pnpm test:e2e tests/e2e/auth-bootstrap-recovery.spec.ts tests/e2e/auth-redirects.spec.ts tests/e2e/permissions.spec.ts tests/e2e/generate.spec.ts tests/e2e/phase-b.spec.ts tests/e2e/hardcore.spec.ts tests/e2e/account-erasure.spec.ts`:
  final exit 0, 22 passed, 0 failed, including successful retry and delivery
  of an old successful profile response after sign-out. The competing-tab
  assertion passed unchanged; no separate cause or fix is claimed for it.
- `pnpm verify`: exit 0, 83 unit tests, 0 failed; typecheck, lint, formatting
  and build passed.
- `git diff --check` and `git diff --cached --check`: exit 0.

Free caps checkpoint: `85202fba55da566d8506c66226bf6fac8495e76b`.
