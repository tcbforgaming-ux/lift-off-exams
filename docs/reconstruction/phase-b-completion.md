# Phase B Completion Record

Baseline (November 3, 2026): `codex/local-reconstruction`, HEAD
`2c19dfe893465330d3aacdd81cd99feb0ff0a04e`, dirty with verified Phase A and partial
Phase B. Original worktree remains untouched. No applicable repository AGENTS.md;
dependency-specific instructions are not project instructions.

## Acceptance Checklist

| Finding | Required implementation                                                        | Verification                                            | Status           |
| ------- | ------------------------------------------------------------------------------ | ------------------------------------------------------- | ---------------- |
| F05     | Full preview, Continue/update action, new identity preserving original         | Real-backend browser update/pool-shortage tests         | Verified locally |
| F06     | Per-attempt settings, trusted entitlement, free defaults/cap, exact membership | SQL 010/012 and 250-question browser flow               | Verified locally |
| F07     | Monotonic UI clock, persisted visibility, final-five reveal                    | Unit threshold, browser reload/reveal, SQL deadlines    | Verified locally |
| F08     | UNKNOWN distinct from omission, replacement/clear, safe persistence/scoring    | SQL 010/015 and uncertainty/250 browser tests           | Verified locally |
| F09     | Automatic pause, durable recovery, genuine tab exclusion, generation fencing   | SQL 010, full-suite session/presence/race flows         | Verified locally |
| F15     | Snapshot summaries and bounded history metadata                                | SQL pagination and browser post-result repository edits | Verified locally |

## Authority

PRD `work/prd/prd_text.txt`, earlier decision register and Phase A report apply.
Explicit November 2 answer: **Automatically pause on exit**. Lost exit requests
settle at last server-confirmed presence, not guessed client exit time; heartbeat
10 seconds, lease tolerance 30 seconds. Normal active deadlines remain server-owned.
Original five November migrations are preserved, corrections use forward migrations.
Free users retain the 40-question limit; trusted subscriptions, not profile tier,
grant paid access. No live providers or hosted database access is authorized.

Subset allocation was not specified in approved documentation: largest-remainder
allocation is documented for new generation, not an existing ID's immutable list.
Resolved explicitly November 3: **First N in saved order**. This is enforced and
persisted as `source_prefix_v1`; source membership/order is not redefined.

## Execution and Remaining Work

## Root Causes and Corrections

The initial full-suite run reproduced exactly 18 passes and 2 failures. Both
`test-session.spec.ts` tests used `fixture.email`, also used by `reports.spec.ts`.
The report test leaves an unfinished attempt. A new browser context then tries to
claim that same attempt while its prior lease is live. The application correctly
refuses the new client, and renders Session unavailable, not the question or Submit
Test button. The second failure is downstream of this shared-fixture contamination,
not an independent missing submission component. Each session regression now has a
new synthetic local user; no audit history was removed to hide the conflict.

Independent application hardening remains important: document-specific identity
avoids treating duplicated sessionStorage as the same tab; a real reload reuses its
stored identity but increments generation. React StrictMode cleanup is fenced,
stale reader responses are ignored, stale releases are no-ops, and old two-argument
RPCs cannot bypass a newer generation. Genuine second clients are denied until
pause/release or expiry. A retry control supports recovery after a lost lease.
Resume now reloads authoritative settings and acquires its claim before editing.
Writes and submissions retain ownership, row locks and optimistic versions; UI
submission is disabled while a save is pending. Repeated submission returns the
same immutable result, and stale writes cannot reopen a completed attempt.

## Launch, Results and Timing Contracts

- Free: first min(40, original count), 60 minutes, no study feedback, no launch
  customization. The old launch endpoint applies the same rules.
- Paid: first N (1..min(250, original count)), null/no timer or integer 1..999
  minutes, independent answer/explanation toggles. Entitlement is read from the
  trusted existing subscription policy, with its existing staff exception;
  editable profile tier and request metadata are not authority.
- Resolved settings are saved in `test_sessions.launch_config`, timer/feedback
  columns and exact immutable question snapshots. An existing unfinished attempt
  retains its saved settings. Reusing a launch key with changed resolved settings
  fails; retries of the same key return its attempt.
- Updated generation uses the original saved blueprint version/constraints and
  current eligible content through the existing generator. It creates a new ID,
  never updates original membership, and reports strict shortages. It is not the
  legacy replacement-ID workflow or a switch to historical question contents.
- UNKNOWN is one distinct saved answer value, counts as answered but incorrect;
  absence of a row means unanswered. Clear restores absence; A-D and UNKNOWN
  replace one another. No site-wide confidence analytics were introduced.
- Result summaries use immutable result-item tags/difficulty. Accuracy is correct
  divided by all questions in the group, including uncertain/unanswered incorrect
  responses, displayed to two decimals. Repeated tags count once per question;
  overlapping topic groups are labeled and not summed into overall totals.
- History metadata comes from owned session snapshots, bounded by the existing
  keyset history RPC. Missing metadata is explicitly unavailable, not fabricated.
- Timer preference is sessionStorage-scoped to the attempt. It survives refresh;
  final <=300 seconds force reveal, including short tests. The UI interpolates
  server-derived duration using monotonic performance time, not adjustable wall
  time. It never changes persisted deadlines. Only the threshold is announced,
  not every timer tick. Saved preference does not conceal the final countdown.
- Auto-pause recovery is lazy on an owned session/history read, not a scheduled
  background pause. An acknowledged exit freezes at server pause time; a lost exit
  freezes at last confirmed server presence after lease expiry. There can be up to
  a heartbeat interval of unconfirmed activity; exact offline exit time is not
  promised. No disconnected wall time is added after the cutoff.

## Files and Migrations

Previous five November migrations retained byte-for-byte. Three new forward files:

- `20261103000100_updated_test_and_history_metadata.sql`: updated-generation and
  bounded snapshot history RPCs.
- `20261103000200_session_launch_configuration.sql`: trusted resolution, configured
  launch transaction, ordered prefix, resolved settings column/trigger. The reviewed
  start transaction is cloned with checked anchors; old public signature remains a
  compatibility wrapper with the same enforcement.
- `20261103000300_session_presence_and_response_guards.sql`: fence legacy presence
  calls and add owned/versioned/deadline-protected response clearing.

Phase B implementation paths (relative to this worktree):

- `src/lib/tests/generation.ts`, `src/lib/sessions/session.ts`, `session.test.ts`,
  `resultSummaries.ts`, `resultSummaries.test.ts`, generated `src/lib/supabase/database.types.ts`.
- `src/pages/public/TestIdPage.tsx`, `TestIdPage.test.tsx`.
- `src/pages/app/TestSessionPage.tsx`, `TestSessionPage.test.tsx`, `DashboardPage.tsx`,
  `TestHistoryPage.tsx`, `TestResultPage.tsx`.
- `src/components/ui/SessionSubmitDialog.tsx`, `src/styles/global.css`.
- `supabase/tests/database/010_test_sessions_results_contracts.sql`,
  `012_custom_practice_contracts.sql`, retained `015_uncertainty_contracts.sql`.
- `tests/e2e/local-session-fixtures.ts`, `phase-b.spec.ts`, `test-session.spec.ts`,
  `session-recovery.spec.ts`, `session-uncertainty.spec.ts`, `generate.spec.ts`.
- Existing report browser tests accept the explicit Continue action when their
  shared source was corrected; all Phase A assertions remain in place.
- This document, completion ledger and `docs/tests/custom-practice-deployment.md`.
  Phase A's separate completion report inventories its additional preserved files.

## Current Execution Evidence

All runs target project `liftoff-stabilization-disposable`, API 127.0.0.1:58421,
DB 58422. Marker/root match and no linked project-ref are enforced by the runner.
These are current runs, not historical evidence:

| Command                                   | Exit / actual result                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `pnpm test:backend:prepare`               | 0, baseline reproduction stack prepared locally                                                |
| Initial `pnpm test:e2e`                   | 1, original two failures reproduced, 18/20 passed                                              |
| `pnpm test:backend` (final)               | 0, 33 migrations; 15 files / 512 assertions; no public schema drift; generated types identical |
| `pnpm test:hosted-grants`                 | 0, LOCAL simulation only, 512 assertions plus 8 grant checks                                   |
| `pnpm test:pipeline`                      | 0, 7 verifier guards, offline TypeScript and pipeline fixture harness                          |
| `pnpm test:pipeline:db`                   | 0, 16 actual importer persistence/concurrency/fault cases; cleanup passed                      |
| `pnpm verify`                             | 0, 81 tests / 24 files; typecheck, lint, format and production build                           |
| Full `pnpm test:e2e` after implementation | 0, 24/24, including all Phase A cases; final mobile framing repeat recorded below              |
| `git diff --check`                        | 0, including regenerated types with normalized generated EOF whitespace                        |

Types were generated only through `supabase --workdir .tmp/stabilization-backend
gen types typescript --local --schema public`; marker-checked generator normalized
trailing whitespace, not fields/signatures. Both enforced comparisons passed.

Intermediate failures were investigated, not skipped: intended free-policy changes
invalidated old 250-free/creator-timer expectations; fixtures now explicitly grant
trusted paid entitlement or assert the fixed free defaults. One synthetic UUID typo
and an expected-prefix query reading RLS-hidden source rows were corrected. The
paid prefix is now compared to its known exact fixture IDs. A 250-UUID fixture edit
hit URI limits and was batched in groups of 50. Screenshot review found a 920px
table minimum inherited on mobile; result-specific responsive tables and collapsed
question-link groups fix it, with a viewport-width assertion.

## Coverage and Limits

Chromium desktop/mobile only; no other engines or screen-reader certification.
Real APIs cover simultaneous save/pause and save/submit, version conflicts,
idempotent submission, genuine competing clients, stale generations (including
legacy bypass denial), reload, explicit pause, lost-exit recovery, UNKNOWN/clear,
strict updated generation, paid 250-member attempt/result, protected payloads,
immutable summaries after repository edits and cross-user denial. Database checks
add free 40-cap through legacy launch, fractional/over-limit rejection, profile-tier
spoof denial, exact ordered prefix, 999-minute persistence, cross-account creator
settings stripping, uncertainty replacement, bounded history and deadline behavior.

Native submission dialog supports focus entry, modal containment, Escape (unless
submitting), and restoration. Existing report dialog accessibility is preserved.
Page-error capture is asserted for Phase B browser flows. Expected server denials
and simulated lost responses are not mistaken for successful writes.

No live OAuth/email/Stripe/Make/OpenAI tests, hosted access, normal-development DB
reset, push, PR, CI dispatch or deployment. Original worktree is untouched.
Broader weekly-usage accounting, analytics, modes, admin tooling and team systems
are outside Phase B. Phase C is the next authorized scope only after separate
approval; it is not implemented here. Local checkpoint hashes and final verification
are appended after review.

One intermediate repeat finished 23/24: the pre-existing zero-row profile test
stalled at **Checking session** on a full navigation before its profile-deletion
fault was injected. This was not a Phase B presence denial; auth/provider code is
unchanged. Its exact intermittent root cause is not established. No timeouts or
assertions were relaxed. The full unchanged suite was repeated; its final result
is recorded below. This remains a local auth-startup reliability risk, not hidden
by the Phase B findings' scoped verification.

Desktop/mobile preview, session and results screenshots were captured in ignored
`test-results/phase-b-*.png`. Preview/session/result frames were visually inspected;
390px main-content width assertions pass. The header's existing horizontally
scrolling navigation remains unchanged. Submission focus entry, forward/backward
wrapping, Escape and trigger restoration are now actual browser assertions too.

Final unchanged full-suite repeat: **exit 0, 24/24 passed in 1.3 minutes**. No test
was skipped or retried automatically. Final document formatting and
`git diff --check` also exit 0. Phase B has no unresolved product decisions.

## Local Checkpoint

Verified combined Phase A/B implementation:
`4cfffd664fa4b38b527aebf4e2f7014ff9e17cd2` on `codex/local-reconstruction`.
Fifty explicitly named files were staged and reviewed; cached whitespace and
common secret-pattern checks passed. No runtime artifacts or environment files
were staged. The reconstruction worktree was clean after that commit. This
documentation follow-up records its SHA without amending verified code.

`pnpm test:backend:stop` exited 0; only the marked disposable stack stopped,
with its volumes retained. No hosted/remote action occurred. Next scope is Phase C:
candidate review, question/manual-bulk import, tag and blueprint administration;
it has not begun.
