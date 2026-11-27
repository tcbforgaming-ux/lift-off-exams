# V1 Admin Reporting and Moderation

Baseline: `codex/local-reconstruction` at
`c886d885e892597cab61d1c9f8c2c814b5968ba9`. Existing local verification,
navigation, and Demo work was left outside the admin checkpoint. Only the
marked disposable `liftoff-verification-59471` stack is authorized here.

## Scope and Decisions

| Area                                         | Existing surface                                                                                                                         | Approved rule                                                                                                                                                                                                                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A: Platform reporting, PRD §§30, 57          | `/admin` links to tools; no platform aggregate RPC                                                                                       | Current Free/Premium counts, date-bounded new and active users, Test generation/completion and mean score, top categories/tags. Do not estimate Demo conversion or billing metrics.                                                                               |
| A: Report and question quality, §§31, 36, 54 | `/admin/reports`, detail, audit, and question repository already exist                                                                   | Flag at three open/in-review reports, or with at least 20 known graded answers at at most 25% correct, at least 95% correct, or at least 40% I Don't Know.                                                                                                        |
| B: Duplicate review, §37                     | `preview_staff_questions` and `commit_staff_questions` block exact normalized duplicates; candidate review and publication already exist | A trigram score of 0.80 or higher enters staff review. Admin or Owner can keep with a reason, request editing, or cancel the new item; historical content stays untouched.                                                                                        |
| C: Moderation and appeals, §§39, 46          | Owner Governance can suspend staff under a separate quorum; no student moderation queue                                                  | Admins and Owners may suspend and reinstate students only. Suspended users can sign in only to see status, submit/view one appeal per suspension, and sign out. Approval restores the account; expiry or indefinite suspension and moderation email are required. |
| C: Names and retirement, §§32, 38, 61        | Existing banned terms and profile writes; reversible catalog retirement exists                                                           | Case-insensitive whole words or phrases; reject rather than save a disallowed signup or rename. No separate username. Preserve the previous name and published history; use reversible retirement.                                                                |

The hosted protected-link and password-recovery tests are tracked separately
in [the Demo preview record](version-1-demo-hosted-preview.md). They do not
substitute for local role and RLS checks in this milestone.

## Milestone A: Implementation

- `20261115000800_staff_reporting.sql` adds date indexes and two
  staff-gated RPCs. Account tier is the trusted profile tier or qualifying
  active/trialing subscription; it is not a revenue metric. Date-selected
  counts use inclusive UTC calendar dates (exclusive next midnight, up
  to 366 days). Active users are distinct current accounts with a Ready
  Test creation, a submitted Test, or trusted graded evidence in range.
  Only Ready Test IDs and submitted Test-mode results feed generation and
  score summaries. Most-used categories and tags come from generated
  Test IDs, counting a tag once per ID.
- Quality excludes absent/unknown legacy evidence and counts every trusted
  graded observation, including explicit I Don't Know. That response is
  counted in both incorrect and I Don't Know; each percentage uses known
  graded attempts as the denominator. Reports are counted by creation
  date. Sorts use reports, answered, missed, or explicit I Don't Know
  counts. Stable (rank, ID) cursors bound returned details; answer keys and
  individual response records are not exposed.
- `StaffReporting.tsx`, `AdminDashboardPage.tsx`, and regenerated
  database types surface the date range, summary, quality flags, and
  linked question records. `ReportQueuePage.tsx`, `reports.ts`, and
  their filter test expose existing server-side difficulty and lifecycle
  filters and reset the cursor even when navigation changes the URL.

### Acceptance Evidence

| Check                                   | Evidence                                                                                                                                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staff-only aggregate and drill-down     | DB 039 denies a student, denies anonymous execute, and allows Admin and Owner; Chrome opens the precise question from its flag.                                                                |
| Definitions, empty state, and UTC edges | DB 039 checks known Test totals, duplicate tag handling, and exclusion at next midnight. Chrome changes dates and shows no scores/no question metrics for an empty range.                      |
| Flags and pagination                    | DB 039 checks 20 vs. 19 attempts, exact 25% and 40% thresholds, three report-only records and a stable cursor. Existing reports navigation still reaches 101 seeded reports and audit records. |
| Filter isolation                        | Report-queue unit checks cover stale results and resetting the cursor on URL navigation.                                                                                                       |

- `pnpm test:backend`: exit 0, 1,000 assertions across 39 SQL files, including
  13 new assertions. Public schema drift and generated types matched.
- `pnpm test:hosted-grants`: exit 0, 1,000 database assertions plus 8 grant
  assertions, all against disposable local Supabase.
- `pnpm test:backend:e2e tests/e2e/staff-reporting.spec.ts tests/e2e/reports-navigation.spec.ts`:
  exit 0, 3 passed. The first run (2 passed, 1 failed) exposed sibling
  React keys colliding on date changes; unique keys fixed it.
- `pnpm verify`: exit 0, 89 unit tests; typecheck, lint, format, and build.
- `git diff --check`: exit 0.

## Milestone B: Implementation

- `20261115000900_staff_near_duplicates.sql` adds a GIN trigram index and
  scans existing repository prompts for scores of at least 0.80 on
  case-folded, whitespace-normalized text. Exact trimmed/case-folded
  matches cannot be overridden. Only the top ten matches are reviewable;
  a larger set requires editing or cancellation.
- Candidate Detail shows both texts, creation times, and similarity.
  Admins and Owners can keep, request an edit, or cancel with an audit
  reason. The saved decision binds the evidence and candidate content.
  Reloads and retried requests cannot apply it twice. A changed
  candidate or changed matching evidence needs a new review.
- Publication keeps its original RPC contract and recorded approval
  requirement; it checks the live repository again under a lock without
  modifying a matched question, older Test ID, or result. The generation
  importer is untouched. A built-in index expression preserves direct
  service-role writes. The Candidate Detail URL is accepted by the
  existing restricted redirect allowlist; access still requires staff.
- Open: a cross-candidate near-match queue and early similarity findings
  in the authoring/JSON preview are not added here. Authored and imported
  candidates are guarded before publication.

### Acceptance Evidence

- `pnpm test:backend`: exit 0, 1,013 assertions across 40 SQL files.
  DB 040 covers service-role writes, student denials, exact/near/unrelated
  cases, no publication without review, edit/cancel transitions and an
  identical retry. Public schema drift and generated types matched.
- `pnpm test:backend:e2e tests/e2e/candidate-review.spec.ts tests/e2e/staff-reporting.spec.ts`:
  exit 0, all 3 passed. The browser followed the staff deep link, compared
  both prompts, hit the publication guard, saved a keep with an audit
  reason, and published without mutating the existing question.
- Earlier browser attempts exposed an index-function privilege, a
  missing safe redirect path for Candidate Review, and an unstable
  action-reason label after reload. The final rerun includes all fixes.
- `pnpm test:hosted-grants`: exit 0, 1,013 database and 8 grant assertions,
  all local. `pnpm verify`: exit 0, 89 unit tests and application checks.

## Milestone C: Display-Name Enforcement

- `20261115001000_banned_display_names.sql` replaces the old write-and-flag
  trigger with a server-side rejection. The rule applies to direct profile
  renames and Auth-created profiles. Email signup preflights the rule for
  useful feedback, but skipping that check does not bypass enforcement.
  Name matching folds case and treats runs of punctuation or whitespace as
  word separators. Existing profiles and historical review rows are retained.
- `/admin/name-rules` paginates current and retired rules. An Admin or
  Owner can activate or retire a rule with a reason; unchanged requests
  do not duplicate audits. Term changes and audit entries commit together.
  Existing owner governance and question/tag records were not rewritten.
- Account suspension, reinstatement, appeals, moderation email, and
  enforcement for already-signed-in students are not implemented in this
  slice. The next checkpoint needs a shared server-side account-access
  guard for owned reads and writes before adding an appeal-only route,
  transactional decisions and email delivery. UI redirects alone are not
  sufficient to enforce a suspension.

### Acceptance Evidence

- `pnpm test:backend`: exit 0, 1,026 assertions across 41 SQL files.
  DB 041 verifies Admin and Owner rule management, regular-account
  denial, phrase normalization, rejection in the Auth transaction, and
  preserving the old name on rejected rename. Public schema and types
  match.
- `pnpm test:backend:e2e tests/e2e/banned-names.spec.ts tests/e2e/auth-redirects.spec.ts`:
  exit 0, 6 passed. Chrome activates a real rule, rejects the signup,
  confirms the raw Auth endpoint also creates no account, and verifies
  name persistence and regular-user denial on the admin route.
- `pnpm test:hosted-grants`: exit 0, 1,026 database assertions and 8
  grant assertions, all against the disposable local database.
- `pnpm verify`: exit 0, 89 unit tests and application checks.

## Open Scope

No general broadcasts, notification preferences, or hosted mutations belong
to this checkpoint.

| Milestone | Status  | Next acceptance work                                                                                                                                                                                                                                                        |
| --------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A         | Partial | Add report-queue prioritization and configurable thresholds; reconcile the legacy Valid, Invalid, Spam, Fixed, and Work In Progress vocabulary with existing report states, and test the resulting actions and notices. The question-quality list is not the report queue.  |
| B         | Partial | Add a paginated near-match queue and expose advisory findings earlier in manual and bulk authoring; keep the publication rule authoritative.                                                                                                                                |
| C         | Partial | Implement and verify student suspension, expiry, reinstatement, appeal access, audit, and moderation email. Audit protected backend paths for stale sessions, preserve staff governance, and exercise reversible tag retirement when a tag is referenced by active content. |

Billing analytics and Demo conversion remain open under the approved initial
analytics scope; neither is estimated from missing data.

## November 27: Remaining Work Follow-Up

Branch: `codex/local-reconstruction`. Starting HEAD:
`7738608e0da7a64cc6e071d9cfaebfd846293900`.
Existing reporting: `78e0ef4287d96c2ad7783ee8d1914986e674c32e`;
publication guard: `3d5c917816cc465867222e3fd08d673e105294ef`;
banned names: `7738608e0da7a64cc6e071d9cfaebfd846293900`.
The preceding sections are historical, not this follow-up's final state.

The dirty baseline included unrelated CI/README/verification tooling,
Admin navigation changes, earlier Demo/preview reports and tests, and the
password-reset fix and test. These remain outside the milestone commits.
Verification used the entire current tree, including those changes; four
of the unit assertions belong to the existing password-reset tests.

### 1. Student Suspension and Appeals

- Migrations `20261127000100_student_moderation.sql` and
  `20261127000200_moderation_mail.sql` preserve staff roles and owner
  quorum. Admins/Owners may moderate students only. Duration/reason changes,
  reinstatement and appeal decisions require versions and retry keys.
  The account, notice queue and audit commit together.
- `/admin/moderation` accepts a Student User ID, supports 24 hours,
  7/30 days or indefinite suspension and displays history and appeals.
  `/account/suspension` exposes only the account holder's status and one
  written appeal. Approval restores access; denial retains restriction.
  Expiry is checked against database time on each request, without cron.
  Legacy student restrictions are backfilled without guessing their reason.
- The existing PostgREST pre-request gate covers public RPCs and table
  endpoints, including old JWTs. Shared per-account locks let ordinary
  in-flight requests finish before a staff change commits. Restrictive
  policies independently guard tables with existing policies. Intentionally
  server-only pipeline tables retain no client policies or grants.
- Auth permits sign-in/out. The app handles `account_suspension_only`
  after a denied request, on focus and on a 30-second profile check.
  Account-deletion recovery retains precedence. UI redirects are not
  the security boundary.
- `account_lifecycle_allows_actor` includes suspension; existing Team
  Invite and Stripe portal Edge Functions already call it. Pipeline
  functions use scheduler secrets, Stripe webhooks verify provider events,
  and the obsolete owner deletion endpoint remains disabled.
- `moderation_mail` plus `user_notifications` persist delivery status.
  SKIP LOCKED leases and token-bound acknowledgments make workers retryable.
  Failed delivery retries after five minutes. The Resend adapter reuses a
  stable notice ID as its provider idempotency key. Delivery is at least
  once: finite provider deduplication cannot guarantee exactly-once email
  after an arbitrarily delayed lost response.

### 2. Report Prioritization and Dispositions

- `20261127000400_report_priority_and_dispositions.sql` preserves legacy
  rows and status constraints; a separate nullable disposition records
  the approved mapping in the decision register.
- `/admin/reports` uses bounded (open-count, updated-time, ID) cursors.
  Staff can change the threshold with optimistic versioning and a reason.
  Live reports may change ranks during traversal; refreshing starts over.
  Question-quality flags are not used as report-queue priority.
- The detail page exposes Valid, Work In Progress, Fixed, Invalid and
  Spam. A logical retry key survives network failure. Actions, notices
  and audit are transactional and optimistic versions reject competing
  decisions. Legacy correction, lifecycle and report actions keep their
  original contracts and now also notify the reporter, never another
  account or the entire platform.

### 3. Near-Duplicate Discovery

- `20261127000300_near_duplicate_discovery.sql` adds the bounded
  `/admin/duplicates` queue using the existing 0.80 normalized trigram
  rule. Candidate links open the established evidence and decision panel.
- Manual and JSON previews show advisory matches without changing the
  canonical import token. Existing exact-duplicate enforcement remains.
  Content/evidence changes require renewed review and publication checks
  the current repository. Pending candidates do not enter the near-match
  pool; no existing published content is silently replaced.

### 4. Referenced-Tag Retirement

- `20261127000500_referenced_tag_retirement.sql` adds audited,
  revision-checked retirement/restoration to the existing catalog UI.
  Labels stay on questions, blueprint versions, saved Test membership and
  completed snapshots. Retirement is not cascading deletion or retagging.
- New authoring rejects retired labels. Generate hides retired custom
  topics; its RPC independently validates them. Successful same-key
  retries retain their original Test ID. Saved blueprint generation and
  replay retain their historical meaning. Restoration re-enables selection.
- The catalog URL now survives the restricted post-login redirect
  allowlist; role authorization remains unchanged.

### Hosted Follow-Up

No hosted database, public traffic, billing event, or Make/OpenAI batch was
changed. Review the hosted preflight and backup before applying the five
November 27 migrations in timestamp order. Deploy `deliver-moderation-mail`
with `verify_jwt=false` as recorded in config; it enforces its own secret.
Set `MODERATION_MAIL_SECRET`, `SUPABASE_URL`, `SERVICE_ROLE_KEY` (or the
provided service-role secret), `RESEND_API_KEY`, verified
`RESEND_FROM_EMAIL`, and the approved HTTPS `APP_URL`. Schedule server
POSTs with `x-moderation-secret` every few minutes. Never ship that secret
to the browser. Verify real delivery and appeal links on staging; local
adapters do not establish provider delivery.

### Final Local Acceptance Evidence

All four follow-up milestones are **Complete locally**. This supersedes the
historical partial statuses above, not unrelated open billing/Demo metrics.
The tested input was starting HEAD plus the complete working tree described
above, including preserved baseline verification fixes. No hosted test or
production delivery result is claimed.

| Milestone                      | Acceptance evidence                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Student suspension and appeals | `042_student_moderation.sql`: student-only role boundary, transactional rollback, cross-user appeal denial, one appeal/retry, timed expiry, indefinite suspension, duration changes, approval/denial, restoration, stale decisions and leased mail. `student-moderation.spec.ts`: suspend an already-signed-in account, deny direct Quiz/table requests, appeal and restore. Existing account-erasure browser and DB suites pass unchanged. |
| Report queue and actions       | `043_admin_remaining_workflows.sql`: threshold boundaries, stable page traversal, all five dispositions, version conflicts, idempotent retry and reporter-only notices. `admin-followup.spec.ts`: update threshold, concurrent identical committed requests with lost responses, retry without duplicated work, and Fixed. Existing reports pagination/filter tests pass.                                                                   |
| Near-duplicate discovery       | `043_admin_remaining_workflows.sql` and existing `040_near_duplicate_review.sql`: published repository scope, 0.80 matching, exact/unrelated cases, reviewed-content invalidation, role denial and publication controls. `duplicate-discovery.spec.ts`: second page of 27 candidates, manual and JSON advisory findings. Existing candidate review/authoring tests pass.                                                                    |
| Referenced-tag retirement      | `043_admin_remaining_workflows.sql` and `admin-followup.spec.ts`: active question, saved blueprint, generated Test ID and completed result exist before retirement; associations and snapshots remain unchanged. New choices/authoring reject retired tags; restoration works through catalog UI.                                                                                                                                           |

Commands ran from this worktree with the pinned CLI and documented Chrome:

The desktop runtime's bundled fallback `pnpm.cmd` ran these package scripts
(and was first on PATH for nested script calls). The workstation's unrelated
global pnpm shim was not used for the passing integrated run.

```powershell
$env:LIFTOFF_VERIFY_SUPABASE_CLI = (Resolve-Path '.tmp/verification-cli-2.109.1/supabase.exe').Path
$env:LIFTOFF_VERIFY_CHROME = '1'
pnpm test:backend
pnpm test:hosted-grants
pnpm test:pipeline
pnpm test:pipeline:db
pnpm test:backend:e2e
pnpm test:moderation-mail
pnpm verify
git diff --check
```

| Final command               | Exit | Actual result                                                                                                                                   |
| --------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test:backend`         | 0    | Guarded reset, 43 SQL files / 1,081 assertions pass; public schema drift identical; generated public types identical.                           |
| `pnpm test:hosted-grants`   | 0    | Repeats the same 1,081 assertions, then 8 local hosted-default grant assertions pass. These are overlapping, not 1,081 additional unique tests. |
| `pnpm test:pipeline`        | 0    | 7 verification-runner contracts and 26 offline importer fixture cases pass.                                                                     |
| `pnpm test:pipeline:db`     | 0    | 16 actual-handler persistence/concurrency cases pass.                                                                                           |
| `pnpm test:backend:e2e`     | 0    | Full suite: 60 passed, no failures or skips, Chrome, 3.1 minutes.                                                                               |
| `pnpm test:moderation-mail` | 0    | Worker TypeScript contracts and 2 delivery adapter tests pass, including provider failure and ambiguous acknowledgment.                         |
| `pnpm verify`               | 0    | Type checking, lint, formatting, 26 unit files / 93 tests, production build pass.                                                               |
| `git diff --check`          | 0    | No whitespace errors.                                                                                                                           |

Final integrated logs are local ignored `.tmp/admin-final-integrated-*.log`;
application verification is `.tmp/admin-final-verify.log`; mail adapter evidence
is `.tmp/admin-moderation-mail.log`. Earlier failed exploratory runs were fixed,
then these final commands reran against the same completed implementation.
After checkpoint review and documentation, `pnpm verify` passed again with
exit 0 and the same 93/93 assertions; log `.tmp/admin-checkpoint-verify.log`.
One real defect found during verification was ordering successive indefinite
suspensions in a transaction: use `clock_timestamp()` and prefer the active
record rather than an arbitrary equal-`now()` history row. The added assertion
fails before that fix and passes in the final database run.

The marker is `.tmp/isolated-verification-59471/disposable.json`, project
`liftoff-verification-59471`, API `http://127.0.0.1:59471`, database `59472`,
shadow `59479`, browser `4176`. Interactive `58421`, preview `4175` and hosted
Supabase were not modified. The runner copies migrations into that marked
disposable project before reset; it does not reset the interactive database.

### Changed Surface and Verification Limits

- Forward migrations: the five `20261127000100` through `20261127000500`
  files listed above. Public types regenerated in
  `src/lib/supabase/database.types.ts`; no historical migration was edited.
- Student client/server surface: `src/lib/auth/{AuthContext,AuthProvider,moderation,redirects}`,
  `src/app/{RouteGate,routes}`, `src/components/layout/AppShell.tsx`,
  `src/lib/supabase/browserClient.ts`, `StudentModerationPage.tsx`,
  `SuspensionPage.tsx`, `supabase/config.toml` and the new moderation-mail
  shared adapter/Edge Function. Only this task's AppShell hunks are staged.
- Report surface: `src/lib/reports/{reports,reports.test}.ts`,
  `ReportQueuePage.tsx`, `ReportDetailPage.tsx`, `ReportPrioritySettings.tsx`.
- Duplicate/tag surface: `NearDuplicateQueuePage.tsx`,
  `QuestionAuthoringPage.tsx`, `CatalogManagementPage.tsx`,
  `PracticeSetupPage.tsx` and their protected route/redirect entries.
- New tests: SQL `042` and `043`; browser `student-moderation`,
  `admin-followup`, `duplicate-discovery`; `scripts/moderation-mail.test.mjs`
  and `scripts/check-moderation-types.mjs`; package script for the latter.
- Updated documentation: this report, decision register, completion ledger,
  and 59 scoped local-evidence matrix rows. Existing unrelated matrix and
  documentation changes are preserved outside these checkpoints.
- [Protected RPC inventory](admin-protected-surface-inventory.csv) records
  129 authenticated public signatures and grants; its reproducible query is
  `scripts/admin-protected-surface-inventory.sql`. The common pre-request gate
  protects those HTTP entry points, not just the representative RPCs directly
  exercised by tests. Edge actors are reviewed above; anonymous Demo and
  secret-authorized maintenance/provider callbacks are intentionally separate.
- No 80,000-question performance benchmark, real Resend delivery, hosted
  migration, provider schedule, public cutover, or hosted RLS assertion was
  run. Report priority can change during cursor traversal when live reports
  change; refresh begins a new traversal. Local tests use stable fixtures.
- Local checkpoint commits separate student moderation, duplicate discovery,
  tag retirement and report actions. Shared cross-milestone SQL/browser
  assertions are included in the final integration checkpoint; final evidence
  applies to their combined tree. The preserved dirty baseline remains
  necessary verification input and is not silently included in the commits.
