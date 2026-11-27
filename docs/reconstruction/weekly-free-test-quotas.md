# Weekly Free Test Quotas and Quiz

Baseline: `codex/local-reconstruction`, `ce69c41d7dc570b3355e80cad5ef13a57e959d05`.
Result: **Complete locally** for weekly quotas and free Quiz.
The starting worktree also contained the Premium entitlement migration and
its SQL access test, local verification runner/browser changes, and untracked
audit documents. The unchanged Premium migration and access test are included
as verified entitlement prerequisites. The audit and matrix include the
requested quota updates; unrelated changes remain outside the checkpoint.
Verification target: marked `liftoff-verification-59471` (API 59471, DB 59472,
shadow DB 59479, browser 4176). No interactive or hosted changes.

## Approved counter mapping

PRD §§17.3, 33 and 43 distinguish three generated Tests, seven Test ID uses
and ten total Tests per week. The November 4 approval supersedes local time:
each window opens Monday at 00:00:00 UTC, inclusive, and ends at the following
Monday at 00:00:00 UTC, exclusive. The later audit approval explicitly charges
updated generation and first launches of newly generated IDs.

| Action                                                                         | Independent free counter                                                       | Shared activity allowance                                             |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Saved or custom generation                                                     | One generated slot when a new Test ID reaches Ready.                           | None at generation.                                                   |
| Generate Updated Test                                                          | One generated slot when the new ID reaches Ready.                              | None at generation.                                                   |
| Preview Test ID                                                                | None.                                                                          | None.                                                                 |
| Launch Test ID (either RPC), including the first launch of an ID you generated | One ID-use slot when a new Test session is created.                            | Reserve one shared slot in the launch week.                           |
| Repeat Test launch                                                             | A new attempt costs one ID use; returning an existing attempt does not.        | A new attempt reserves one shared slot.                               |
| Resume or pause                                                                | None.                                                                          | No additional charge.                                                 |
| Quiz                                                                           | No generated Test or Test ID slot, including when opening an existing Quiz ID. | PRD §§2.1, 7.1 and later approval: reserve one shared slot at launch. |
| Hardcore                                                                       | None.                                                                          | Reserve one shared slot at launch.                                    |

The two independent ledgers cannot be added to reproduce the shared count:
generation and launch of one's own ID are two independent claims but at
most one shared activity. The old ten-completion guard is replaced by the
shared launch ledger. Only the shared slot is refunded on explicit abandonment
or terminal no-result expiry. Scored timer auto-submit retains the slot.
Pause and disconnected presence stay resumable; no new inactivity expiry
policy or scheduler was added. The database refunds the original reservation
on a trusted terminal no-result expiry transition.

The server derives paid status from the trusted Premium profile or current
active/trialing subscription. An expired subscription or unpaid staff role
alone does not bypass quotas. Exports and explanation access stay independent.

## Cutover

The ledgers start at migration activation. Existing IDs,
attempts, and results are preserved. Creating a new attempt with an older
ID is a new launch; continuing a pre-existing attempt is not. Historical
timestamps do not prove entitlement at the original charging event, so
historical generation and launch data are not retroactively classified as
free usage. Existing attempts can finish without a new charge and have no
reservation to refund. The first deployment week starts with an empty ledger.

## Implementation and verification

Forward migrations: `20261115000200_weekly_free_test_usage.sql` and
`20261115000300_shared_activity_reservations.sql` (after the pre-existing
`20261115000100_premium_profile_activity_access.sql`). A private receipt is
created in the same transaction as the saved Test ID or attempt. A per-account
transaction lock serializes final-slot requests. Resume aliases stay bound
to the same attempt even after closure. No direct browser access to the
ledger, mutation helpers, or another account's balance is granted.

| Verification                   | Evidence                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `036_weekly_free_activity.sql` | Saved, custom and updated 3/4; both launch APIs at 7/8; own ID charged on first launch; preview, resume and retries unchanged; mixed Test, Quiz and Hardcore 10/11; short/failing requests leave balances intact; UTC boundary and prior-week finish; abandonment, trusted terminal expiry and scored timer expiry; entitlement and grant boundaries. |
| `035_free_generation_caps.sql` | Existing 40/41 questions and three/four tags remain guarded. Both launch paths preserve the free saved-ID prefix.                                                                                                                                                                                                                                     |
| `weekly-free-activity.spec.ts` | Dashboard shows actual balances and UTC reset; free Quiz is untimed and has 20 questions; exhaustion before answering; completed free Quiz appears in History and combined analytics. Concurrent final generation, ID-use and shared reservations each produce one winner and preserve retries.                                                       |
| Existing browser regressions   | Paid Quiz, Hardcore, Generate, Test sessions, Premium analytics mode filters and separate Test-only exports.                                                                                                                                                                                                                                          |

The first disposable reset found a launch-source anchor mismatch. Its first
focused SQL run found an ambiguous receipt column; a later test fixture tried
to seed a one-second timer below the existing one-minute minimum. The full
suite then surfaced an allocation fixture that creates more than three Tests;
that fixture now explicitly uses existing paid entitlement for the allocation
checks. No quota or allocation assertions were relaxed.

All commands used Supabase CLI 2.109.1 through
`LIFTOFF_VERIFY_SUPABASE_CLI` and, for browser runs, `LIFTOFF_VERIFY_CHROME=1`.
The initial successful `pnpm test:backend:prepare` used the guarded target.
For the standalone test, `$cli` points to the same pinned executable and
`$wd` to `.tmp/isolated-verification-59471`.

```powershell
& $cli --workdir $wd test db (Resolve-Path 'supabase/tests/database/036_weekly_free_activity.sql').Path
pnpm test:backend:e2e tests/e2e/weekly-free-activity.spec.ts tests/e2e/quiz.spec.ts tests/e2e/hardcore.spec.ts tests/e2e/generate.spec.ts tests/e2e/activity-analytics.spec.ts tests/e2e/test-exports.spec.ts tests/e2e/test-session.spec.ts
pnpm test:backend
pnpm test:hosted-grants
pnpm verify
git diff --check
git diff --cached --check
```

| Check                                | Exit | Final result                                                                    |
| ------------------------------------ | ---: | ------------------------------------------------------------------------------- |
| Focused SQL                          |    0 | 66 passed, 0 failed                                                             |
| Focused and regression Playwright    |    0 | 12 passed, 0 failed                                                             |
| Full database reset and verification |    0 | 928 passed across 36 files, no public schema drift, exact generated-type parity |
| Local hosted-grant simulation        |    0 | 928 database and 8 grant checks passed                                          |
| Application verification             |    0 | 83 unit tests passed; typecheck, lint, formatting, and build passed             |
| Worktree/staged whitespace checks    |    0 | No errors                                                                       |

The Dashboard intentionally presents remaining allowances and the next UTC
reset, not a live countdown. Hosted migration and verification were not run.
