# Phase F: Hardcore Mode

Status: **Complete for the approved local workflow.** Implemented following the
initial strike-rule checkpoint `b8edcf3c1a370b8f1548d938ce03d0593ade8a6e`.

## November 5 Decisions

All signed-in accounts may play untimed, unbounded runs using active Medium
and Hard questions, with reuse allowed. Free accounts have one strike; paid
accounts may choose 1-3. Setup defaults to one. Next requires a response.
The cap is the only finish condition; exiting preserves committed progress.
History records correct out of committed answers; paid explanations are
opt-in. Hardcore is excluded from analytics and exports.

The forward migration `20261105002800_hardcore_runs.sql` adds private runs
and answers, owned RPCs, personal answer evidence, and the shared ten-per-week
free Test/Hardcore completion allowance (Monday 00:00 UTC). The app adds
Hardcore setup, play, results, and History navigation.

`030_hardcore_runs.sql` passed 13 assertions on isolated Supabase. An initial
run failed because the new migration had not been copied into the isolated
workdir; applying it corrected that. Backend-connected browser coverage is
in `tests/e2e/hardcore.spec.ts`.

Baseline: `codex/local-reconstruction` at
`07b3e40a2bb774fee6c1df96a25cad4023b98223` (verified activity analytics).
Verified Quiz: `db1eb57b6bddb33621f8ca88541ff91a49b90bdd`.
Starting status was `## codex/local-reconstruction` with only
`?? docs/reconstruction/phase-f-focused-audit.md`; preserved.

## Acceptance Evidence

| Requirement                                          | Source and evidence                                                                                                                                               |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Medium/Hard, untimed, unbounded and reusable         | PRD 55.1 and November 5 approval; private question selector and continued play in the focused SQL and browser tests.                                              |
| Immutable 1/2/3 cap, free one strike                 | PRD 55.2 and November 5 approval; default, paid custom, invalid and free custom checks in SQL.                                                                    |
| Next commits only once; exact cap stops              | November 4 approval supersedes PRD 7.3/27.5; SQL checks retry, stale position, cap and terminal state. Browser tests cover exit/reopen and simultaneous requests. |
| Correct, wrong, enabled UNKNOWN and required answers | PRD 55.3-55.6 and November 5 approval; both SQL suites cover strike math and response validation.                                                                 |
| History, review and explanations                     | PRD 55.7-55.9 and November 5 approval; browser resume and terminal refresh; SQL ownership and paid explanation checks.                                            |
| Shared quota; separate analytics and exports         | November 5 approval and PRD free completion allowance. Focused SQL verifies mixed Test/Hardcore usage, UTC cutoff and analytics/export exclusion.                 |

## Verification

- `pnpm test:backend:prepare`: exit 0 on marked isolated port 58431.
- Focused `supabase --workdir .tmp/isolated-verification-backend test db` with
  `029_hardcore_strike_rules.sql` and `030_hardcore_runs.sql`: exit 0,
  8 and 13 assertions respectively.
- `pnpm test:e2e tests/e2e/hardcore.spec.ts` (initial browser case): exit 0,
  1 passed.
- `pnpm test:backend`: exit 0, 801 assertions in 30 suites; public schema
  drift and generated public types comparison both matched.
- Post-fix `pnpm test:backend`: exit 0, 803 assertions in 31 suites before
  expanding the focused quota fixture; drift and type comparison still matched.
- `pnpm test:hosted-grants`: exit 0, 801 database and 8 hosted-default grant
  assertions, all local.
- `pnpm test:pipeline` and `pnpm test:pipeline:db`: both exit 0.
- Focused `031_hardcore_weekly_allowance.sql`: final exit 0, 5 assertions
  after correcting a fixture assertion for the analytics exclusive upper time
  bound. Ten completions exhaust the allowance, the prior UTC week does not
  count, and the mixed fixture counts Hardcore only toward quota.
- Initial full `pnpm test:e2e`: exit 1, 40 passed and 3 failed. One browser
  assertion matched both seeded question text and the position indicator.
  Two export fixtures exposed a trigger permission error. The selector was
  narrowed and forward migration `20261105002900_hardcore_quota_trigger_context.sql`
  gives the locked-down Test result trigger a trusted execution context,
  without granting clients execution on private helpers.
- Targeted post-fix `pnpm test:e2e tests/e2e/hardcore.spec.ts tests/e2e/test-exports.spec.ts tests/e2e/quiz.spec.ts tests/e2e/test-session.spec.ts`:
  exit 0, 7 passed.
- Final full `pnpm test:e2e`: exit 0, 43 passed. Includes switching from a
  wrong choice to the correct one before Next and concurrent same-position
  requests. A below-cap final question is not applicable to unbounded runs.
- `pnpm verify`: exit 0, 83 unit tests; typecheck, lint, format and build passed.
- `git diff --check` and `git diff --cached --check`: exit 0.
- Neither hosted Supabase nor the interactive local backend was changed.

Remaining scope: no separate Hardcore streak analytics or question-pool
performance benchmark. Active question selection currently uses a randomized
eligible scan. The earlier audit file remains untracked and untouched.
