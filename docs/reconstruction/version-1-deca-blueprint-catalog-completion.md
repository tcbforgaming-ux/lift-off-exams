# V1 DECA Blueprint Catalog and Generation

## Baseline and Approved Rules

- Worktree: `codex/local-reconstruction`; starting HEAD:
  `f50137a1487cc0e013d907b7ee3cf5f71a46d666`. The baseline had unrelated
  verification, audit, and Admin navigation edits. They were retained outside
  the checkpoint.
- Source: original PRD §19.3, `work/prd/prd_text.txt`, blob
  `a176abcd6e5c319889ba819341b3411ce7db7f95`. The user approved its exact
  allocations and OR across selected custom topics, retaining AND and all
  required filters within a stratum. The approved strict scarcity rule
  supersedes PRD §41.1's fallback to a similar category.
- Hospitality's `Districts Test` is displayed as `District Test`.
  Entrepreneurship's `Product/ Service Management` uses the canonical tag
  `Product/Service Management`. Original spellings and source lines are
  retained. Hospitality District Knowledge Management and the State and ICDC
  Entrepreneurship entries for Entrepreneurship have zero slots and do not
  become selectable strata. No other topic names or weights were inferred.
  Business Management and Administration is a supported category but §19.3
  specifies no preset for it.

## Catalog Comparison

Before provisioning, the isolated backend had no exact named §19.3 versions.
After provisioning it had exactly one active `prd-19.3-v1` version per exam
and no duplicate, missing, mismatched, or draft-only entries. All named exams
have a 100-question allocation:

| Exam family                          | District source rows | State source rows | ICDC source rows |
| ------------------------------------ | -------------------: | ----------------: | ---------------: |
| Business Administration Core         |                   17 |                15 |               15 |
| Marketing Cluster Exam               |                   20 |                17 |               17 |
| Finance Cluster Exam                 |                   15 |                12 |               12 |
| Hospitality and Tourism Cluster Exam |                   21 |                21 |               21 |
| Entrepreneurship Cluster Exam        |                   22 |                21 |               22 |

The [full comparison](version-1-deca-blueprint-catalog-inventory.csv) lists
exact names, versions, stable IDs, individual allocations and available
inventory. The clean verification baseline has zero eligible questions in
each positive official stratum and a joint deficit of 100 for every exam.
The browser and SQL tests load synthetic inventory to prove generation; they
do not certify the user's question bank or publish any test fixtures.

## Changes and Evidence

| Requirement                | Implementation and evidence                                                                                                                                                                                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reproducible catalog       | `20261115000600` uses stable IDs, normal validation and audited publication. The source-check script compares all 268 rows and all totals. The SQL suite checks repeat provisioning and preserves later staff activation.                                                                                                          |
| Exact selection            | `20261115000700` keeps existing successful greedy selections and repairs otherwise false shortages deterministically when overlapping strata compete for the same IDs. SQL fixtures check 100-question allocations, distinct IDs, fixed-seed reproducibility, and the overlap edge case.                                           |
| Saved vs. custom           | `PracticeSetupPage.tsx` and `generation.ts` expose fixed Blueprint exam and editable Custom practice. Custom can accept any selected tag across strata; saved required tags remain AND. The SQL suite protects the wildcard case; browser tests exercise both workflows and preserve manual selection with weak-topic suggestions. |
| Shortage and quota         | A real shortage surfaces a message without adding a Test ID or using the generation allowance. A same-key retry returns the original ID without another charge. Full 100-question presets do not bypass the free cap of 40; free users can use Custom practice.                                                                    |
| Independent historical IDs | Updated generation uses the exact saved snapshot against the active bank even after blueprint retirement; original ordered membership is unchanged. Updated generation and new generation use the same Premium activity entitlement. Explanation access is unchanged.                                                              |

## Verification Commands

All database and browser checks targeted the disposable marker for
`liftoff-verification-59471` (API 59471, database 59472, shadow 59479;
browser frontend 4176). Neither the interactive instance nor the hosted
project was used.

| Command                                                                                                                                                                    | Final result                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `node scripts/check-deca-v1-source.mjs`                                                                                                                                    | Exit 0; 15 exact definitions, 268 allocations.                                                                                                 |
| `pnpm test:backend`                                                                                                                                                        | Exit 0; guarded reset, 987 passing assertions across 38 SQL files; 29 assertions in DB 038. No public schema drift; generated types identical. |
| `pnpm test:backend:e2e tests/e2e/deca-v1-catalog.spec.ts tests/e2e/generate.spec.ts tests/e2e/analytics.spec.ts tests/e2e/phase-b.spec.ts tests/e2e/staff-catalog.spec.ts` | Exit 0; 8 browser tests passed on Chrome.                                                                                                      |
| `pnpm verify`                                                                                                                                                              | Exit 0; typecheck, lint, formatting, 88 unit tests and build passed.                                                                           |
| `git diff --check` and `git diff --cached --check`                                                                                                                         | Whitespace checks.                                                                                                                             |

`pnpm test:hosted-grants` also exited 0 on the isolated local backend:
987 database assertions plus 8 grant assertions.

The first browser run passed 7 of 8 and revealed that updated generation
used an explanation-access check for the activity cap. Aligning the activity
checks fixed that failure. An initial typecheck also exposed a browser-only
application import in the new Node-side test; the test now reads persisted
allocations directly.

## Hosted Follow-Up

Nothing was deployed or written to hosted Supabase. Before any hosted
application, review a migration dry run and existing active family names.
Apply `20261115000600_deca_v1_blueprint_catalog.sql` then
`20261115000700_blueprint_selection_rules.sql` once preceding migrations are
verified. As database owner, run the read-only
`scripts/deca-v1-catalog-report.sql`. It flags same-name conflicts without
modifying them; use the staff draft/validate/activate workflow for approved
corrections. Resolve shortages with approved question inventory before
advertising complete presets. Inventory counts in that report are capped
at 251; the cap does not affect shortages for these 100-question presets.

This checkpoint does not implement the separate historical-repeat preference
in PRD §56.5 or ongoing inventory alerts.
