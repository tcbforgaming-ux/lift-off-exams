# Phase C Checkpoint: Candidate Review

Phase C / F16 is **partial**, not complete. The reconstruction worktree started
clean at `868a865` on `codex/local-reconstruction`. Phase B's documented final
full-browser run was 24/24; no Phase B behavior was changed for this work.

## Acceptance Checklist

| Scope                                 | PRD / authority                                  | Permissions                            | Implementation and evidence                                                                                                                                                                                                  |
| ------------------------------------- | ------------------------------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Candidate queue and detail            | F16, PRD 37-38                                   | Admin/owner                            | `/admin/candidates`, 25 rows plus lookahead, stable creation timestamp/UUID cursor, composed filters, stale-response guard, on-demand detail; SQL 016 and browser workflow                                                   |
| Candidate edits and decisions         | F16 and November 4 decisions                     | Admin/owner                            | Required reasons, content validation, optimistic revision, audited request identity. Editor may approve; rejected candidates may be revised. SQL 016 covers denial, invalid edit, rejection, resubmission and approval retry |
| Publication                           | Existing one-staff gate and active bank contract | Admin/owner; pipeline remains separate | Existing publisher behind version-bound approval guard; stale and repeat requests tested in SQL 016, exact active published text in browser                                                                                  |
| General editor                        | PRD 6, 49                                        | Admin/owner                            | Not implemented; report-linked correction and immutable snapshots remain unchanged                                                                                                                                           |
| Retirement/restoration                | F16, lifecycle contract                          | Admin/owner                            | Existing repository actions retained; additional restoration/stale-transition coverage pending                                                                                                                               |
| Manual authoring and JSON bulk import | PRD 6.1-6.2                                      | Admin/owner                            | Not implemented; new trusted authoring/import routes needed, no provider receipts reused                                                                                                                                     |
| Tag management                        | PRD 5-6, 13                                      | Admin/owner                            | Not implemented; no destructive tag operations added                                                                                                                                                                         |
| Blueprint management                  | PRD 19.3, 49.4-49.7                              | Admin/owner subject to version rules   | Not implemented; existing generation contracts untouched                                                                                                                                                                     |

## Candidate Contract

Edit validates the resulting content, invalidates approval, increments the
review revision, and returns the candidate to Pending Review. Approve validates
again and binds to the exact content snapshot. Reject preserves identity and
source fields. Decisions and edits lock the row and append an audit event in
the same transaction. Reusing the same actor/request key with a changed payload
is rejected. The UI prevents approval while the editor has unsaved changes.

Publication locks the candidate, checks the expected revision and stored
approval snapshot, and calls the existing publication transaction. A retry
returns the already-linked question; the candidate, question, and publication
audit event commit together. Preexisting Approved rows without a bound snapshot
must be edited/resubmitted and approved before publication. Candidate partition
associations remain JSONB; publication continues using the first approved
partition for the published single-text partition key. No partition migration.

Anonymous callers have no execute grants; signed-in non-staff callers are
denied by RPC authorization and candidate RLS. Staff cannot write candidate or
question rows directly to bypass approval. Internal helpers are not browser
endpoints. Trusted service-role candidate insertion and all importer receipt
identities are preserved. Browser detail excludes raw provider output.

Review and publication do not change generation queue counters. The importer
continues to account for generation on import; rejection and publication do
not decrement needs again. Existing lifecycle retirement only changes active
question eligibility, not import receipts or historical result snapshots.
The 20-per-type generation target is unchanged.

## Changed Files

- `src/pages/admin/CandidateReviewPage.tsx`, `src/app/routes.ts`, generated
  `src/lib/supabase/database.types.ts`.
- Forward migrations `20261104000100_candidate_review_reads.sql`,
  `20261104000200_candidate_review_writes.sql`,
  `20261104000300_candidate_contract_alignment.sql`.
- SQL tests `001_schema_contracts.sql`, `002_rls_access_contracts.sql`,
  `016_candidate_review_contracts.sql`; browser `candidate-review.spec.ts`.
- This checkpoint and the reconstruction ledger.

## Verification

- `pnpm test:backend`: exit 0, 528 assertions across 16 files; no public schema
  drift and generated types match. Earlier runs identified old direct-write
  expectations; those now assert denial, with the positive path tested through RPCs.
- `pnpm verify`: exit 0, 81 unit tests, types, lint, format and build.
- First full browser run exposed a test locator mismatch after successful
  rejection (24 passed, 1 failed; exit 1). The accessible textbox locator was
  corrected; final `pnpm test:e2e` exited 0 with 25/25 Chromium tests passed.
  The new test uses 27 real rows with the same timestamp to exercise the UUID
  tie-breaker and return-to-list pagination, then checks publication in the bank.
- `pnpm test:hosted-grants`: exit 0, 528 database checks and 8 additional
  local grant checks.
- `pnpm test:pipeline`: exit 0, offline guards, contracts and importer fixtures.
- `pnpm test:pipeline:db`: exit 0, 16 actual persistence and retry cases.
- `git diff --check`: exit 0.

No hosted project, provider, deployment, PR, or push was used. Full Phase C
acceptance still requires the unfinished workflows and additional candidate
concurrency, audit rollback, filter-race and accessibility verification.
