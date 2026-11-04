# Phase C Step 2: Staff Question Authoring

Baseline: clean `codex/local-reconstruction` at
`6ffa49b0aa9d54b9f1f150c2d0e53aab66eb6f7a`. Step 1 was fully committed at that
SHA. Its predecessor for candidate review is
`79bdeb491d9af9ca70a1f0ef2f94ab99585fc651`.

## Contract

- PRD 6.1: Admin/owner manual form linked from Question Repository. Staff
  supply content and a reason; the server validates the complete question
  with the existing review validator and normalizes type, difficulty,
  answer IDs, text and tags. Manual correct-answer indices are 0–3.
- PRD 6.2: Upload a JSON array with 1–100 rows, at most 256 KiB. Each row
  supports `partitionKey`, `questionText`, `options` (four ordered
  `{"id":"A","text":"..."}` objects with IDs A–D), `correctOptionId` (A–D)
  or `correctAnswerIndex` (0–3), `explanation`, `difficulty`, `tags`,
  `questionType`, and `performanceIndicator`. The upload form applies its
  defaults for the last two when omitted. The UI offers a downloadable sample.
  Content limits follow candidate review: question/explanation 5–5000,
  options 1–1000, indicator 1–200, and 1–20 tags of 1–100 characters. Partition
  must be one of the existing six categories; type and difficulty normalize
  using the existing importer vocabulary. No new tag catalog was introduced.
- User decisions: import valid rows only; duplicate means equal question
  text after case-folding and trimming outer spaces. This checks the bank
  (including retired rows), all candidates, and earlier valid rows in the
  same file. No fuzzy similarity dashboard or exact-duplicate override was
  added. Staff commits are serialized independently of the OpenAI importer.
- Preview is read-only. Its digest binds input and the normalized row
  outcomes. Commit recomputes the preview while holding the staff-import
  lock and rejects a stale digest instead of silently changing acceptance.
- The private receipt is unique per authenticated actor/request UUID.
  A matching retry returns its original outcome before duplicate revalidation;
  different input, mode, token or reason with the same key is rejected.
  Only bounded row outcomes and a request hash are retained, not the uploaded
  file. Candidates, the receipt, and one audit event commit atomically.
- Manual and JSON rows enter Pending Review, never the published bank
  directly. Server-created import identity, source, actor, time and row
  association are separate from provider receipts. No OpenAI receipts, queue
  counters, generation targets or partition types changed. Existing candidate
  revision-bound approval and publication are used without modification.

## Files

- `supabase/migrations/20261104000500_staff_question_authoring.sql`
- `supabase/tests/database/018_staff_question_authoring_contracts.sql`
- `src/pages/admin/QuestionAuthoringPage.tsx`, `QuestionRepositoryPage.tsx`,
  `src/app/routes.ts`, generated `src/lib/supabase/database.types.ts`
- `tests/e2e/staff-authoring.spec.ts`, this document, and completion ledger

## Verification

Only marked project `liftoff-verification-isolated` on API port 58431 was
mutated. The interactive project on 58421 was not reset or migrated.

- Initial `pnpm test:backend`: 558 existing assertions passed; exit 1 at
  generated-type comparison. Copied the guarded runner-generated artifact
  with EOF whitespace normalization only.
- Final `pnpm test:backend`: exit 0, 578 assertions across 18 files; public
  schema drift and generated types identical. New SQL 018 covers access,
  shape and size, row validation and duplicates, read-only preview, audit
  rollback, pending-review enforcement, idempotency and stale preview.
- `pnpm test:hosted-grants`: exit 0; 578 database assertions plus 8 local
  grant simulation checks.
- `pnpm test:pipeline`: exit 0; 7 verifier guards, TypeScript contracts, and
  26 offline pipeline checks.
- `pnpm test:pipeline:db`: exit 0; 16 actual importer persistence cases.
- Initial full `pnpm test:e2e`: exit 1, 26 passed and 2 new tests failed on
  simultaneous busy and outcome status announcements. Consolidated the live
  status region; assertions were not relaxed.
- Final full `pnpm test:e2e`: exit 0, 28/28 Chromium tests. Covers the 390px
  manual form and keyboard Tab order, concurrent real commit requests,
  lost-response retry, one persisted candidate and audit event, malformed
  and oversized uploads, mixed JSON results on desktop, candidate review
  navigation, and student route denial.
- `pnpm verify`: exit 0; 81 unit tests plus typecheck, lint, formatting and
  production build.
- `git diff --check` and staged whitespace check: exit 0.

Other browser engines and dedicated screen-reader testing were not run.

Tag and blueprint management remain Phase C Step 3. No hosted database,
provider, push, PR, CI dispatch or deployment was used.
