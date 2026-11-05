# Phase F: Quiz Mode and Activity Analytics

Baseline: `codex/local-reconstruction` at
`4f3b1631402ed2c59c2600ecdddf3d98c3398cd5`. The only existing worktree change
was the untracked `phase-f-focused-audit.md`. Answer status was checkpointed
at `4b462e682c816fe176776774411293bf909e59d5`; Test analytics at
`07ca24c9b7a6ce51cf9577ec5177eade4c3af514`; Test exports at the baseline above.

## Milestone 1: Quiz

Local checkpoint: `db1eb57b6bddb33621f8ca88541ff91a49b90bdd`.

| Requirement                                              | Implementation and evidence                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default 20, untimed, post-submit review (PRD 7.1, 9, 22) | `/quiz` and `start_quiz` use a fixed 20 for this slice. The server chooses distinct active bank questions in request-seeded order, persists an ordered Quiz ID, and refuses a short pool. There are no unapproved count, category, or difficulty controls.                                            |
| Trusted eligibility and saved activity (PRD 28, A05/A06) | Active/trialing subscription, account lifecycle check and idempotency are server-side. The shared ID resolver does not bypass entitlement or let a Quiz become timed. Protected Quiz explanations require paid entitlement; existing Test review rules are unchanged.                                 |
| Pause, resume, scoring and history                       | Reuses owned presence, pause/resume, submit and history. Browser playthrough saves a wrong choice and UNKNOWN, leaves a skip, pauses and resumes through History, submits, retries submission, reopens results and checks cross-user denial. Both Test session regressions passed in the focused run. |
| Exposure and exports                                     | Submitted Quiz answers feed the same personal answer evidence as Tests, including UNKNOWN but not skips. Quiz result controls omit downloads and direct export of a Quiz result is denied.                                                                                                            |

**Open product decision:** Should an unpaid Quiz consume a weekly Test
allowance, have a separately defined allowance, or use another policy? Free
launch is blocked pending that decision; the change creates neither a quota nor
unlimited free access. No custom Quiz setup or sample threshold was approved.

Changed files: migration `20261104002500_quiz_mode.sql`, generated public types,
routes and auth redirect allowlist, `QuizPage`, shared session client and
session/result pages, database contract `027_quiz_mode.sql`, and `quiz.spec.ts`.

### Focused verification

- `supabase --workdir .tmp/isolated-verification-backend test db "$PWD/supabase/tests/database/027_quiz_mode.sql"`: exit 0, 8 assertions.
- `pnpm test:e2e tests/e2e/quiz.spec.ts tests/e2e/test-session.spec.ts`: exit 0,
  3 Chromium cases. The integrated run additionally covers the final hash
  compatibility and mode-specific explanation gate.
- Final `pnpm test:e2e tests/e2e/quiz.spec.ts`: exit 0, 1 passed after making
  the wrong-answer fixture independent of the question selected from the bank.

## Milestone 2: Activity Analytics

| Requirement            | Implementation and evidence                                                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free overview          | Owned completed Test and Quiz count, with a combined 30-day average. Browser fixture checks two completed activities and 70%, excluding an unfinished Quiz.                                                          |
| Paid detail            | All, Tests, and Quizzes scope the same saved-score and snapshot calculations. Score history and extrema carry trusted mode labels. Detail queries remain bounded at 25 rows and page state resets on filter changes. |
| Access and time        | SQL tests cover explicit free and expired denial, no unpaid staff override, cross-user isolation, UTC midnight and inclusive through dates.                                                                          |
| Topics and confidence  | Snapshot topic counts and explicit uncertainty follow the selected mode. Quiz and All omit sample classifications; Tests retain the fixed-blueprint rule.                                                            |
| Test-only dependencies | Export controls disclose Test scope even in a Quiz view; browser inspects the Test-only CSV. Existing Test-only analytics RPCs remain available to exports and Generate.                                             |

Changed files: migration `20261104002600_activity_analytics.sql`, generated
types, Analytics and export scope copy, database contract
`028_activity_analytics.sql`, browser coverage and export regression matcher,
decision register addendum and completion ledger.

The first integrated database run caught a missing mode column in the new
history projection. The projection and migration guard were corrected without
weakening the test. The first integrated browser run passed three of four cases;
the analytics case found its fixture had seeded only four of five snapshots.
The fixture now creates its own five questions. Infinite Run, Hardcore, Demo
and hosted changes are outside this work.

### Verification

- `pnpm test:backend`: exit 0, 780 assertions across 28 suites, identical
  public schema drift and matching generated types.
- `pnpm test:e2e tests/e2e/activity-analytics.spec.ts`: exit 0, 1 passed.
  Observed the 80% Test, 60% Quiz, 70% combined average, both mode labels,
  the filtered uncertainty denominator, and the downloaded Test-only CSV.
- `pnpm verify`: exit 0, 83 unit tests plus typecheck, lint, format, and build.
- `pnpm test:e2e`: exit 0, 41 Chromium cases on a clean marked stack.
- `pnpm test:pipeline`: exit 0, 7 verification guards, 26 pipeline fixtures,
  and offline type checks.
- `pnpm test:hosted-grants`: exit 0, 780 database assertions and 8 local
  hosted-default grant checks.
- `pnpm test:pipeline:db`: exit 0, 16 importer cases.
- `git diff --check` and `git diff --cached --check`: exit 0.

The first successful database assertion run required the expected generated
type refresh before the clean drift/type comparison. Only the marked isolated
local backend on API port 58431 was used. No hosted provider, deployment,
interactive database, or production-scale benchmark was exercised.
