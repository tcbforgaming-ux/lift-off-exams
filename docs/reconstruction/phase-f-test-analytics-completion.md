# Phase F: Test Mode Analytics

Starting baseline `75c55a12c5090c86a675836dc24fdb309ee8280a` on
`codex/local-reconstruction`, with only the untracked focused audit report.
This step follows the personal answer evidence checkpoint; analytics reads
immutable Test items, not standalone search outcomes. Authority: PRD 23–25,
36 and 51, A05/A06 and November 4 rank-only recommendation approval.

## Behavior and Evidence

- Free count and 30-day average remain server-owned and scoped to Test Mode.
  Premium and the existing staff exception use trusted entitlement on each
  details call. Legacy RPC arrays are compatibility previews, not the UI source.
- Aggregate counts, averages and extremes use the whole selected range.
  History, topics and uncertainty drill-down each page through 25 rows, with
  deterministic ordering and a shared server cutoff for the selected range.
  Custom dates are inclusive in UTC. The database fixture exercises 101 results,
  26 topics and the UTC boundary.
- Confidence counts UNKNOWN per result item, with submitted answers as
  denominator; wrong A–D and skips are separately counted. Category is the
  saved Test category; difficulty/text/tags come from immutable item snapshots.
  Per-topic counts deduplicate the same tag on one item. Overall totals never
  sum overlapping topics. Drill-down links to owned results.
- For full-length attempts sharing one canonical fixed blueprint snapshot,
  expected exposure is tagged stratum count times tests in range. Only submitted
  answers count toward the threshold; a topic at the threshold qualifies.
  Mixed, shorter, noncanonical or unmapped histories show raw data and
  **Insufficient Data**, not invented expected exposure. A product decision is
  still needed on how those cases combine expected exposure.
- Generate requests the top three qualifying weak tags from the past 30 days,
  without padding. Display order and labels are separate from selected inputs
  and allocation. Browser coverage compares ordered membership using the same
  seed and blueprint inputs before and after highlighting.

Files: migration `20261104002300_test_analytics_details.sql`, generated
types, Analytics and Practice Setup pages, `025_test_analytics_details.sql`
and `analytics.spec.ts`. No exports, other activity modes, teams, billing
or quota enforcement were started.

## Local Verification

Application and backend checks used the integrated worktree based on the SHA
above; the first task was checkpointed separately as
`4b462e682c816fe176776774411293bf909e59d5`.

- `pnpm test:backend`: exit 0, 736 pgTAP assertions across 25 files after a
  clean reset; public schema drift and generated types both identical.
- `pnpm test:e2e tests/e2e/question-search.spec.ts tests/e2e/analytics.spec.ts`:
  exit 0, 3 Chromium tests passed.
- `pnpm test:e2e`: exit 0, all 37 Chromium tests passed on the fresh isolated
  reset, including existing authorization, account-erasure and session regressions.
- `pnpm verify`: exit 0, type check, ESLint, Prettier, 81 unit tests across
  24 files, and Vite production build passed.
- `pnpm test:pipeline`: exit 0, 7 verifier guards, offline pipeline type
  checks, and 26 fixtures passed.
- `pnpm test:hosted-grants`: exit 0, 736 database assertions and 8
  hosted-default grant simulation checks, all on the isolated local stack.
- `pnpm test:pipeline:db`: exit 0, 16 actual importer database cases passed.
- `git diff --check` and `git diff --cached --check`: exit 0.

The first integrated database run exposed two UTC-fixture assertions, corrected
by moving the seeded timestamps across the intended midnight boundary. The
next run passed all SQL assertions but reported the expected generated-types
mismatch. The local artifact was refreshed before the clean verification.
No hosted provider calls were made.

The fixtures do not establish production backfill duration or latency for very
large lifetime histories. The earlier intermittent session startup issue was
not investigated in these two tasks.

Before exports, confirm whether unpaid staff may export and whether protected
explanations are part of premium files. Mixed/non-blueprint sample rules are a
separate analytics decision, not a blocker for Test-only export ownership.
