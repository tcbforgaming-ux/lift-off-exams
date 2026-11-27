# Stabilization Phase 1

## Baseline

Branch: `production-rebuild`. Starting HEAD:
`21ac4aa26882d691659cc04afde45139ad68f97b`.
All existing route, shell/theme, practice/session configuration, generated types,
September migrations, Supabase config, browser-test and October audit edits were
preserved. No applicable `AGENTS.md` was found in the repository or checked parents.
Authority remains the PRD and the October audit's human decision register.

No hosted/linked database command, deployment, push, provider request or real
account mutation was performed. The root environment/link metadata was not copied
or used for local fixtures. No existing local development stack was reset.

## Repairs

- F01: named `anon`/`authenticated` grants survive `REVOKE FROM PUBLIC`. Both named
  roles and PUBLIC are now explicitly revoked before approved browser RPC grants
  are restored. Extension functions are excluded. Trigger entry points are not RPCs.
- F02: table-wide and independent column UPDATE grants defeated profile field
  restrictions. Both are revoked. INSERT is trigger-only; only `display_name` and
  `phone` UPDATE remains, with own-row RLS for student, admin and owner alike.
- Additional governance bypass: direct owner vote/ballot writes could forge quorum.
  These writes are now RPC-only; owner read access, quorum, expiration, withdrawal,
  inactivity and suspension/restoration rules remain unchanged.
- F03: saves request and verify their returned row, wait for refresh, and catch
  update/refresh failures. Missing refreshed profiles reject. Input survives failure.
- F20: known optional `import_staging_generation_queue()` is service-only when
  present. Its unknown body/tables are neither fabricated nor deleted.

New forward migrations, in order:

1. `20261018000100_stabilize_permission_boundaries.sql`
2. `20261018000200_governance_write_boundary.sql`

No historical migration was edited. The initial unapplied draft failed because its
default-ACL inventory included platform extension owners. It was corrected before
successful application to include actual application creators, not platform owners.
Successfully applied versions were not edited.

### Function Boundaries

| Exact signature in `public`                                | Browser EXECUTE | Trusted path                                                      |
| ---------------------------------------------------------- | --------------- | ----------------------------------------------------------------- |
| `bootstrap_initial_owner(uuid,text)`                       | Denied          | Service; existing no-active-owner bootstrap precondition retained |
| `build_deca_batch_jsonl(integer)`                          | Denied          | Service generation worker                                         |
| `insert_generated_questions(text,jsonb)`                   | Denied          | Service legacy wrapper                                            |
| `insert_generated_questions(uuid,jsonb,text)`              | Denied          | Service importer; receipt/counter logic unchanged                 |
| `mark_inactive_owners(timestamptz)`                        | Denied          | Service maintenance                                               |
| `recalculate_generation_queue_needed(integer)`             | Denied          | Service maintenance                                               |
| `write_test_session_audit(text,uuid,text,text,text,jsonb)` | Denied          | Internal lifecycle wrapper; SECURITY INVOKER                      |
| `write_admin_audit(text,text,text,text,jsonb)`             | Denied          | Internal owner wrapper; SECURITY INVOKER                          |
| `import_staging_generation_queue()` if present             | Denied          | Service; actual body unverified                                   |

Six maintenance functions receive a guard before their first mutation. Their
implementations, signatures, defaults and contracts are preserved through catalog
definitions; an unexpected language/body aborts migration. The guard checks the
effective database request role, not a supplied actor/profile tier. Service role
does not require `auth.uid()`. Privileged operator SQL with no SET ROLE is allowed;
ordinary API users cannot use that path, even if EXECUTE is accidentally granted.
Maintenance search paths are `pg_catalog, public, extensions, pg_temp`.

Internal audit helpers use invoker rights: trusted SECURITY DEFINER wrappers supply
table-owner privileges while `auth.uid()` retains actual actor identity. Direct
browser calls cannot elevate themselves. Audit table and column mutations are
revoked, and trusted lifecycle metadata cannot be overridden by supplied metadata.
The existing subscription-based explanation entitlement helper is unchanged;
profile tier remains non-authoritative.

### Complete Permission Inventory

[local-permission-inventory.json](local-permission-inventory.json) records exact
signatures, owners, definer mode, bodies/search paths and effective PUBLIC, anon,
authenticated, service and object-owner rights for every application routine. It
also records all public table/column ACLs, RLS policies, role membership and defaults.
No user rows, keys, JWTs or connection settings are included.

| Function category                                                           | PUBLIC | anon     | authenticated                        | Service / operator                                     |
| --------------------------------------------------------------------------- | ------ | -------- | ------------------------------------ | ------------------------------------------------------ |
| Role helpers, exact Test ID preview                                         | Denied | Explicit | Explicit                             | Allowed                                                |
| Own sessions/results/reports/practice/team RPCs                             | Denied | Denied   | Explicit; ownership/member checks    | Existing actor checks apply                            |
| Repository/candidates/pipeline monitoring/report correction/legacy recovery | Denied | Denied   | Explicit; trusted staff checks       | Existing checks apply                                  |
| Role management/owner voting/withdrawal/suspension                          | Denied | Denied   | Explicit; trusted owner/state checks | Existing checks apply                                  |
| Maintenance/bootstrap/import                                                | Denied | Denied   | Denied                               | Service or privileged operator SQL                     |
| Internal audit/normalization helpers                                        | Denied | Denied   | Denied                               | Internal owner; service grant for non-trigger routines |
| Trigger entry points                                                        | Denied | Denied   | Denied                               | Trigger execution, not browser RPC                     |
| Optional staging importer                                                   | Denied | Denied   | Denied                               | Service                                                |

Student/admin/owner share database role `authenticated`, never `service_role`.
Clean local inventory: 44 public tables, all RLS enabled; 79 non-extension
application functions. None grants EXECUTE to PUBLIC. Only `current_user_role()`,
`is_admin()`, `is_owner()` and `get_test_id_preview(text)` allow anon. Browser CREATE
on public is false. Default function/table API grants are revoked globally and in
public for actual application creators plus the migration operator (local postgres).
Platform-managed `supabase_admin` defaults for extension/auth/storage/GraphQL objects
are not rewritten. Introducing another application creator requires reviewing its
defaults first; this is not a claim that every platform role's defaults were changed.

## Local Workflow

Required: Node 24, pnpm 11.9.0, Supabase CLI 2.110.0, Docker Linux engine
(29.6.2 tested here), Chromium through Playwright 1.62.x. Run from repository root.

```powershell
pnpm install --frozen-lockfile
pnpm test:backend
pnpm test:hosted-grants
pnpm test:backend:prepare
pnpm exec playwright install chromium
pnpm test:backend:e2e
pnpm test:pipeline
pnpm verify
git diff --check
pnpm test:backend:stop
```

The runner uses only `.tmp/stabilization-backend`, a root/project marker, project
`liftoff-stabilization-disposable`, API `http://127.0.0.1:58421`, DB port 58422,
shadow port 58429. It refuses initial adoption of existing unmarked containers or
volumes. Every DB mutation checks marker, no linked project-ref, exact API address
and loopback PostgreSQL target. Reset/up/diff/type commands explicitly use local
scope. No root `.env`, `.temp`, secret, seed, remote function or link metadata is
copied. Startup/status credentials stay in memory and are suppressed by the final
runner. Generated config/types/runtime files are ignored, not committed.

Docker originally denied named-pipe access in the restricted process. Authorized
host access succeeded; no installation, WSL modification or restart was needed.
The isolated config disables SMTP, Edge runtime, storage, analytics and Studio.
Synthetic users are locally confirmed without email. Browser launches block external
DNS/service workers; pipeline fixture VMs have no usable network/client constructor.

`test:backend` applies all migrations, tests pgTAP contracts, checks public drift
and generates types for comparison without overwriting source. Comparison ignores
line-ending/trailing whitespace only. `test:hosted-grants` first applies pre-repair
migrations, adds test-only named/global/schema-default grants, then applies repairs.
`test:backend:prepare` resets the disposable backend without repeating DB tests/builds
in the browser CI job. Stop retains disposable volumes for diagnosis.

The old PowerShell launcher delegates to this runner. Direct Playwright setup also
requires the exact disposable project and URL; `VITE_APP_ENV=local` is not accepted
as proof of a safe target.

## Tests and CI

New pgTAP checks use actual anon/authenticated/service roles and synthetic trusted
student/admin/owner profiles. They cover effective protected-column ACLs and actual
denied mutations, own/cross-user saves, all server-only overloads, audit forgery,
accidental EXECUTE grants, owner role-management attribution, nested suspension/
restoration, actual service batch/import calls, direct governance writes and future
object defaults. Existing role/governance/repository/generation/session/result/report
contracts remain in the full suite.

The hosted baseline creates a synthetic staging function with the verified signature,
SECURITY DEFINER and grant properties. Actual denied anon/authenticated calls and
allowed service execution test its repair. Its body only writes a local probe; this
is NOT validation of the real unknown staging function.

Six profile unit tests cover zero rows, wrong user, update error, thrown request,
refresh failure and success. They are distinct from backend Playwright persistence
checks for real auth, all three profile roles, zero-row failure, unauthorized API,
session/result/report isolation, trusted audits and free explanation denial.

CI has application, database-security, fixture-pipeline and backend-browser jobs.
All install frozen dependencies; no provider secrets or continue-on-error. Always-run
cleanup stops only disposable services. Failure artifacts are generated type
diagnostics, fixture JSON and synthetic browser traces/screenshots, never CLI
status/environment files. Browser artifacts contain disposable session data only;
the harness must never target a real backend. GitHub-hosted jobs were not dispatched.

## Results

Verification completed locally October 21, 2026. Commands were run from the
repository root. The runner expands to `supabase --workdir <marked-directory>`
for all CLI operations, never the root linked-project context.

| Command / check                                                         | Exit | Result                                                                   |
| ----------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------ |
| `git branch --show-current`, `git rev-parse HEAD`, `git status --short` | 0    | Correct branch/HEAD; dirty baseline preserved                            |
| Restricted `docker info`                                                | 1    | Host named-pipe permission denied                                        |
| Authorized host `docker info --format '{{.ServerVersion}}'`             | 0    | Linux engine 29.6.2; no restart needed                                   |
| `supabase --version`                                                    | 0    | 2.110.0                                                                  |
| `pnpm install --frozen-lockfile`                                        | 0    | Already up to date; no dependency/lockfile upgrade                       |
| `node scripts/verify-backend.mjs database`                              | 0    | Fresh local reset, all 21 migrations; 440 assertions across 13 SQL files |
| Internal `supabase db diff --local --schema public`                     | 0    | No schema changes; no drop statements                                    |
| Internal `supabase gen types typescript --local --schema public`        | 0    | Types match source after line-ending/trailing-whitespace normalization   |
| `node scripts/verify-backend.mjs hosted`                                | 0    | 440 existing/security assertions plus 8 hosted-default/staging checks    |
| `node scripts/verify-backend.mjs prepare`                               | 0    | Clean disposable backend restored                                        |
| `node scripts/verify-backend.mjs inventory`                             | 0    | Catalog-only permission evidence captured before browser fixtures        |
| `node scripts/verify-backend.mjs e2e`                                   | 1    | 10 passed, 1 existing dashboard redirect failure; no skipped tests       |
| `pnpm test:pipeline`                                                    | 1    | 10 passed, 2 known failures (F13/F14); no skipped/weakened cases         |
| `pnpm verify`                                                           | 0    | Types, lint, formatting, 61 unit tests, production build pass            |
| `git diff --check`                                                      | 0    | No whitespace errors                                                     |

Early draft migration, script-lint and formatting failures were corrected and
rerun. The initial browser run before the additional isolation case had 9 passing
checks and the same dashboard failure; the final run has 10 passes and that one
failure. All six newly added backend permission/profile/isolation cases pass.

The final fixture run includes all five sanitized JSONL samples and both actual
Edge handlers' unauthorized-request guards: 10 passing assertions and the same
two F13/F14 failures. No pipeline implementation file changed. Cleanup command
`node scripts/verify-backend.mjs stop` exited 0, stopping only the marked stack
and retaining its disposable volumes. The normal development stack was preserved.

The dashboard test authenticates an administrator after requesting `/admin`, but
lands on `/dashboard`. `src/app/RouteGate.tsx` redirects authenticated guest routes
to `/dashboard` regardless of saved destination, competing with the login form's
navigation. This pre-existing redirect behavior was exposed by real backend timing,
not weakened away in a test or changed outside this phase. The admin/report flows
remain accessible by explicit navigation, as the passing report integration proves.

F13: malformed output JSONL discards otherwise valid records. F14: a retry after
successful candidate commit and failed job checkpoint loses imported-count
accounting. Their fixture assertions remain failures. The pipeline-fixtures CI
job is therefore a merge blocker; the dashboard redirect also blocks the full
backend-browser job until separately repaired. No GitHub-hosted job was run here.

| Finding | Verified local state                                                                                     | Still open                                                                         |
| ------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| F01     | Named grants, direct API calls, service imports, internal/nested audits and accidental-grant checks pass | Hosted application not performed                                                   |
| F02     | Protected columns/governance direct writes denied; trusted role/vote contracts pass                      | Hosted application not performed                                                   |
| F03     | Student/admin/owner save/reload and real zero-row failure pass; six unit edge cases pass                 | Hosted application not performed                                                   |
| F19     | Frozen install and separated meaningful CI jobs implemented and locally exercised                        | Hosted CI unrun; fixture/browser jobs correctly remain red for documented failures |
| F20     | Absent-object clean path and faithful synthetic staging permission repair pass                           | Actual staging body/data/schema ownership and retention remain unverified          |
| F13/F14 | Reproduced, not repaired by authorization                                                                | Both defects remain merge blockers                                                 |

No local required database/security check remains host-blocked. External-provider,
real staging, hosted migration/default-ACL and hosted CI verification were not run
and are not implied by these results. No permanent question or historical session/
result data was deleted or migrated. The complete migration diff was reviewed for
data loss; only permission/policy boundaries and internal helpers changed. Runtime
directories, local credentials and synthetic browser artifacts remain ignored.

## Remaining Limits and Deployment

The hosted audit lists `question_duplicate_review` and eight tables:
`staging_generated_question_candidates_raw`, `staging_generation_queue`,
`staging_generation_queue_import`, `staging_generation_queue_raw`, `staging_questions`,
`staging_questions_import`, `staging_questions_raw`, `staging_questions_raw1`.
None was fabricated, dropped, truncated or copied. Ownership, retention, reproducible
migrations and whether staging belongs in a separate non-API schema remain open.
Their actual constraints/policies/importer body are not verified by local fixtures.
Local clean parity does not establish hosted schema parity.

Prepared, NOT executed: separately approved hosted release of the forward migrations
after schema/default-ACL/ownership review and backup. No db push, linked query,
function deployment or real bootstrap was run. The connected backend is NOT declared
repaired. F13/F14 parser/checkpoint-counter defects deliberately remain unchanged
and fail the fixture CI job. Other unrelated audit findings remain open; no complete
PRD compliance or production-readiness claim is made.
