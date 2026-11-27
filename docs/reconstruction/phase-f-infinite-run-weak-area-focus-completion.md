# Phase F: Infinite Run Weak Area Focus

Baseline: `codex/local-reconstruction` at
`45d05a0efb1e78031726a6fb08cb08af08fd4172`. The starting worktree contained
local verification-infrastructure edits, a local-only PRD matrix revision,
and untracked audit documents. These pre-existing changes were preserved.
Only the marked local Supabase project `liftoff-verification-59471` was used
(API 59471, DB 59472, shadow 59479, browser 4176).

## Approved selection rules

PRD §§47.3–47.4 and 47.7 require a sufficient sample, weak-topic priority,
and unseen priority. The audit approved all owned activity modes; the
November 15 follow-up approved a separate cross-mode minimum. For example,
3/8 correct is 37.5% and qualifies; 0/7 does not, and 7/10 is not below 70%.

- Submitted Test and Quiz result items, committed Hardcore and Infinite Run
  answers, and graded Search attempts count. Merely viewing a question does
  not. The latest recorded attempt per question wins across all modes;
  repeated attempts do not increase the sample. Both wrong choices and
  explicit I Don't Know count as incorrect; skips and legacy status flags
  alone do not count. A graded question contributes once per distinct tag.
- Recorded correctness is never recomputed from the current answer key.
  Test/Quiz use result tags; Search uses its graded review snapshot; new
  Hardcore/Infinite questions capture tags when served. Older graded rows
  without a tag snapshot use the extant bank tags if no immutable source is
  available. They do not infer an outcome from legacy flags.
- Rank by lowest accuracy, then topic name in deterministic order. Setup
  ranks up to ten topics from the latest 10,000 graded events; this keeps the
  indexed evidence scan bounded. The frozen list persists through refresh
  and resume. No change to Test Generate suggestions or subscription policy.
- Within the selected category, choose unseen questions from focused topics
  before seen focused questions, preferring the weaker topic within the
  same tier. Avoid an immediate repeat when another focus candidate exists.
  If the focused pool disappears after launch, select from the Standard
  pool and show the fallback; use focus again when eligible inventory returns.
  At setup, require an explicit Standard selection when data or category
  inventory is insufficient. Standard selection itself is unchanged.

## Implementation

Forward migrations `20261115000400_infinite_focus_evidence.sql` and
`20261115000500_infinite_weak_area_focus.sql` add private evidence
attribution, ranked selection and a frozen run snapshot. The existing
Standard RPC signature is retained. The new setup and focused launch RPCs
derive identity and eligibility on the server. Replenishment uses the same
selector, and the existing transaction and request key protect advance
retries. Focus metadata does not expose answer keys or explanations.

The focused selector returns one candidate per ranked topic before choosing
the winner, using the existing tag and answer lookup indexes. A scan may
still examine many questions when a topic is large or all have been seen;
no 80,000-question workload claim is made here.

## Test evidence

| Requirement                    | Local assertion                                                                                                                                                                                                                                                                |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Threshold, ownership and modes | `037_infinite_weak_area_focus.sql` contrasts seven and eight distinct questions, rejects exactly 70%, excludes another user and legacy statuses, and exercises Test/Quiz snapshot capture and real Hardcore/Infinite writes. The browser uses actual Search grades to qualify. |
| Question selection             | The SQL test expects **Focus 103** at launch: unseen in Budgeting, the weakest qualifying topic. It expects **Focus 102** on Next: unseen in Communication before repeats in Budgeting. Other-user exposure, retired questions, retry and stored mode are asserted.            |
| Depletion and recovery         | The same SQL test expects **Focus 105** when focused inventory is retired and **Focus 106** when a focused question becomes active. The browser checks the visible Standard warning and restored focus after inventory changes.                                                |
| Protected flow and regression  | Playwright verifies paid setup, insufficient data, free launch denial, owned resume/reload and payload redaction. Existing browser cases cover Standard Infinite Run, Hardcore, Quiz, Generate, combined analytics and Test-only exports.                                      |

The first local schema attempts caught a SQL composite-type mismatch and
incorrect migration anchors for the existing Hardcore snapshot. The first
SQL fixture violated the existing result count constraint. The first browser
fixture omitted an explicit active state in a mixed batch insert. These were
corrected before the final runs.

Commands used Supabase CLI 2.109.1 via `LIFTOFF_VERIFY_SUPABASE_CLI` and
installed Chrome via `LIFTOFF_VERIFY_CHROME=1`. For the focused checks,
`$wd` was the absolute path to `.tmp/isolated-verification-59471` and
`$cli` was the pinned CLI executable.

```powershell
node scripts/verify-backend.mjs upgrade
& $cli --workdir $wd test db (Resolve-Path 'supabase/tests/database/037_infinite_weak_area_focus.sql').Path
& $cli --workdir $wd gen types typescript --local --schema public
pnpm test:backend:e2e tests/e2e/infinite-weak-focus.spec.ts tests/e2e/infinite-run.spec.ts tests/e2e/hardcore.spec.ts tests/e2e/quiz.spec.ts tests/e2e/generate.spec.ts tests/e2e/activity-analytics.spec.ts tests/e2e/test-exports.spec.ts
pnpm test:backend
pnpm test:hosted-grants
pnpm test:backend:e2e tests/e2e/infinite-weak-focus.spec.ts
pnpm verify
git diff --check
git diff --cached --check
```

| Check                                             | Exit | Result                                                                          |
| ------------------------------------------------- | ---: | ------------------------------------------------------------------------------- |
| Guarded local forward upgrade and type generation |    0 | Both migrations applied; generated public signatures refreshed.                 |
| Focused pgTAP                                     |    0 | 30 passed, 0 failed.                                                            |
| Affected browser suite                            |    0 | 10 passed, 0 failed.                                                            |
| Final focused browser check                       |    0 | 2 passed, 0 failed.                                                             |
| Full database reset, drift and type check         |    0 | 958 assertions passed across 37 files; public schema and generated types match. |
| Local-only grant simulation                       |    0 | 958 database assertions plus 8 grant assertions passed.                         |
| `pnpm verify`                                     |    0 | 83 tests passed; typecheck, lint, formatting and build passed.                  |
| Worktree and staged whitespace checks             |    0 | No errors.                                                                      |

No unresolved product decision blocks the local workflow. No external
provider or hosted application was contacted. Performance at full bank
scale remains unverified.
