# Phase F: Infinite Run

Status: **Complete for the approved local workflow.**
Continuation baseline: `9e8f7492eb6161b8503ce345d3c5e8c2e93838f9`.

## Approved Workflow

- The follow-up approval supersedes the approximate repeat threshold in PRD
  47.5. The run does not end at bank exhaustion: it can recycle questions
  before exhaustion and continues until Finish. An active one-question
  category is sufficient. Category is a hard filter; difficulty and tags
  are preferences. Selection favors unseen questions within a bounded window
  of up to 128 candidates and avoids an immediate repeat when possible.
- Next requires an A-D or I Don't Know response. It commits answer evidence,
  score, streak and the next snapshot in one transaction. Uncertainty is
  shown separately and included in the accuracy denominator. No answer key
  or explanation is served during play; Next returns correctness only.
- Exit leaves progress intact. Expiry hides the question and blocks Next,
  but permits Finish and owned review without explanations. Finish is
  idempotent. History links use private run IDs, not shareable replay IDs.
- Test/Quiz analytics and Test-only exports are unchanged. Weak-area focus
  and a large-pool performance benchmark are outside this slice.
- If all eligible questions are retired, the current snapshot still grades
  and the run stays open. Reopening after replenishment restores play.

The new migration `20261105003100_infinite_runs.sql` adds private run and
answer storage, bounded candidate selection, evidence integration and owned
RPCs. The UI adds the protected Infinite Run route and a History link.
Generated public types were refreshed from the isolated backend.
Forward migration `20261105003200_infinite_run_replenishment.sql` adds
reopen-time recovery for temporarily empty categories.

## Workflow Verification

- Focused `033_infinite_runs.sql`: exit 0, 22 passed. Covers category and
  soft preferences, one-question recycling, sanitized live data, required
  response, retry and stale position, uncertainty, ownership, mid-run
  expiry, idempotent finish, explanation entitlement and replenishment.
- `tests/e2e/infinite-run.spec.ts` exercises the paid UI, advancing beyond
  the first question, concurrent duplicate requests, lost-response retry,
  exit/reopen/refresh, and finish. Focused browser run: exit 0, 1 passed.
  The first invocation timed out on a label locator; the accessible
  combobox locator corrected it.
- Initial `pnpm test:backend`: 833 assertions passed and no public schema
  drift, but exit 1 on type comparison. The first type generation had
  included staging-only objects from an earlier grants fixture. Replaced
  the tracked file with the clean-reset output and ran
  `assertGeneratedTypesMatch` against that output: exit 0, identical.
- Final `pnpm test:backend`: exit 0, 833 assertions passed in 33 suites;
  public schema drift and generated public types both matched.
- `pnpm test:hosted-grants`: exit 0, database suite and 8 grant assertions
  on the local hosted-default fixture.
- `pnpm test:pipeline`: exit 0, offline fixtures and type contracts.
- `pnpm test:pipeline:db`: exit 0, 16 persistence and concurrency cases.
- Full `pnpm test:e2e`: exit 0, 44 passed, including Test, Quiz, Hardcore,
  activity analytics, and Test export regressions.
- `pnpm verify`: exit 0, 83 unit tests passed; typecheck, lint, formatting
  and production build passed.
- `git diff --check` and `git diff --cached --check`: exit 0.

Baseline: `codex/local-reconstruction` at
`694839e642a06cd384a707bdf4ac2e7f79f70cc7` (verified Hardcore).
Quiz: `db1eb57b6bddb33621f8ca88541ff91a49b90bdd`; combined analytics:
`07b3e40a2bb774fee6c1df96a25cad4023b98223`. Starting status had only the
pre-existing untracked `docs/reconstruction/phase-f-focused-audit.md`.

## Initial Rule Check

Sources: tracked PRD sections 7.3, 27, 28 and 47, Phase F completion and focused
audit, the decision register, and Quiz and Hardcore completion reports.

| Requirement                               | Source, evidence, or open decision                                                                                                                                                                                                                                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paid launch, no blueprint or fixed length | PRD 7.3 and 27.2-27.4; Phase F approval. The private guard reuses the Quiz subscription and account-lifecycle checks. Five SQL assertions cover paid, free, expired, signed-out and private grants.                                                                                                                               |
| Supply                                    | PRD 27.3-27.4 describes category, difficulty and tags, with difficulty and tags as preferences. PRD 47 prioritizes unseen questions but leaves small-pool exhaustion before the approximate 10,000-answer repeat threshold unclear. Confirm fallback and whether weak-focus eligibility is in this slice before wiring selection. |
| Responses and feedback                    | PRD 27.4 and 27.6 require locked answers, forward progression and separate uncertainty statistics. Confirm required responses versus skips, the accuracy denominator and immediate correctness feedback before implementing Next.                                                                                                 |
| Resume, expiry and finish                 | Confirm whether exit saves progress, whether expiry blocks resume and advancement while permitting finish/review, and how exhaustion transitions to results. These decisions block the run lifecycle and ownership tests.                                                                                                         |
| History, identity and review              | PRD 27.7 and 28 require unique identifiers and a mode label. Confirm private reference versus replay, review payload and explanations, and personal answer evidence. Combined analytics remains Test/Quiz; exports remain Test-only.                                                                                              |

## Initial Checkpoint

- `supabase/migrations/20261105003000_infinite_run_launch_access.sql`: private
  entitlement guard only; no public type changes.
- `supabase/tests/database/032_infinite_run_launch_access.sql`: focused guard
  assertions. This does not verify a public launch or end-to-end authorization.
- `supabase --workdir .tmp/isolated-verification-backend migration up --local`:
  exit 0 after confirming project `liftoff-verification-isolated`, API 58431.
- `supabase --workdir .tmp/isolated-verification-backend test db "$PWD/supabase/tests/database/032_infinite_run_launch_access.sql"`:
  exit 0, 5 passed, 0 failed.
- Browser and full regression suites, public schema drift and generated type
  comparison were not run for this checkpoint. The interactive database on
  58421 and hosted services were untouched.
