# Phase F: Demo Mode

Status: **Partial for release.** The anonymous workflow uses five synthetic
five-question sets for local verification. No administrator-approved release
bank was found, and no synthetic question is published by a migration.

Baseline: `codex/local-reconstruction` at
`76ba65730ab4d4ee8d314f15dc4eb1182e4b3250`, the Version 1 audit revision.
Starting status contained only the untracked `phase-f-focused-audit.md` and
`version-1-current-state-audit.md`; both were preserved.

## Content And Rules

Sources: tracked PRD sections 7, 17.2, 58; reconstruction decision register,
Phase F backlog, and Version 1 audit. The historical prototype has one sample
path, not an approved five-set catalog. PRD 17.2 names the categories, requires
five questions per set, unlimited anonymous replay, no quota charge or saved
results, and a completion signup prompt. Section 58 does not explicitly
authorize retroactively importing an anonymous attempt.

| Set              | Local fixture topics                                         | Release source             |
| ---------------- | ------------------------------------------------------------ | -------------------------- |
| Marketing        | Targeting, metrics, research, distribution, benefits         | Synthetic; approval needed |
| Finance          | Profit, balance sheet, budget, fixed cost, break-even        | Synthetic; approval needed |
| Management       | Delegation, measurable goals, meetings, conflict, procedures | Synthetic; approval needed |
| Hospitality      | Guest service, front desk, accessibility, occupancy, events  | Synthetic; approval needed |
| Entrepreneurship | Prototyping, value proposition, funding, risk, MVP           | Synthetic; approval needed |

Local defaults pending explicit approval: one point per correct response;
skips count zero and are reported separately; Submit reveals the correct
choices but no explanations; replay and refresh discard the in-memory
attempt; signup is offered after review to save future activity only.
Signed-in visitors get the same stateless demo without the signup prompt.
The demo is untimed. The five synthetic sets live in
`tests/e2e/demo-fixtures.ts`; Playwright seeds only the marked isolated
backend through the test service client. A fresh deployment needs approved
content provisioned through a trusted writer before a set becomes available.

## Implementation And Acceptance

- Landing **Try a Demo**, five links, and public direct routes:
  `LandingPage.tsx`, `DemoPage.tsx`, `src/app/routes.ts`.
- Forward migration `20261106000100_public_demo.sql`: a dedicated
  service-written catalog and read-only public list/grading RPCs. An
  incomplete set is unavailable. No private question-bank joins or
  attempt/account writes. Keys appear only in an explicit grading response;
  this is an anonymous practice demo, not a tamper-proof exam.
- Generated public types updated. Shared answer normalization is reused;
  Test and Quiz sessions/results are unchanged.
- SQL `034_public_demo.sql`: catalog grants, invalid identifiers and
  malformed answers, payload field allowlist, scoring, and account-data
  isolation including evidence, export receipts and completion inputs.
- Browser `demo.spec.ts`: all five anonymous completions, known
  correct/incorrect/skipped score, key-free pre-submit payload, review,
  replay, invalid direct link, signed-in visit and refresh reset.
- Shared-flow browser: existing `test-session.spec.ts` and `quiz.spec.ts`.

## Verification Record

Only `liftoff-verification-isolated` on API port 58431 was used.
The interactive backend on 58421 and hosted services were untouched.

- `supabase --workdir .tmp/isolated-verification-backend migration up --local`:
  exit 0. Generated public types with
  `supabase --workdir .tmp/isolated-verification-backend gen types typescript --local --schema public`;
  staging-fixture-only types were excluded and checked against a clean reset.
- `supabase --workdir .tmp/isolated-verification-backend test db "$PWD/supabase/tests/database/034_public_demo.sql"`:
  exit 0, 13 passed, 0 failed.
- `pnpm test:e2e tests/e2e/demo.spec.ts tests/e2e/test-session.spec.ts tests/e2e/quiz.spec.ts`:
  exit 0, 4 passed, 0 failed in Chromium (including five completions inside
  the Demo case).
- `pnpm test:backend`: exit 0, 846 assertions in 34 files, 0 failed.
  Public schema drift and generated public types both matched.
- `pnpm test:hosted-grants`: exit 0, 846 database and 8 local hosted-default
  grant assertions, 0 failed.
- `pnpm verify`: exit 0, 83 unit tests in 25 files, 0 failed; typecheck,
  lint, formatting and production build passed.
- `rg -l -F -e 'What is a target market?' -e 'Protected explanation' -e 'demo-fixtures' dist`:
  exit 1 (expected no matches). The browser payload was separately checked
  against the exact allowed fields for all 25 questions.
- `git diff --check` and `git diff --cached --check`: exit 0.
- The broader Playwright and pipeline suites were not repeated; the latest
  audit covered them and this slice only adds Demo catalog, RPCs and routes.
