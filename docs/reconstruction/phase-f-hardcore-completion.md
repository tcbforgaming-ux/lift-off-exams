# Phase F: Hardcore Mode

Status: **Partial.** The private strike evaluator is verified. No launch,
session transitions, end screen, or Hardcore results are exposed yet.

Baseline: `codex/local-reconstruction` at
`07b3e40a2bb774fee6c1df96a25cad4023b98223` (verified activity analytics).
Verified Quiz: `db1eb57b6bddb33621f8ca88541ff91a49b90bdd`.
Starting status was `## codex/local-reconstruction` with only
`?? docs/reconstruction/phase-f-focused-audit.md`; preserved.

| Requirement                                                 | Source and evidence                                                                                                                                                                            |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Medium/Hard only                                            | PRD 55.1. Pool selection not wired.                                                                                                                                                            |
| Caps 1/2/3, configured before launch                        | PRD 55.2. Private evaluator rejects unsupported caps; launch and immutability not wired.                                                                                                       |
| Evaluate on Next, terminate at exact cap                    | November 4 approval in Phase F completion supersedes PRD 7.3 and 27.5. SQL covers strike math, exact cap and rejecting terminal state. No action wiring, persistence, or retry guarantees yet. |
| Wrong A-D and enabled I Don't Know strike; correct does not | PRD 55.3-55.6; focused SQL assertions. Disabled UNKNOWN is rejected. An unanswered action is outside the evaluator and has no approved behavior yet.                                           |
| Pause/recover; no backwards navigation                      | PRD 55.7-55.8 and Phase F focused audit. No session wiring yet.                                                                                                                                |
| Analytics separate; no Test exports                         | PRD 55.9-55.11 and milestone scope. No new data writers; exclusion regression not yet exercised.                                                                                               |

## Decisions Blocking Integration

- Launch entitlement and question pool scope beyond Medium/Hard, fixed length
  versus continuing to cap, and timing: block setup and launch.
- Default cap and unanswered Next behavior: block setup defaults and progression.
- Scoring denominator, History/review fields, committed answer evidence and
  explanation access for cap and below-cap finish: block terminal persistence
  and the end screen. Quiz is the implementation reference, not approval to
  silently inherit its product policy.

## Changes And Verification

- Forward migration `20261105002700_hardcore_strike_rules.sql`: private
  function only, no client grants or public type changes.
- `supabase/tests/database/029_hardcore_strike_rules.sql`: eight assertions.
- `pnpm test:backend:prepare`: exit 0, reset and applied migration on marked
  isolated backend (58431).
- `supabase --workdir .tmp/isolated-verification-backend test db "$PWD/supabase/tests/database/029_hardcore_strike_rules.sql"`:
  exit 0, 8 passed, 0 failed.
- `pnpm verify`: exit 0; 83 tests passed, typecheck, lint, format and build passed.
- Full backend/grant/pipeline and backend-connected browser suites, drift and
  type regeneration remain pending. No interactive or hosted backend changed.
