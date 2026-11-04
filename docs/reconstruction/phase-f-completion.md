# Phase F: Version 1 Backlog

Baseline: Phase E commit `3608a4e9faaeb0b2e1777e9708ba4500c7cb961b` on
`codex/local-reconstruction`. Phase F is **partial**. The original audit is
reconciled in the [local audit closeout](local-audit-closeout.md).

| Slice and authority                                                    | Current implementation and dependencies                                                                                                                                                                           | Remaining acceptance                                                                                                                                                                              |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owned analytics, PRD 23–25 and A05                                     | Analytics reads immutable result snapshots. Free count and 30-day average; premium ranges, score history, extrema, topic accuracy and uncertainty. Generate ranks weak eligible tags without changing allocation. | Locally verified slice; browser history displays the latest 100 scores and the 25 weakest tags in the selected range. Larger-history paging and production-scale performance were not verified.   |
| Teams and assignments, A01 and approved team-role workflow             | Schema, trusted team role helpers and invite acceptance foundations; Teams route is still a placeholder. Team roles must not confer platform staff.                                                               | Complete invite, roster, assignment, student session/submission and instructor review. Test cross-team/member isolation, deadline rules, and private-result visibility.                           |
| Billing, PRD 17.4, 29.2, 34 and 46.4                                   | Existing trusted subscription reads, webhook and portal handler foundations, Phase E local cancellation checkpoint. No finished customer billing workflow or verified event ordering.                             | Build checkout/portal and local event adapter, verify duplicate/out-of-order events, provider failures, cancellation retries and entitlements.                                                    |
| Notifications and settings, PRD 29, 35, 50, 52                         | Profile editing, governance queue, and Phase E synthetic warning adapter exist. General inbox, preferences, delivery and email-change settings are incomplete.                                                    | Verify owned queue, channel policy, retry and truthful delivery states. Failed warning must leave recovery open. Verify settings transitions with local capture.                                  |
| Search, PRD 38.3–38.5, 53 and A05                                      | Signed-in keyword and exact filters; bounded cursor; unseen warning; trusted view, attempt, grading and owned latest status/seen count. Free explanations remain protected.                                       | Latest answer state is verified. Separate lifetime ever-correct and ever-incorrect flags in PRD 38.5 and reconciliation of historical skipped-item statuses are still open.                       |
| Exports, PRD 40 and A05                                                | Owned results/history/analytics provide inputs; no completed export workflow.                                                                                                                                     | Premium-only PDF/CSV for results, analytics and performance history. Verify authorized data only, no answer-explanation leak and usable output.                                                   |
| Quiz, Infinite Run, Hardcore, Demo; PRD 7, 17.2, 27–28, 55 and A03/A06 | Test Mode and its session/result security are verified. Other modes are not implemented in this build.                                                                                                            | Define and test mode launch/limits, unique IDs where required, durable progression, strike termination, replay/history and protected explanations. Verify the demo on a separate no-account path. |
| Account settings and navigation, PRD 25, 29 and A11                    | Separate admin/customer shells, theme, Profile, recovery, and existing history are present; analytics navigation added here.                                                                                      | Complete subscription, notification, contact/password workflows and navigation once their dependencies are ready.                                                                                 |

## Changed Files

- Audit copy: `README.md`, `src/pages/public/LandingPage.tsx`, CI artifact paths.
- Analytics: `src/pages/app/AnalyticsPage.tsx`, dashboard, routes, redirect
  allowlist, generated types, migration `20261104002000_owned_test_analytics.sql`,
  database contract `022_owned_analytics_contracts.sql` and `analytics.spec.ts`.
- Search: `QuestionSearchPage.tsx`, navigation, generated types, migration
  `20261104002100_owned_question_search.sql`, database contract
  `023_owned_question_search.sql` and `question-search.spec.ts`.
- Evidence: this report, the closeout and the reconstruction ledger.
- Integrated regression repair: `AccountDeletionPage.tsx` reloads lifecycle
  status when Auth switches between ordinary and recovery-only access, so a
  read started during reauthentication cannot keep the old view visible.

Provider calls, real billing, real account deletion, hosted CI and deployment
are not part of local verification.

## Confirmed November 4 Decisions

- Keyword search is available to every signed-in user, superseding the
  premium-only reading of PRD 38.3. The unseen warning and A05 explanation
  restriction still apply.
- Generate ranks and highlights weak eligible topic tags without changing
  selected tags, blueprint allocations, or deterministic generation.
- Assignments accept late submissions. Authorized instructors may see scores
  and submitted answers. The separate teams implementation must enforce
  membership and assignment scope on every read.
- Hardcore uses configurable strikes, applies them on Next, and ends when
  the strike cap is reached.
- The free weekly quota resets Monday at 00:00 UTC.
- A server-configured grace period determines the failed-renewal premium
  deadline. The billing slice must define the configuration and test its bounds.

## Integrated Verification

Tested revision: audit commit `8b51c48cf6aeeef16c24a17526c5a960565bb471`,
recovery fix `348cf41db5286e1ccb5d57c6071bd44821468aab`, and the owned
analytics/search changes listed above. Only the marked isolated backend on
API port 58431 was used.

- `pnpm test:backend`: exit 0, 708 assertions; no public schema drift and
  generated types matched. Earlier runs passed the database assertions but
  intentionally failed the generated-type comparison before the refresh.
- `pnpm test:hosted-grants`: exit 0, 708 database assertions and 8 grant checks.
- `pnpm test:pipeline`: exit 0, 7 verifier tests, 26 offline fixtures and
  pipeline type contracts.
- `pnpm test:pipeline:db`: exit 0, 16 local importer cases.
- `pnpm verify`: exit 0, 81 unit tests plus typecheck, lint, formatting and build.
- Focused analytics/search Playwright: exit 0, 2 passed. The full suite adds a
  check that weak-topic highlighting leaves the blueprint count and selection unchanged.
- Recovery regression repeat: `pnpm test:e2e tests/e2e/account-erasure.spec.ts --repeat-each 3`
  exited 0, six passed with unchanged assertions. The initial integrated run
  exited 1 (35 passed, one stale recovery-screen assertion). This is distinct
  from the earlier intermittent **Checking session** stall, which remains open.
- Reusing the focused run's fixture stack for a full repeat introduced another
  eligible fixture owner. The unchanged governance test correctly required two
  approvals (34 passed, two fixture-dependent failures, exit 1).
- Final integrated repeat: `pnpm test:backend:prepare` exited 0, then
  `pnpm test:e2e` exited 0 with all 36 Chromium tests passing on the clean
  marked stack. No assertion or timeout was weakened.
- `git diff --check` and `git diff --cached --check`: exit 0.

## Next Slice

Teams and assignments can proceed under the confirmed late-submission and
instructor-visibility rules. Start with trusted membership/invite isolation,
then assignment launch and student submission, then scoped instructor review.
The billing-event adapter, general notification delivery/preferences, exports,
remaining settings and activity modes remain open; none was marked verified.
Analytics uncertainty counts are aggregated by topic; the per-question
uncertainty drill-down remains open.

### Additional V1 Acceptance Detail

- PRD 17.3: the existing 40-question free launch/generation caps are not proof
  of quota enforcement. Test three newly generated tests, seven Test ID
  attempts, ten total per week, and a three-topic free-generation limit.
  The confirmed reset is Monday at 00:00 UTC.
- PRD 34: cover cancellation at period end, failed renewal and grace, and
  suspension/resumption without charging for suspended access. Use fixture
  events, not live payment traffic. Grace must come from server configuration.
- PRD 35/52: include completion and weekly notices, category preferences,
  enabled-channel delivery, and role-authorized broadcasts. Phase E's mandatory
  final warning must not be treated as delivered by preference changes.
- PRD 7, 17.2, 27 and 55: Quiz is untimed with a default of 20 questions;
  Demo uses five five-question curated tests without sign-in or saved results;
  paid Infinite Run continuously supplies questions without a fixed blueprint.
  Use the confirmed configurable Hardcore strike cap, evaluated on Next.
