# Stabilization Phase 2: October 21, 2026

## Baseline and Boundaries

Branch `production-rebuild`; HEAD `21ac4aa26882d691659cc04afde45139ad68f97b`.
The dirty baseline included Phase 1 migrations, verification scripts, CI, profile
fixes, audit evidence, plus prior Generate, session/timer, dashboard/theme, route,
generated-type and browser-test edits. All were preserved. No applicable AGENTS.md
was found. Authority remains the PRD plus the October audit decision register.

Before behavioral changes, the existing pipeline command reproduced P4/F13 and
P6/F14, and the real local browser run reproduced the admin-login redirect failure
(10 passed, 1 failed). The original October audit and Phase 1 report remain
historical evidence, unchanged by this remediation report.

No hosted/linked query, migration, deployment, push, remote CI invocation, live
OpenAI/Make/OAuth/email/payment call, real account mutation or production data copy
was performed. Only the Phase 1 marked disposable stack was reset or mutated.

## Confirmed Causes

1. `JSON.parse` over the entire nonblank-line array threw before record-level
   processing, so one bad line blocked valid surrounding output.
2. Candidate/receipt commits and Edge checkpoints were separate, both the old SQL
   RPC and Edge handler wrote job progress, and retry responses lost the original
   receipt contribution. Failure upserts could overwrite receipt outcomes. Stale
   Edge snapshots could also overwrite newer counters.
3. LoginPage navigated immediately after sign-in while RouteGate independently
   redirected authenticated guest pages to `/dashboard`. Profile resolution and
   competing navigations determined which destination won. Queries/fragments were
   discarded and late account-profile requests were not generation-checked.

## Changed Components

New forward migrations, after the two Phase 1 repairs:

1. `20261021000100_generation_output_reliability.sql`: output-line ledger, RLS,
   atomic line commit, receipt-derived reconciliation, immutable receipt outcomes
   and protection against old direct checkpoint writes.
2. `20261021000200_output_sources_and_conflict_responses.sql`: immutable provider
   output/error-file source map and explicit HTTP 409 stale-worker conflicts.
3. `20261021000300_validate_output_manifest_totals.sql`: source totals cannot omit
   an error file; corrupt legacy offsets fail closed for operator review.
4. `20261021000400_preserve_import_response_deltas.sql`: explicit receipt-replay
   flag keeps invocation response deltas distinct from durable batch totals.

Earlier successfully applied migrations were not edited or consolidated. The
forward sequence records corrections discovered during local verification rather
than rewriting already-applied migration history. No partition schema, generation
target, question normalization, owner policy or paid-entitlement rule changed.

Pipeline source changes are limited to the shared output parser and importer.
The scheduler, starter, builder and existing insert RPC signatures remain intact.
Other changes cover RouteGate, AuthProvider, login/callback/navigation helpers,
generated database types, tests, offline Edge type checking, disposable runner,
CI integration and this report.

## Parsing and Durable Identity

- Existing `import_offset` means a count of **nonblank source lines**, not bytes,
  physical lines or successfully imported questions. Malformed nonblank lines
  occupy their own ordinal. This preserves the old trim/filter offset convention.
- `position` is zero-based nonblank ordinal; `source_line` is one-based physical
  line number. Blank lines, LF/CRLF and trailing newline do not create records.
- Primary output comes first; the provider error file follows. The primary-file
  prefix therefore retains its historical offsets. For error-only output, that
  file becomes the anchor. `metadata.output_sources` stores ordered file IDs and
  nonblank counts. It maps global positions to the actual source file and physical
  line. A ledger's `output_file_id` is the manifest anchor, not necessarily the
  file that supplied every row.
- Durable line key: `(batch_job_id, anchor_file_id, position)`. SHA-256 hashes the
  trimmed source line. Retries with the same identity/hash return the stored outcome;
  changed content or source manifests fail with HTTP 409.
- Invalid JSON, invalid envelopes, missing/invalid/unknown custom IDs, provider
  errors, missing model text, invalid model JSON and question validation have
  separate fixed codes. No speculative JSON/model repair is performed.
- A malformed unidentifiable line has a null custom ID and no invented queue or
  receipt. Its batch/file/ordinal/physical position/hash still make it traceable.
  Raw output, provider error bodies, question content and sensitive headers are
  not persisted in the quarantine ledger or returned in error messages.
- Existing candidate/raw-response storage is unchanged. Staff can read ledger
  rows through RLS; ordinary users cannot. Existing pipeline monitoring retains
  batch failure counts and a bounded error summary. No new admin product UI was added.

Bounds: at most 3 jobs per request, chunk size 1–100 (default 25), 2 files, 32 MiB
combined streamed input, 10,000 nonblank lines, and 512 KiB parsed JSON per line.
Oversized lines get a bounded invalid-envelope outcome; oversized files/manifests
fail without advancing a checkpoint. SQL also bounds the question array to 1,000;
the existing generator's target remains **20 per type**.

## Transactions, Accounting and Concurrency

`register_generation_output_sources()` locks the job and fixes its ordered source
manifest. `commit_generation_output_line()` locks that same job row, validates the
next contiguous position, and atomically persists candidate insertion, original
receipt, queue changes and line outcome. If line/quarantine persistence fails, the
entire transaction rolls back, including candidates and queue decrements.

The existing insert RPC is called unchanged. Its provisional legacy job updates
are restored inside the same uncommitted transaction; durable job progress belongs
to reconciliation. Both original insert overloads remain available to their trusted
service callers. Receipt lookup retains the existing `batch UUID:custom_id` identity.

`reconcile_generation_output()` locks the job and derives totals from distinct durable
receipts plus failed lines without an already-counted failed receipt. It runs before
and after each chunk. A candidate/receipt/line commit can survive a subsequent
checkpoint failure; the next reconciliation recovers its contribution even if no
new lines remain. A replay does not overwrite a successful receipt with a zero-count
duplicate outcome. A different source position repeating the same response is a
genuine duplicate; changed content under the same custom ID is a conflict outcome.

| Counter                                                  | Meaning                                                                                                                                                          |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Job `imported_count`                                     | Candidate count in original durable receipts, summed once per receipt                                                                                            |
| Job `failed_count`                                       | Original receipt failure contributions plus failed source lines not already represented by a failed receipt; preserves the established mixed legacy failure unit |
| `metadata.output_failed_records`                         | Number of failed source-line outcomes, distinct from candidate counts                                                                                            |
| `metadata.output_duplicate_records`                      | Number of separate duplicate source responses                                                                                                                    |
| `metadata.skipped_count`                                 | Original receipt skipped-question counts plus skipped questions in genuine duplicate responses                                                                   |
| Job `import_offset`                                      | Monotonic compatible checkpoint, never blindly incremented from invocation deltas                                                                                |
| `metadata.output_cursor`                                 | Exact contiguous ledger prefix; separately replays a legacy prefix without resetting its old checkpoint                                                          |
| HTTP `imported_count` / `failed_count` / `skipped_count` | Per-invocation contributions/skips, preserving the old response scope; replays do not claim fresh candidate insertion                                            |
| HTTP `batch_totals`                                      | Explicit authoritative durable batch counters                                                                                                                    |
| HTTP `processed_count` / `total_processed_count`         | This invocation's visited records / total durable processed records                                                                                              |

Concurrent workers serialize only short DB transactions, never provider I/O. They
can replay the same committed position, but cannot introduce gaps, change source
identity, duplicate receipts/candidates, regress progress or complete unfinished
output. No lease/expiration mechanism is needed. A job trigger blocks old direct
REST progress writes after ledger enrollment. Stale conflicts use `PT409`/HTTP 409,
not `40001`: local verification found serialization errors could be retried by the
HTTP stack until timeout instead of returning a usable conflict response.

These HTTP 409 responses belong to the internal PostgREST RPC boundary. The Edge
handler returns a fixed, retryable HTTP 500 when persistence fails; it does not
forward potentially sensitive SQL error messages to Make.

All three new public RPCs are explicitly service-only with the Phase 1 trusted
server guard. New trigger helpers remain private. Browser grants, protected profile
columns, voting protections, audit restrictions and subscription checks remain intact.

### Terminal Outcomes and Legacy Limits

Pending output retains job status `completed` (provider completed, import pending).
Fully processed success or partial success uses existing terminal `imported` status;
`metadata.import_outcome` explicitly distinguishes `success` from `partial`. All-failed
output uses `failed`. `metadata.output_processed` distinguishes all known output
being processed from all responses succeeding. Failure totals/summary remain visible;
zero new candidates is not silently labeled a clean successful import.

Legacy prefixes replay from a separate ledger cursor at zero while preserving the
stored checkpoint, successful receipts and candidate identities. Prior counters are
retained in diagnostic metadata before reconciliation. An offset beyond available
output fails closed; no historical total is invented. Output/error files must remain
available for replay. Terminal historical jobs are not silently re-opened by polling.

An old success receipt already overwritten/deleted, missing source files, manually
altered candidate identities or unrelated historical imports cannot necessarily be
reconstructed. New accounting explicitly covers **available durable receipts and
line outcomes**, not an unsupported claim about every historical candidate. Such
jobs require operator reconciliation against retained evidence; this task queried
or changed none of those real records. Failed response queues retain their existing
triage/lock semantics; no automatic queue-reset or regeneration policy was added.

## Post-Login Policy

Protected routes save a sanitized root-relative pathname, query and fragment in
router state. RouteGate alone navigates email logins once AuthProvider has resolved
the session/profile; LoginPage no longer races a second navigation. Default is
`/dashboard`. Required-role gates still deny unauthorized users after navigation;
a destination is never authorization.

Known customer/admin routes and canonical UUID detail routes are allowed. External,
protocol-relative, backslash/control/whitespace, malformed-percent, overlong, unknown
and auth-loop destinations fall back to the default. There is no persistent local
storage destination to leak into a subsequent account login.

Google retains the existing callback URL contract and optionally carries the same
sanitized `next` destination. Callback navigation waits for profile resolution and
uses the same resolver. Password-recovery redirects still go directly to the public
reset-password route. No live OAuth or recovery email was triggered.

AuthProvider clears stale role state during profile resolution and uses request
generations to ignore late account/profile results after a newer session or logout.
There are no arbitrary production delays, unauthorized-content flashes or owner
eligibility rule changes.

## Verification and CI

The four separated Phase 1 jobs remain: app verification, database-security,
fixture pipeline and backend browser. Frozen installation and always-run cleanup
remain. `test:pipeline` also type-checks the actual three Edge source modules with
offline runtime declarations; the VM forbids live fetch/client construction.
`test:pipeline:db` invokes the actual importer against local PostgREST/PostgreSQL,
with only vendor transport mocked. Its fault helpers are test-only, installed and
removed by the marked runner, never application migrations. No mocked transaction
is presented as proof of DB atomicity. CI captures safe result JSON/types/browser
artifacts and never uploads status/env credentials. Hosted jobs were not dispatched.

```powershell
pnpm install --frozen-lockfile
pnpm test:pipeline
pnpm test:backend
pnpm test:hosted-grants
pnpm test:pipeline:db
pnpm test:backend:prepare
pnpm test:backend:e2e
pnpm verify
git diff --check
pnpm test:backend:stop
```

The existing `.tmp/stabilization-backend` marker, exact loopback targets, port
isolation, no-linked-project checks, disabled email/Edge services and browser
external-DNS safeguards remain. `node scripts/verify-backend.mjs upgrade` is an
optional local-only forward-migration helper, not a hosted deployment command.

### Command Results

All validation below used synthetic data and the marked disposable stack.

| Command                          | Exit | Final result                                                                                                                       |
| -------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile` | 0    | Lockfile unchanged; no dependency changes                                                                                          |
| `pnpm test:pipeline`             | 0    | Offline Edge type check and 26 fixture checks passed, including original P4/P5/P6                                                  |
| `pnpm test:backend`              | 0    | Fresh reset applied 25 migrations; 464 assertions across 14 database files passed; no public schema drift; generated types matched |
| `pnpm test:hosted-grants`        | 0    | 464 database assertions and 8 additional hosted-default grant assertions passed locally                                            |
| `pnpm test:pipeline:db`          | 0    | 16 actual-importer/database integration scenarios passed, including concurrency, rollback, partial insertion and ambiguous retry   |
| `pnpm test:backend:prepare`      | 0    | Isolated backend and synthetic real-auth browser fixtures prepared                                                                 |
| `pnpm test:backend:e2e`          | 0    | 16 backend-connected Chromium tests passed, including the original dashboard case and 5 new redirect regressions                   |
| `pnpm verify`                    | 0    | Type check, lint, formatting, 72 unit tests across 20 files, and production build passed                                           |
| `git diff --check`               | 0    | No whitespace errors                                                                                                               |

The initial pipeline run failed P4/P6 and the initial real-auth browser run had
10 passes and the original admin-redirect failure. Intermediate checks exposed
HTTP serialization retry behavior, a same-transaction pgTAP marker issue and lint
errors. Each was investigated and corrected; failures were not skipped or relabeled.
New SQL was reviewed for destructive changes; existing applied migrations, starter
source and dependency lockfile remained unchanged. No secrets were added. All work
remains uncommitted, including the pre-existing dirty worktree.

| Finding                                                   | Local remediation status                                                                       |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| F13 malformed line blocks valid output                    | Repaired; actual importer processes surrounding records and persists bounded failures          |
| F14 successful import/checkpoint failure loses accounting | Repaired; durable receipts and transactional line ledger reconcile original contributions      |
| Admin pre-login destination lost                          | Repaired; one safe resolver waits for trusted profile resolution; role denial remains enforced |
| Historical receipts/files missing or overwritten          | Not automatically reconstructable; operator review required                                    |
| Hosted rollout and remote CI                              | Prepared only; not executed                                                                    |

Cleanup also passed: `pnpm test:backend:stop` exited 0 and stopped only
`liftoff-stabilization-disposable`, retaining its volumes. The normal development
stack and hosted projects were not stopped or modified.

## Release Handoff: Prepared, Not Executed

1. Review this diff and back up hosted schema/data/receipt metadata in a separately
   approved release. Confirm the actual project and applied migration history;
   the repository's Phase 1 changes have not been declared applied remotely.
2. Pause Make's import scheduling and drain in-flight old importer requests. Do not
   run mixed writers during the rollout. The original Make request body and
   `x-batch-secret` contract do not change.
3. Check retained output/error-file availability, corrupt/out-of-range offsets,
   overwritten receipts, queue linkage and any manually altered historical batches.
   Flag uncertain history for operator review, not automatic invented corrections.
4. Apply approved Phase 1 security migrations first, then all four Phase 2 forward
   migrations in chronological order. Verify service-only EXECUTE, output-ledger RLS,
   immutable receipts, source-manifest checks and original RPC signatures. Do not
   hand-edit or replay an already-applied historical migration.
5. Deploy the importer with its changed shared module together, only after the new
   RPCs exist. The starter, builder, partition schema and generation target do not
   require replacement. Keep secrets server-side; no browser service key is added.
6. Release frontend routing/provider/callback changes and generated types together.
   Verify email login/deep admin authorization, normal logout, callback destination
   allowlisting and unchanged recovery routing in the separately approved environment.
7. Run a deliberately small approved batch, verify source/receipt/candidate/job
   counts and one safe retry, then resume the schedule. Monitor partial/failed
   outcomes and unexpected 409s before increasing volume.
8. On release failure, pause scheduling. Do not roll back schema by dropping the
   ledger or receipts, and do not resume an old direct-checkpoint writer on an
   enrolled job. Prefer a forward fix or a service operator's reviewed reconciliation.

None of these hosted steps was executed. F13/F14 and the post-login redirect are
verified only against local synthetic evidence. Other audit findings (including
staging ownership/retention and unrelated UI/product gaps) remain outside this phase;
no whole-application or hosted production-readiness claim is made.
