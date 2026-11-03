# Custom Practice and Remote Connection

The browser environment points to `xgjegsfjjuofksiuyara.supabase.co`.
Only the public URL and publishable key belong in the browser environment. Never
put a service-role key in a `VITE_` variable.

## Remote Migration State

On September 30, 2026, the pending Milestone 7 and 8 migrations were applied through
`supabase db push --linked` after inspecting a read-only schema dump:

- `20260826000300_test_sessions_and_results.sql`
- `20260826000400_test_definition_service_access.sql`
- `20260826000500_reports_administrative_review.sql`

The custom-practice extension is `20260930000100_custom_practice_configuration.sql`.
It and the follow-up `20260930000200_practice_function_privileges.sql` were deployed
to the linked project. The follow-up explicitly revokes hosted default anonymous
function grants; the existing authentication checks already denied access.
No generation queue, OpenAI Batch RPC, importer, or Edge Function was replaced.

## Generate Screen

`/generate` is the primary route; `/practice/setup` remains a compatibility route.
Category choices and topic tags come from active approved blueprint templates,
not a hardcoded question inventory. The form supports 1-250 questions, Easy/Medium/Hard,
blueprint topic selection, no timer or 1-999 minutes, seed entry, and premium study feedback.

Custom practice creates reusable private derived blueprint versions. The original
approved distribution is retained in the Test ID's `practice_source` snapshot.
Selected strata retain indicator, question-type, and excluded-tag constraints.
Counts are scaled by largest-remainder allocation; each question appears only once.
Insufficient pools still fail explicitly rather than duplicating questions.
Changing any form setting clears the previous result and rotates the retry key.

## Timer and Study Behavior

Superseded locally by the explicit November 2 auto-pause decision and Phase B
forward migrations. New attempts persist launching-user settings, not blindly
copied creator settings. Free launches use 60 minutes, no study feedback and at
most 40 questions. Paid users may customize their own attempts; shorter attempts
use the first N source members in saved order (November 3 decision).

Navigation/hidden/closed pages attempt an explicit release. Lost exit requests
recover on the next owned read at the last confirmed server presence, with a
ten-second heartbeat and thirty-second lease. Recovery is lazy, not a background
job; disconnected wall time is not added. Deadline enforcement remains server-side,
and final submitted duration is immutable. See `../reconstruction/phase-b-completion.md`.

Study feedback requires a current trusted premium entitlement, enabled session
settings, an owned session, and a saved answer to the requested question. A free
user launching a shared study Test ID does not receive premium study feedback.
Result explanations keep their existing server-enforced entitlement checks.

## Validation

```powershell
supabase db reset --local
supabase test db
supabase db diff --local --schema public
supabase gen types typescript --local --schema public
pnpm verify
pnpm test:e2e
```

Browser acceptance fixtures are local-only. No remote test users, test attempts,
or question fixtures should be created by the automated verification workflow.
Remote login, email callbacks, and real premium entitlement require separate
account smoke tests. Configure Supabase Auth redirect URLs for
`http://127.0.0.1:4173/auth/callback` and the eventual deployment origin.

Recorded verification: 331 database assertions, 48 unit tests, and four browser
acceptance tests passed. Type checking, lint, formatting, and production build
passed. The local schema diff reported no changes; the linked migration dry run
reported no pending migrations. Remote anonymous practice-settings access returned
HTTP 401. Real remote account login and email/OAuth callbacks were not exercised.

Run database contract tests immediately after a local reset: browser fixtures
persist locally and some existing database tests assume an empty baseline.
