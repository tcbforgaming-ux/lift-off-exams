# Phase F: Infinite Run

Status: **Partial.** The private paid-launch guard is verified; there is no
public launch endpoint or playable run yet.

Baseline: `codex/local-reconstruction` at
`694839e642a06cd384a707bdf4ac2e7f79f70cc7` (verified Hardcore).
Quiz: `db1eb57b6bddb33621f8ca88541ff91a49b90bdd`; combined analytics:
`07b3e40a2bb774fee6c1df96a25cad4023b98223`. Starting status had only the
pre-existing untracked `docs/reconstruction/phase-f-focused-audit.md`.

## Rule Check

Sources: tracked PRD sections 7.3, 27, 28 and 47, Phase F completion and focused
audit, the decision register, and Quiz and Hardcore completion reports.

| Requirement                               | Source, evidence, or open decision                                                                                                                                                                                                                                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paid launch, no blueprint or fixed length | PRD 7.3 and 27.2-27.4; Phase F approval. The private guard reuses the Quiz subscription and account-lifecycle checks. Five SQL assertions cover paid, free, expired, signed-out and private grants.                                                                                                                               |
| Supply                                    | PRD 27.3-27.4 describes category, difficulty and tags, with difficulty and tags as preferences. PRD 47 prioritizes unseen questions but leaves small-pool exhaustion before the approximate 10,000-answer repeat threshold unclear. Confirm fallback and whether weak-focus eligibility is in this slice before wiring selection. |
| Responses and feedback                    | PRD 27.4 and 27.6 require locked answers, forward progression and separate uncertainty statistics. Confirm required responses versus skips, the accuracy denominator and immediate correctness feedback before implementing Next.                                                                                                 |
| Resume, expiry and finish                 | Confirm whether exit saves progress, whether expiry blocks resume and advancement while permitting finish/review, and how exhaustion transitions to results. These decisions block the run lifecycle and ownership tests.                                                                                                         |
| History, identity and review              | PRD 27.7 and 28 require unique identifiers and a mode label. Confirm private reference versus replay, review payload and explanations, and personal answer evidence. Combined analytics remains Test/Quiz; exports remain Test-only.                                                                                              |

## Checkpoint

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
