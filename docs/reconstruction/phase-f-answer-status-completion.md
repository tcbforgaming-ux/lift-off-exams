# Phase F: Personal Answer Status

Starting branch `codex/local-reconstruction`, HEAD
`75c55a12c5090c86a675836dc24fdb309ee8280a`. Initial status had only
`?? docs/reconstruction/phase-f-focused-audit.md`, preserved outside this commit.
Authority: PRD 38.4–38.5 and 36.8, A05/A06 and the November 4 signed-in keyword
decision. No other modes, exports, quotas, billing or teams were changed.

The private evidence table records owned immutable Test outcomes and future
search grades. Test evidence is keyed by session/question; search uses a client
request UUID, with a bounded compatibility rule for old clients (same option
within a recorded exposure). Conflicting keyed retries are rejected; identical
retries reuse the stored grade and recheck entitlement. Search computes latest
answer by event time with stable tie-breaks, independent of viewing and skips.
Both lifetime flags can be true. UNKNOWN is an answered incorrect outcome;
NULL skips are not answer evidence. No recorded evidence is not a claim of never.

Historical backfill is repeat-safe, uses saved `is_correct` and selection,
and does not regrade against the current bank. An ambiguous old cache status is
disclosed as unverified; overwrites before grade-event capture cannot be
reconstructed. A saved correct answer can correct a misleading legacy cache in
the search projection. Existing seen counts remain historical exposure counters,
not proof of actual on-screen views. Events are private and cascade when Auth
identity is erased; no separately retained answer snapshots were introduced.

Files: migration `20261104002200_personal_answer_evidence.sql`, generated
public types, `QuestionSearchPage.tsx`, `024_personal_answer_evidence.sql`,
and `question-search.spec.ts`. The migration does not rewrite scores,
Test IDs or immutable session/result snapshots.

Verification covers both grade orders, replay of an older key, UNKNOWN,
view/skip preservation, repeat backfill, legacy ambiguity, snapshot correction,
active/expired entitlement, ownership, bounded results and retired exclusion.
The focused browser flow covers warning dismissal and both lifetime flags;
the added pagination case verifies filter reset and retirement exclusion.

## Local Verification

- `pnpm test:e2e tests/e2e/question-search.spec.ts tests/e2e/analytics.spec.ts`:
  exit 0, 3 Chromium tests passed, including both search cases.
- Integrated `pnpm test:backend` ran 736 passing assertions across 25 files
  and reported identical public schema. That iteration exited 1 only at the
  expected types comparison before refreshing the generated artifact.
- Earlier iterations caught a wrong session join column and, in analytics
  fixtures, timestamps on the wrong side of UTC midnight. Both were corrected;
  assertions were retained. See the analytics completion report for the final
  integrated verification.

Only the marked local verification stack on API port 58431 was used.
