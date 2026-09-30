# Milestone 8: Reports and Administrative Review

Milestone 8 adds a server-enforced workflow for reporting question content, staff
review, corrections, lifecycle changes, duplicate linking, and immutable auditing.

## Workflow

- An authenticated user can report only a question encountered in one of their own
  test sessions.
- The server captures a safe encounter snapshot without answer keys or explanations.
- The reporter can view only their own report status and public resolution message.
- Administrators and owners can open the bounded report queue and protected detail.
- Reports move from `open` to `in_review`, then to terminal `resolved`, `rejected`, or
  `duplicate` states. Terminal reports cannot be reopened.
- Corrections, report resolution, question version creation, lifecycle events, and
  audit records are transactional trusted-database operations.
- Duplicate reports remain stored and link to a primary report for the same question.

## Historical Integrity

`test_session_questions` captures the answer key and explanation in effect when the
session starts. Corrections never rewrite historical result snapshots or rescore past
submissions. Active sessions that began before a correction also submit against their
captured answer key.

## Authorization

- Direct client writes to reports, question revisions, lifecycle events, and audit logs
  are revoked.
- Staff authority is derived from `public.profiles`, never user-editable JWT metadata.
- Standard users cannot query the staff queue, protected report details, or audit log.
- All staff mutations use optimistic concurrency and idempotency keys.

## Local Verification

Run from the repository root with the local Supabase stack running:

```powershell
supabase db reset
supabase test db
supabase db diff --local --schema public
supabase gen types typescript --local --schema public > src/lib/supabase/database.types.ts
pnpm verify
pnpm test:e2e
```

The database suite covers report privacy, cross-user denial, staff access, report state
transitions, duplicate linking, immutable revisions and audits, correction conflicts,
lifecycle effects, deterministic Test ID preservation, and historical scoring.

The browser acceptance test covers report submission and user status tracking, denial
of the staff route to a standard user, staff correction, and audit visibility. It uses
only local fixtures and does not invoke OpenAI.

## Deployment Order

1. Back up and inspect the target schema.
2. Apply `20260826000500_reports_administrative_review.sql` in a staging project.
3. Regenerate database types and deploy the web application.
4. Run standard-user and staff smoke tests in staging.
5. Apply the same immutable migration to production through the established migration
   workflow. Do not paste fragments into the SQL editor.

## Operational Notes

- Monitor report volume, terminal-state latency, failed correction conflicts, and staff
  audit activity.
- The current queue UI loads at most 100 records per filtered request. Database RPCs
  support keyset cursors; expose pagination in the UI before queue volume regularly
  exceeds that limit.
- Reporter email is visible only in the protected staff detail and queue responses.
