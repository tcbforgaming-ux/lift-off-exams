# Phase C Step 1: Candidate Verification and Repository Editing

Baseline: clean `codex/local-reconstruction` at
`79bdeb491d9af9ca70a1f0ef2f94ab99585fc651`. The prior candidate implementation
was fully committed at that SHA, following `868a865`. No staged, unstaged or
untracked source work existed at the start.

## Scope and Acceptance

| Requirement                     | Implementation and verification                                                                                                                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Concurrent publication          | Candidate browser test sends two independent concurrent HTTP requests for one approved revision; asserts identical IDs, one question, one audit event                                                            |
| Candidate audit rollback        | SQL 016 injects a local-only audit error and checks no edit, approval, candidate link or published question remains                                                                                              |
| Filters and focus               | Browser holds a previous filter's real response until the new filter finishes; checks page reset, keyboard order, heading and return focus, and 390px width                                                      |
| General editing                 | PRD 6/49 and F16: staff-only detail and revision-checked update, with a reason, existing immutable version table and transactional audit, no report required                                                     |
| Validation and recovery         | SQL 017 exercises content/authorization/staleness; repository browser checks invalid input, stale save, retained draft, reload and successful save                                                               |
| Repository context              | Detail is a query parameter on the existing route. Closing removes only that parameter and preserves filter and cursor state                                                                                     |
| Lifecycle                       | Existing retire/restore RPC is called under a revision-checked row lock by the repository wrapper; restoration through this path validates content. Existing compatibility signature remains available           |
| Historical data and eligibility | SQL 017 checks the active session wording, original scoring key, result wording, original Test ID membership/order and update warning, plus actual generation failure when retired and success after restoration |
| Authorization                   | RPCs and route require admin/owner; SQL 017 denies student reads/edits and direct updates; browser checks student navigation denial                                                                              |

The approved self-approval/resubmission rules and candidate publication contract
are unchanged. Neither importer receipts, queue counters, partition shape nor
generation targets were changed. Repository edits do not update test membership,
session scoring keys, results or report rows.

## Isolation

The previous marked project at 58421 held one non-fixture login and was serving
the interactive website. It was not reset or migrated. Verification now uses
its own marker at `.tmp/isolated-verification-backend/disposable.json`, project
`liftoff-verification-isolated`, API 58431, DB 58432, shadow 58439. The reset runner
checks project/loopback identity and refuses to reset if it finds non-fixture
accounts. Test fixture guards use the new exact project/port pair. The interactive
site's database is not a migration target in this step.

## Files

- `supabase/migrations/20261104000400_repository_question_editor.sql`; generated
  `src/lib/supabase/database.types.ts`.
- `src/pages/admin/RepositoryQuestionEditor.tsx`, `QuestionRepositoryPage.tsx`,
  `QuestionRepositoryPage.test.tsx`, `CandidateReviewPage.tsx`;
  `src/lib/questions/repository.ts`.
- `supabase/tests/database/016_candidate_review_contracts.sql` and
  `017_repository_editor_contracts.sql`.
- `tests/e2e/candidate-review.spec.ts`, `repository-editor.spec.ts`; port/marker
  updates in `global-setup.ts`, `local-session-fixtures.ts`, `permissions.spec.ts`,
  `reports-navigation.spec.ts`, `session-recovery.spec.ts`, `session-uncertainty.spec.ts`.
- `scripts/verify-backend.mjs`, `scripts/test-pipeline-db.mjs`, this document and
  the completion ledger.

## Execution Record

- Initial `pnpm test:backend`: 535 assertions passed; exit 1 because new schema
  required generated types. Copied the runner-generated local artifact,
  normalizing only EOF whitespace.
- Subsequent `pnpm test:backend`: exit 0, 547 assertions, drift and generated
  types identical. Additional historical and generation assertions then added.
- `pnpm test:hosted-grants`: exit 0, 554 database assertions and 8 local
  grant simulation checks. No hosted access.
- `pnpm test:pipeline`: exit 0, 7 verifier guards and offline importer fixtures.
- `pnpm test:pipeline:db`: exit 0, 16 real importer cases.
- Initial full `pnpm test:e2e`: exit 1, 25 passed and 1 new candidate tab-order
  failure. Editor scenario and existing regressions passed. Heading/control
  order corrected; final `pnpm test:e2e`: exit 0, 26/26 Chromium tests.
- Final `pnpm test:backend`: exit 0, 558 assertions in 17 files. Includes
  repository audit-failure rollback and a later edit preserving submitted
  scores. Public schema drift and generated types both identical.
- Final `pnpm verify`: exit 0, 81 unit tests in 24 files, typecheck, lint,
  formatting and production build passed.
- `git diff --check` and staged whitespace check: exit 0.

Browser coverage includes desktop operation and a 390px candidate-detail width
assertion, keyboard entry/return and both announcements and error feedback.
Other browser engines and dedicated screen-reader testing were not run. The
interactive project's non-fixture account count remained one.

Manual authoring, JSON bulk import, tag and blueprint management remain open.
No hosted operation, push, deployment or live provider call was made.
