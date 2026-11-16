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

## Open Scope

No general broadcasts, notification preferences, or hosted mutations belong
to this checkpoint. Report-status vocabulary, configurable thresholds and
report-queue prioritization require their own acceptance evidence; do not
infer them from the new dashboard ranking.
