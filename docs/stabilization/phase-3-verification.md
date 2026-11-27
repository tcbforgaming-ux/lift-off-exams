# Phase 3 Clean-Checkout Verification

Date: November 2, 2026; America/New_York. Review branch:
`codex/stabilization-phase3-2026-11-02`.

The candidate was committed in an independent clone before runtime verification.
The first source-complete passing run used commit `fdf9018` (the structured
schema-diff guard correction). This evidence/migration-manifest packaging commit
changes documentation only. The commands are repeated after that commit; the
exact final candidate SHA and final command outcomes are reported in the completion
message and can be checked with `git rev-parse HEAD` in the review clone.
No test required an untracked application file, root `.env.local`, linked-project
configuration or hosted secret. Candidate Git status was clean during verification.

## Observed Results

| Command                                             | Exit | Result                                                                                                                                    |
| --------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                    | 0    | 284 locked packages installed; no lockfile or dependency edits                                                                            |
| `pnpm test:pipeline`                                | 0    | 7 verification-guard regressions, offline Edge type check, 26 actual-handler fixture checks passed                                        |
| `pnpm test:backend`                                 | 0    | 25 migrations reconstructed; 464 assertions in 14 SQL files passed; public diff empty and generated types identical under enforced checks |
| `pnpm test:hosted-grants`                           | 0    | Local simulation: 464 database assertions plus 8 named/default-grant checks passed                                                        |
| `pnpm test:pipeline:db`                             | 0    | 16 actual-importer local-DB scenarios passed; fault helpers removed in finally cleanup                                                    |
| `pnpm test:backend:prepare`                         | 0    | Marked synthetic backend reset for browser verification                                                                                   |
| `pnpm exec playwright install chromium`             | 0    | Locked browser runtime available                                                                                                          |
| `pnpm test:backend:e2e`                             | 0    | 16 real-auth Chromium tests passed, none skipped                                                                                          |
| `pnpm verify`                                       | 0    | Types, lint, formatting, 72 unit tests in 20 files and production build passed                                                            |
| `git diff --check` and base-to-candidate diff check | 0    | No whitespace errors                                                                                                                      |
| Prepared catalog/history SQL syntax checks          | 0    | Read-only transactions succeeded on synthetic local data only; output discarded                                                           |

The three duplicate `pnpm test` lines and repeated backend command in the supplied
request are treated as verification intent, not distinct suites. `pnpm verify`
includes the actual unit suite; the explicit database, hosted-default simulation,
pipeline and browser commands cover the distinct required checks.

## Verification Corrections and Caveats

The first Phase 3 database run passed 464 assertions but then failed the new drift
guard because the CLI emitted a JSON result wrapper with an empty SQL diff. That
was a verifier compatibility defect, not schema drift. The guard now parses the
structured response, requires a string SQL field, and fails on malformed responses
or non-comment SQL. Its fix was committed before the passing repeat. The original
generated-types check that only logged differences now also fails on differences.
Nothing was skipped or marked continue-on-error.

No earlier migration was edited. The starter, builder signatures, queue partitions,
generation targets and original insert overloads are unchanged. The original
application lockfile is unchanged. The candidate includes no root credentials or
runtime files. Pattern scans found no actual secret/OpenAI/private key or complete
JWT; two inherited prototype `eyJhbGci...` placeholders were examined and are not
credentials. Pipeline JSON artifacts contain synthetic test names/results only.
No GitHub artifacts were uploaded; any future browser traces must remain limited
to the isolated synthetic accounts. Pattern scans are not proof that every possible
credential format has been detected.

The existing marked disposable DB volume was reused only after comparing the old
marker/config, confirming no running test containers, and checking both Docker
project labels against `liftoff-stabilization-disposable`. A new ignored marker
identified the independent checkout root; no root config/data/secret file was
copied. The database was rebuilt entirely from committed migrations. Fresh CI
hosts create their own marker automatically. This reviewed reuse is not permission
for the runner to silently adopt unmarked volumes in normal operation.

Cleanup at handoff uses only `pnpm test:backend:stop`, preserving disposable volumes
and leaving the normal local stack and all hosted services alone. Its final exit
is recorded in the completion report.

## Hosted Evidence: Blocked, Not Passing

Confirmed repository: `tcbforgaming-ux/lift-off-exams`. Visible default-branch CI
has no deployment command; the prepared candidate keeps four jobs with explicit
read-only GitHub token permissions. Branch-protection read returned HTTP 403;
ruleset listing returned empty, which is not proof of absent protections/hooks.
The user confirmed automatic integrations exist and explicitly instructed keeping
the release local. Consequently there is no review-branch push, PR, Actions run
URL, job conclusion, aggregate green status or hosted artifact for this candidate.
No substitute branch or connector API was used to bypass that restriction.

No current approved read-only hosted database connection was available. Catalog
compatibility, actual pending migrations, manual function/default-ACL differences,
backups/restoration, staging retention and historical reconciliation remain gates
in [the release plan](phase-3.md). Prepared SQL checks were not run remotely.

## Preserved Work and Approval Boundary

The original worktree remains on `production-rebuild` at `21ac4aa`, with its index
and pre-existing dirty work preserved. Historical audit attachments and the normal
local Supabase config edits were excluded. Other previously approved practice,
theme and dashboard dependencies were explicitly included in the prerequisite
commit, not silently folded into a security-only claim. Per-path scope/checksums
are in `phase-3-inventory.json`; migration checksums are in
`phase-3-migrations.json`. The inventory omits its own recursive checksum and is
a preparation snapshot; subsequent commit diffs remain authoritative.

The release is prepared for review. Publishing a branch and running hosted CI need
new approval after deployment-integrations safety is established. Applying hosted
migrations, pausing/draining Make, deploying importer/shared code and frontend,
using real accounts/providers, historical reconciliation and resuming scheduling
remain separately approved actions. Nothing here approves a production rollout.
