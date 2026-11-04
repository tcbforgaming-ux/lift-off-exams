# Phase C Step 3: Tag and Blueprint Management

## Baseline and Scope

- Worktree: `.tmp/local-reconstruction`, branch `codex/local-reconstruction`.
- Clean starting HEAD and verified Step 2 commit: `73db8e7083ae4845c89b03113709a1cc9f7cb853`. Step 1 ended at `6ffa49b0aa9d54b9f1f150c2d0e53aab66eb6f7a`.
- Local verification only: marked `liftoff-verification-isolated`, API 58431. Interactive API 58421, hosted data and provider APIs were not used. No Phase D work.

## Implementation and Acceptance Evidence

| Area                 | Behavior and evidence                                                                                                                                                                                                                                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staff access         | The Admin navigation exposes Tags & Blueprints. Server RPCs use trusted staff roles; direct browser writes are denied. SQL tests cover anonymous grants, student denial and admin activation.                                                                                                                                                            |
| Tag identity         | Catalog registration trims outer spaces and preserves case. Descriptions are metadata, not aliases. Existing bank, candidate and historical labels are read without rewriting them. SQL tests prove case-sensitive availability and stale-revision rejection.                                                                                            |
| Tag dependencies     | Staff see active question counts, pending candidate counts and matching blueprint references. Existing question associations are edited through the audited question editor. Legacy labels with outer whitespace are read-only in the catalog.                                                                                                           |
| Blueprint lifecycle  | Drafts use new version identifiers. Copying any earlier version produces a draft, never immediate reactivation. Admins and owners can explicitly activate a draft and retire the same family's previous active version. A saved draft cannot replace an active version that changed after it was created.                                                |
| Allocation           | Server checks approved categories, partitions, question types, difficulties, known tags and indicators; positive integer counts reconcile to the total (maximum 250). Positive weights use largest remainder, ties by stratum ID. The shared canonicalizer rejects incompatible criteria within a stratum, including the same required and excluded tag. |
| Historical integrity | The SQL suite generates before and after replacement, compares the old Test ID snapshot and complete ordered membership exactly, and verifies the new Test ID references the replacement. The migrations do not write sessions or results.                                                                                                               |
| Inventory            | Each stratum samples up to 251 eligible active question IDs. A server-only matching check measures the combined shortage across overlapping strata without reusing IDs. The SQL suite covers an overlap that has sufficient inventory in each stratum but a combined shortage. No sampled IDs are sent to the browser.                                   |
| Audit                | Tag saves and blueprint version changes use server actor identity and transactional audit writes. Injected audit failures in SQL leave the underlying tag and activation unchanged.                                                                                                                                                                      |
| Writer compatibility | No change to question tags, manual/JSON import shapes, candidate publication, generation receipts, partition contracts, counters or per-type target. Existing suites remain applicable.                                                                                                                                                                  |

Both lists use server keyset pagination (25 visible rows plus one lookahead).
The tag list discovers existing labels from stored arrays; response size is bounded,
but discovering and sorting labels is not an indexed catalog-only operation.
Inventory at larger production scale has not been benchmarked.

## Files

- `src/app/routes.ts`, `src/pages/admin/CatalogManagementPage.tsx`, generated `src/lib/supabase/database.types.ts`.
- Forward migrations `supabase/migrations/20261104000600_staff_tag_catalog.sql`, `supabase/migrations/20261104000700_staff_blueprint_versions.sql`, and `supabase/migrations/20261104000800_staff_blueprint_joint_inventory.sql`.
- `supabase/tests/database/019_staff_catalog_contracts.sql`, `tests/e2e/staff-catalog.spec.ts`.
- This report and `docs/reconstruction/completion-ledger.md`.

## Verification

Tested revision: Step 2 HEAD above plus the Step 3 working-tree changes listed here.

- `pnpm test:backend`: exit 0, 604 assertions passed, public drift and generated types identical. Earlier runs stopped at expected type mismatch, then at a missing reason in a synthetic blueprint fixture. Both were corrected.
- `pnpm test:pipeline`: exit 0, 7 verifier tests and 26 offline pipeline fixtures passed, with pipeline type contracts checked.
- `pnpm test:e2e`: exit 0, 29/29 backend-connected Chromium tests passed, including keyboard tag entry, mobile viewport overflow check, invalid JSON recovery, activation and student route denial.
- `pnpm test:hosted-grants`: exit 0, 604 database assertions and 8 hosted-default grant assertions passed. This was a simulation on the isolated local stack, not a hosted operation.
- `pnpm test:pipeline:db`: exit 0, 16 importer database cases passed.
- `pnpm verify`: exit 0, 81 unit tests and application typecheck, lint, formatting and production build passed.
- `git diff --check` and `git diff --cached --check`: exit 0.

No non-Chromium or screen-reader run, live provider checks, hosted CI, or
production-scale inventory benchmark was performed.

## Open Decisions and Limits

- No tag rename, merge, retirement or deletion. Before adding those operations, decide which roles may perform each action and whether active questions, pending candidates and future blueprint versions should migrate, retain labels or block the action. Historical snapshots must not be rewritten.
- No direct historical reactivation or standalone retirement. Copying an older version does not bypass explicit activation. The PRD's three-day rule for direct reversion is not implemented as direct reactivation.
- Inventory is a point-in-time feasibility check, not a promise that the existing seeded generator will find that assignment or that stock will remain unchanged. The preflight reports shortages without changing the activation or generation algorithm.

## Saved-Rule Regeneration Follow-up

Approved behavior: **Generate Updated Test** uses the original saved blueprint
rules against current eligible questions, even after the blueprint is retired.
The original Test ID still replays its stored questions. IDs without supported
saved rules remain replay-only.

Baseline: `fef97956ff98bfa9b7ad8d3a4b28c4be2e160ec1`. Forward migration
`20261104000900_regenerate_saved_blueprint.sql` shares the existing generator via
a private function. Only the trusted Test ID lookup can supply a saved snapshot;
ordinary generation still rejects retired blueprints and the free count cap is
unchanged. The regression in `019_staff_catalog_contracts.sql` checks current
inventory, exact rules, idempotency, a new share code, and unchanged old membership.

Follow-up verification: `pnpm test:backend` exited 0 with 612 assertions, no
public schema drift, and identical generated types. `pnpm verify` exited 0 with
81 unit tests plus type checking, lint, formatting, and build.
`pnpm test:e2e` exited 0 with all 29 Chromium cases passing, including the
existing updated-generation and depleted-pool flow. F16 is closed locally. The pipeline
and hosted-default grant checks listed above are from the Step 3 baseline;
no pipeline code or public function grants changed in this follow-up.
