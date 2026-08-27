# Milestone 7: Test Sessions and Results

## Contracts

A **test definition** is the immutable Milestone 6 Test ID and its ordered question
membership. A **session** is one user's recoverable attempt. A **result** is the
immutable, server-calculated submission of that session. The browser never creates
ownership, question order, correctness, scores, timestamps, or entitlements.

Session IDs are server-generated UUIDs. Test IDs remain permanent 12-character share
codes. A user may retake a submitted Test ID, but may have only one unfinished attempt
for the same definition. Sessions do not expire in Version 1.

## State Machine

```text
in_progress <-> paused
in_progress  -> submitted
```

`submitted` is terminal. Answers and position may change only while `in_progress`.
Submitting while paused is rejected. Pause, resume, answer, position, and submit RPCs
lock the session row and require the caller's current optimistic session version.
Stale tabs must reload before retrying.

## Persistence And Scoring

- `start_test_session` snapshots safe presentation fields in the exact persisted
  Milestone 6 order. It does not regenerate or reshuffle questions.
- One `test_session_answers` row exists per session question. A save upserts only that
  answer and never accepts correctness.
- Progress is calculated from trusted answer rows. Unanswered questions are allowed
  and score as incorrect.
- `submit_test_session` locks the session, calculates the score from repository answer
  keys, snapshots result detail, updates question status, and finalizes the session in
  one transaction.
- Percentage is `round(correct / total * 100, 2)`. There is no weighting, penalty,
  curve, partial credit, or pass threshold.
- Repeated submission returns the one existing authoritative result.
- Active duration uses database timestamps and accumulated active periods. Version 1
  has no invented countdown or session expiration.

## Protected Content

Free users may see their selected answer and the correct answer after submission, but
must not receive explanation text. `get_test_result` never returns explanations.
`get_test_result_explanations` is a separate trusted RPC gated by
`has_premium_explanation_access()`, whose customer entitlement comes from an active or
trialing Stripe-synchronized `subscriptions` row. Missing or malformed entitlement is
restricted. The previously approved admin/owner exception remains explicit in that
database helper; elevated UI state cannot grant access.

Standard clients have no direct table privileges on session, answer, or result tables.
All access uses bounded ownership-checking security-definer RPCs. Administrators and
owners do not receive automatic access to another user's session or result.

## History And Recovery

`get_test_history` returns at most 50 rows, ordered by
`(last_activity_at desc, session_id desc)`. The next request supplies both cursor
values. In-progress and paused sessions link back to the same session ID; submitted
sessions link to their persisted result.

## Concurrency

- Start uses an advisory lock plus durable user/idempotency and open-attempt uniqueness.
- Answer, position, pause, resume, and submission use a row lock and compare-and-set
  session version.
- The first valid write wins; a stale writer receives a version-conflict error and
  reloads authoritative state.
- Submission locks before scoring, creates one result, and makes later answer writes
  fail. A retry returns the existing result.

## Audit

Start, pause, resume, submit, and result-finalized events are written through the
trusted admin audit system. Events contain actor, session, Test ID, safe state changes,
and timestamps. They do not contain question text, answer keys, explanations, or
tokens.

## Local Verification

The browser harness refuses non-loopback Supabase URLs. It obtains local keys from
`supabase status`, provisions deterministic local-only users and a four-question Test
ID, and does not call OpenAI or Make.

```powershell
supabase start
supabase db reset
supabase test db
supabase db diff --local --schema public
supabase gen types typescript --local --schema public > src/lib/supabase/database.types.ts
pnpm exec playwright install chromium
pnpm test:e2e
pnpm verify
```

Database test `010_test_sessions_results_contracts.sql` includes the 250-question
start, submit, scoring, item-count, and audit path. Playwright covers login, launch,
answer saves, navigation, pause, history recovery, resume, partial submission, score,
result refresh, free explanation non-delivery, and cross-user denial.

## Future Compatibility

Assignments must authorize or create sessions without becoming test definitions.
Analytics should derive from immutable results and result items. Timed tests require a
separate trusted timing policy and deadline metadata. A future audited correction path
must create explicit correction records rather than mutate results.
