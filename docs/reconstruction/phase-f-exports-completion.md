# Phase F: Test Mode Exports

Baseline: `codex/local-reconstruction`, `07ca24c9b7a6ce51cf9577ec5177eade4c3af514`.
The prior personal answer status commit is
`4b462e682c816fe176776774411293bf909e59d5`. The only preexisting worktree change
was the untracked `phase-f-focused-audit.md`; it is not part of this work.

## Policy and File Contracts

PRD 40.1's prohibition is superseded by the later approval: unpaid accounts,
including unpaid staff and expired subscribers, may prepare three exports per
week, resetting Monday at 00:00 UTC. A successful new PDF or CSV request uses
one allowance; an empty result or server rejection does not. The same request ID
replays without another charge, including a lost response. Paid subscriptions
use the trusted subscription period and may include saved explanations. Staff
role and editable profile tier never grant paid export access.

| Scope               | PDF and CSV                                                                                                                                                                                                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Individual result   | Owned submitted Test attempt, score and counts, saved dates and review data in question position order. Wrong A–D, UNKNOWN and unanswered remain distinct.                                                                                                                                                            |
| Analytics           | Applied UTC range, score history, extrema, topic counts and sample eligibility, confidence and uncertainty details, and recommendations. Uses the verified analytics calculations, not the capped preview arrays. The free analytics screen remains unchanged; its export may also be narrowed by explicit UTC dates. |
| Performance history | Owned completed Test attempts, newest first with session-ID ties. Honors the completed-compatible status filter and optional inclusive UTC dates. Unfinished attempts are not exported.                                                                                                                               |

The authenticated POST RPC authorizes and prepares a field-allowlisted dataset
with `Cache-Control: private, no-store`. The browser serializes that data to
a typed Blob and starts a local download; no PDF or CSV is hosted or stored.
The PDF uses repeated page and section headers and wraps long rows. Unicode
outside its built-in font renders with browser font fallback; those fallback
lines are images, not selectable or screen-reader text. CSV preserves Unicode,
quotes and multiline values, and neutralizes potential spreadsheet formulas.

A server cutoff and immutable results keep all sections of one export aligned.
The limits are 250 completed tests, 25,000 result items for analytics, 500
uncertainty details, and 1.5 MB of authorized data. Requests above a limit
are rejected, with date-range or result-size guidance. Receipt metadata is
private and cascades on Auth account erasure. No other activity modes, billing,
teams, test quota enforcement, or hosted changes were made.

## Changed Files

- Migration `20261104002400_test_mode_exports.sql`, generated database types,
  and `026_test_mode_exports.sql`.
- Shared export controls and serializers, the result/history/analytics page
  integrations, and jsPDF package/lock and build policy files.
- Serializer unit tests and `tests/e2e/test-exports.spec.ts`.

## Verification

Commands were run against the integrated changes on the baseline above, before
the local export checkpoint was committed.

- `pnpm test:backend`: exit 0, 757 pgTAP assertions in 26 files after a clean
  local reset. Public schema drift and regenerated database types were identical.
- `pnpm verify`: exit 0, 83 unit tests plus typecheck, ESLint, formatting,
  and the Vite production build.
- `pnpm test:e2e`: exit 0, 39 Chromium tests against the freshly reset stack.
- `pnpm exec vitest run src/lib/exports/testExport.test.ts`: exit 0, 2 passed.
- `pnpm test:e2e tests/e2e/test-exports.spec.ts` with
  `E2E_EXPORT_REVIEW=1`: exit 0, 2 Chromium tests. Covers all six paid files,
  MIME and names, keyboard activation, 101 scores and 26 topics, protected
  fields, a lost committed response, and unpaid quota exhaustion.
- Final `pnpm test:e2e tests/e2e/test-exports.spec.ts`: exit 0, 2 passed,
  including signed-out direct API denial and applied custom UTC range labels
  in both file formats.
- `pdftoppm -f 1 -l 2 -r 72 -png .tmp/export-review-result.pdf .tmp/export-review`:
  exit 0. Inspected both images for readable text, wrapping, continued headings,
  and Unicode. Poppler warned about unused font aliases.
- `pnpm test:pipeline`: exit 0, 7 guards, 26 fixtures, and offline type checks.
- `pnpm test:hosted-grants`: exit 0, 757 database assertions and 8 additional
  grant checks, on the isolated stack only.
- `pnpm test:pipeline:db`: exit 0, 16 importer cases.
- `git diff --check` and `git diff --cached --check`: exit 0.

The initial `pnpm add jspdf` resolved jsPDF 4.2.1 but exited 1 because pnpm
required an explicit transitive `core-js` build-script decision. The project
now explicitly disallows that script; subsequent install/checks passed.
Earlier runs also exposed a missing recent-authentication claim in the synthetic
deletion fixture, the expected generated-types refresh, a PDF test reader that
used delimiters rather than the stream's declared length, and four lint errors.
The underlying assertions were retained. Only the marked disposable local
backend on port 58431 was used; no hosted database or provider was accessed.

The synthetic cases establish boundary and completeness behavior, not
production latency or browser memory use near every configured size limit.
Tagged/searchable Unicode PDF output would require an embedded font and PDF
accessibility work; CSV remains fully machine-readable.
