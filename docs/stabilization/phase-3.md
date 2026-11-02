# Stabilization Phase 3: Release Preparation

Date: November 2, 2026. This is a local release candidate, not a deployment approval.

## Identity and Boundaries

Starting branch: `production-rebuild`; HEAD `21ac4aa26882d691659cc04afde45139ad68f97b`.
The branch was three commits ahead of its local `source/production-rebuild` remote.
The source repository identifies GitHub `tcbforgaming-ux/lift-off-exams` (public).
GitHub's current default branch still points to Milestone 5 (`dcfef80`), so this
candidate also contains the existing Milestone 6, 7 and 8 ancestors, not merely a
six-migration hotfix. Review that full ancestry before a future publication.

Review branch: `codex/stabilization-phase3-2026-11-02`, in the independent local
clone `.tmp/release-candidate`. Original branch, index and unrelated dirty work are
preserved. The final candidate SHA is obtained with `git rev-parse HEAD` in that
clone and recorded in the completion report. A commit cannot contain its own SHA;
the document identifies this release by branch/date and its Git history.

The user confirmed that hosting integrations exist and explicitly directed this
release to remain local. **No push, PR, hosted CI, merge or rollout is authorized.**
Visible GitHub workflows contain CI only; rulesets returned an empty list, but
branch-protection inspection returned HTTP 403. This does not establish that branch
protections or external deployment hooks are absent. Hosted CI has no run URL or
passing conclusion for this candidate. Before any future push, an operator must
inspect Azure/other hosting, Supabase branch hooks, repository webhooks, inherited
workflows and production-environment protections, then explicitly approve a safe
non-deployment trigger. Never bypass this block by using a different branch name.

No hosted database, frontend, function, scheduler, real record, provider service or
remote credential was changed. No approved read-only database connection is
configured for this task. A historical project ref or public browser key is not a
catalog connection and does not establish current hosted compatibility. Historical
audit evidence identified `xgjegsfjjuofksiuyara`; it remains an **unverified release
target**, not permission to use a guessed DSN or mutate it.

## Scope and Review

Authority: tracked 92-page PRD extraction and the October 18 audit decision register.
Retained decisions include six categories, 250 questions, server-enforced roles,
subscription-protected explanations, immutable membership/results, owner governance
rules, and the existing Make/Edge/SQL/OpenAI/import/RPC pipeline with 20 per type.
No partition schema migration or new application feature was introduced here.

`phase-3-inventory.json` records every changed/untracked path considered, its
classification, inclusion decision and SHA-256. It excludes ignored runtime and
credential files entirely. Historical audit attachments and the normal local
`supabase/config.toml` changes remain outside the candidate. Phase 1/2 reports and
their safe catalog inventory are included as historical evidence, not current
hosted-state assertions.

Two coherent commits separate existing approved practice/dashboard prerequisites
from stabilization. These prerequisites are explicit: the current RouteGate and
browser tests use the separate admin overview and Generate routes; session tests
and generated types depend on the September custom-practice SQL. Omitting those
dependencies would verify a different application. Their source, SQL, RLS and tests
are included and reviewed; unrelated audit capture programs/screenshots are not.
The full prerequisite scope is listed in the generated inventory.

Review covered effective grants (including independent column/default ACLs), nested
invoker/definer audit calls, trusted profile and owner data, immutable receipt
outcomes, source manifests, legacy offsets, transactional line commits, retry and
concurrency, safe redirect destinations, and local-only provider/DB isolation.
Phase 1/2 migrations remain forward-only and unchanged. No known record-level
historical uncertainty is disguised as a successful schema migration.

### Defects Repaired During Release Review

The disposable runner previously printed a generated-type mismatch but returned
success. It also trusted the exit code of `db diff`, which can return zero while
emitting SQL. Both checks now fail closed: non-comment SQL or changed generated
types makes the command fail. Four offline regression tests cover empty/comment
diffs, DDL drift, permitted type normalization and actual type differences.
These tests run before the pipeline fixtures in CI. No assertion was weakened.
CI keeps four separated jobs and frozen installs, now with explicit read-only token
permissions and a narrowly scoped review-branch push trigger. This trigger is
prepared only; the user's no-push direction takes precedence.

## Reproduction and Evidence

From an independent checkout of the candidate, with Node 24, pnpm 11.9.0,
Supabase CLI 2.110.0, Docker Linux engine and Playwright Chromium:

```powershell
pnpm install --frozen-lockfile
pnpm test:pipeline
pnpm test:backend
pnpm test:hosted-grants
pnpm test:pipeline:db
pnpm test:backend:prepare
pnpm exec playwright install chromium
pnpm test:backend:e2e
pnpm verify
git diff --check
pnpm test:backend:stop
git status --short
```

No `.env.local`, root linked metadata, untracked source or live provider secret is
needed. The marked runner creates only loopback project
`liftoff-stabilization-disposable`, refuses unmarked volumes, and keeps keys in
memory. When moving verification between clones, stop the first marked stack;
retained volumes must be reused only with the original checked marker/config or
explicitly reviewed, never silently adopted by a new root. Tests install/remove
synthetic fault triggers only through that runner. SQL drift and generated-type
artifacts contain schema only. Browser traces contain disposable sessions only;
do not upload root environment/status files or use real accounts.

Current clean-checkout command results and exact tested SHA are recorded in
`phase-3-verification.md` after the candidate run. Historical Phase 2 numbers are
not substituted for this run. No GitHub job or artifact has been produced during
Phase 3 because pushing remains blocked by the user-confirmed integrations.

## Hosted Compatibility Gate

`phase-3-metadata-checks.sql` is a prepared read-only catalog inspection, not run
against a hosted project. Have the operator establish an explicit approved
read-only connection and target ref first; do not print its DSN or access browser
credentials. Compare applied migration identifiers AND actual bodies/owners,
search paths, table/column/function/default ACLs, RLS, triggers, constraints and
dependencies. Review manual changes before guarded function-body transformations:
the Phase 1/2 migrations deliberately abort on unexpected implementations.

The exact pending hosted migrations cannot be known until that inspection. The
ordered candidate suffix after the M8 baseline is:

1. `20260930000100_custom_practice_configuration.sql`
2. `20260930000200_practice_function_privileges.sql`
3. `20261018000100_stabilize_permission_boundaries.sql`
4. `20261018000200_governance_write_boundary.sql`
5. `20261021000100_generation_output_reliability.sql`
6. `20261021000200_output_sources_and_conflict_responses.sql`
7. `20261021000300_validate_output_manifest_totals.sql`
8. `20261021000400_preserve_import_response_deltas.sql`

If the target is still at M5, M6-M8 migrations must also be reconciled first. Never
mark migrations applied merely to suppress errors or overwrite manual definitions.
Fresh local success is not hosted compatibility. Revoke platform API privileges
only for the intended application objects/creators; compare extension ownership and
Supabase-managed defaults separately. Preserve existing staging tables and optional
`import_staging_generation_queue()`; establish its owner, restricted access,
retention period, source provenance and eventual migration plan before cleanup.

## Proposed Rollout: Separate Approval Required

1. Confirm the environment/ref and exact candidate SHA. Disable automatic rollout
   integrations or prove the review trigger is non-deploying; run all four hosted
   CI jobs on that exact SHA and inspect aggregate status, job logs, skipped checks
   and synthetic-only artifacts. Do not merge simply because one job is green.
2. Confirm a usable backup, not just a configured backup setting: record snapshot
   time, retention, coverage of Auth and application tables/receipts/metadata,
   restore permissions, and an isolated restore rehearsal with validation. Confirm
   retained provider output/error files and their access separately; DB backups do
   not include those files. Stop if recoverability cannot be demonstrated.
3. Separately authorize historical aggregate inspection with
   `phase-3-history-checks.sql`. It reads record-level operational metadata, so it
   must not be run under catalog-only approval. Out-of-range offsets, missing file
   refs/receipts and mismatched counts require operator reconciliation; no totals
   should be invented and no terminal job automatically reopened.
4. With explicit scheduling approval, disable the relevant Make import schedule,
   record the scenario and last run, stop manual invocations, and wait for active
   executions/Edge requests to finish. Verify no old importer is still writing.
   Do not pause generation/import production scheduling as part of this task.
5. Apply the reviewed pending ordered history, security repairs before reliability
   repairs, using the confirmed release configuration. Inspect a dry run first.
   No executable target command is provided until the project and migration history
   are verified. Future operator commands are `supabase db push --dry-run` followed
   by the separately approved `supabase db push` in that confirmed release checkout.
   Do not run them in this local candidate or use `--include-all` as a shortcut.
6. Deploy `import-deca-batch` and `_shared/deca-pipeline.ts` together after the new
   RPCs exist: future command `supabase functions deploy import-deca-batch
--project-ref <verified-ref>`. Preserve the configured JWT gateway policy and
   `x-batch-secret` contract; do not add/remove gateway flags speculatively. Starter,
   Make body, SQL builder/insert signatures and partition contracts stay intact.
7. Build and release the frontend after backend compatibility checks, using the
   established Azure staging slot/static-site workflow and its approved production
   promotion. No hosting configuration exists in this repository, so an exact Azure
   deployment command cannot safely be inferred. Required browser variables are
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_ENV`. Pipeline secrets are
   `OPENAI_API_KEY`, `SUPABASE_URL`, `SERVICE_ROLE_KEY` (or supported
   `SUPABASE_SERVICE_ROLE_KEY` fallback), `BATCH_SECRET`; never expose them via Vite.
8. Verify effective anon/authenticated/service grants, own/cross-user profile
   boundaries, no protected role/tier writes, audit attribution, owner vote RPC-only
   writes, subscription-gated explanations, service-only import RPCs, ledger RLS,
   immutable receipts and source hashes. Use approved synthetic accounts only.
9. Smoke-test direct login, `/admin` and deep query/fragment return, ordinary-user
   denial, logout/account switch, profile save/reload and unchanged recovery/OAuth
   callbacks. Real provider email/OAuth smoke tests need separate approval.
10. Separately authorize one small pipeline run and retry. Compare available
    durable receipts, candidate insertions, output-line failures, global nonblank
    cursor, source manifest, terminal status and HTTP per-invocation versus batch
    totals. Confirm no duplicate insertion or counter regression, then authorize
    resuming Make. Monitor partial/failed outcomes, 409s, 5xxs, latency and queue
    locks before increasing volume. Stop on permission regression, unexpected
    sources, drift, data loss, unknown history or failed reconciliation.

## Recovery and Outstanding Decisions

On failure, keep imports paused and prevent mixed writers. Preserve ledger,
receipt, candidate and source evidence; do not drop the new schema or resume an
old direct-checkpoint writer against an enrolled job. Prefer a reviewed forward
fix. Restore only after an explicit recovery decision using the rehearsed backup;
account for work committed after the snapshot. Frontend rollback is allowed only
to a backend-compatible build. Historical reconciliation and staging deletion
remain separately authorized operations, not rollback steps.

Outstanding gates: hosted CI, current catalog compatibility, exact pending history,
backup/restore proof, staging ownership/retention, retained provider file lifetime,
manual function differences and uncertain historical receipts. The local release
does not certify unrelated product/audit gaps or whole-application readiness.
