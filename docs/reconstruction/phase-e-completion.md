# Phase E: Self-Service Account Deletion and Recovery

Status: verified locally. F17 is closed for the approved local workflows.

## Baseline and Decisions

- Branch `codex/local-reconstruction`, clean Phase D commit `4703819b250ff349571f05f85d5d514af76b0d26`.
- PRD 29.4–29.6 and 50.3–50.5, decision register A04, the November 2 lifecycle decision and November 4 confirmations govern this phase.
- A verified, recently authenticated account holder explicitly types `DELETE`. Recovery uses the same account and also requires recent authentication.
- The three-calendar-month baseline is calculated in UTC, with PostgreSQL month-end clamping. The warning is due 168 hours before that date. The actual cutoff is the later of the baseline and 168 hours after successful delivery. Until delivery the account remains recoverable.
- Pending accounts may sign in, see status, recover, and sign out. The REST pre-request hook blocks app data and RPCs even with an older JWT. Billing portal and team-mail Edge Functions consult the trusted lifecycle check. Auth sign-in and recovery remain available.
- Last eligible owners cannot start deletion until another owner actually holds eligible ownership. A proposal or unaccepted invitation does not qualify. Phase D and this lifecycle use the same governance lock.

## States and Checkpoints

| State                           | Transition or evidence                                                                                                                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pending                         | One open row per account, idempotent repeat, status and audit written in the request transaction. Owner eligibility is suspended without changing the stored role.                                               |
| Warning due                     | The fixture adapter captures one warning against the confirmed account. Failed and sent delivery states reflect the adapter's result. A failed warning never closes recovery.                                    |
| Cancelled                       | Recent Auth, row and account locks, and a trusted cutoff check. No future warning or worker action; access is restored without granting roles.                                                                   |
| Finalizing                      | Due only after a delivered warning and the full recovery period. Owner, Storage and billing prerequisites are checked before irreversible work. Claim and cancellation cannot both win.                          |
| Billing captured / checkpointed | A stable fixture receipt identifies the subscription cancellation. A retry after a missing acknowledgement reuses that receipt. A missing active provider reference blocks finalization.                         |
| Completed                       | Result cleanup, reports, audit anonymization, the Auth identity delete, and the anonymous completion receipt commit in one transaction. Failure rolls them back together. A retry returns the committed outcome. |

The worker is service-only and fails closed for non-fixture identities. A
retryable failure is recorded without marking the job complete. No secrets,
provider responses, or account identifiers are printed by the worker.

## Record Policy

- Auth identity, sessions/refresh tokens, profile, personal settings, notifications, billing mirror, and dependent private activity are removed. The stale-token REST guard rejects the missing identity after deletion.
- Result items, immutable results and sessions are deleted in foreign-key order. Personal history and topic stats cascade. Shared Test IDs and their question membership remain with creator and request attribution removed.
- Personal reports are deleted. Other users' duplicate reports return to review when their source report is removed. Staff question version links are detached.
- Administrative audit event kinds and timestamps remain. Related actor identifiers, email, payloads, free-text reasons, resource links, and correlation IDs are cleared. Related rows are located through recorded IDs, email, phone and linked records. This is not a general-purpose free-text discovery or backup-erasure tool.
- Shared authored content remains; private staff-import and tag attribution is removed. Staff edit reasons tied to the deleted account are neutralized. Outstanding invitations to the deleted address cannot be redeemed.

## Local Operation

Start the marked isolated stack with `pnpm test:backend:prepare`. Run one bounded
worker pass with `pnpm account-erasure:local`. It takes credentials from the
marked local stack, checks API port 58431 and the unlinked marker, and processes
up to 25 due jobs. Running it again is safe. Tests advance synthetic timestamps
through PostgreSQL fixtures; do not backdate real accounts.

The legacy owner-executed Edge Function now returns HTTP 410. The worker uses
local database-backed capture adapters, not live Stripe, email, or SMS. No
hosted scheduler or production adapter was deployed. A live rollout must wire
verified enabled-channel delivery and billing adapters before enabling a worker.

## Changes

- Forward migrations `20261104001600_self_service_account_lifecycle.sql`,
  `20261104001700_account_erasure_worker.sql`,
  `20261104001800_remove_retained_staff_attribution.sql`, and
  `20261104001900_require_billable_account_reference.sql`.
- Account Deletion page, Profile entry, Auth routing and safe redirect handling,
  three Edge Function boundaries, generated Supabase types and the local worker.
- `021_account_erasure_contracts.sql`, `account-erasure.spec.ts`, and the profile
  test harness updated to use its router without changing its assertions.

## Verification

The tested revision is the Phase D baseline above plus the Phase E files listed
here. Tests use only the marked `liftoff-verification-isolated` stack and
synthetic accounts. The interactive stack was not accessed.

| Acceptance                                | Local evidence                                                                                                                                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Request, recovery, and access restriction | Browser keyboard/mobile flow, a new login while pending, and denied direct Data API access from a second client with an existing JWT. SQL checks recent authentication, idempotency, cross-user isolation and recovery. |
| Warning, cutoff, and ownership            | SQL tests late warning extension, one delivery after failure, last-owner denial, recovery without a role grant, and blocked finalization after successor eligibility changes.                                           |
| Checkpoints and race safety               | Local worker/browser test races recovery and two service calls at cutoff, then finishes concurrently and checks an old JWT is denied. SQL simulates missing billing acknowledgement and failure after Auth deletion.    |
| Record treatment                          | SQL asserts result and report removal, duplicate dependency repair, scrubbed audit payload, and preserved shared Test ID without creator attribution.                                                                   |

- `pnpm test:hosted-grants`: exit 0; 690 database assertions and 8 grant checks in the local hosted-default simulation.
- `pnpm test:backend`: exit 0; 690 assertions on the final migrations, no public schema drift and identical generated types.
- `pnpm test:e2e`: exit 0; 34/34 Chromium tests on the final schema.
- `pnpm account-erasure:local`: exit 0; no due jobs remained after the browser suite. The browser worker test exercised an actual synthetic warning and finalization.
- `pnpm test:pipeline`: exit 0; 7 verifier checks and 26 pipeline fixtures, plus offline pipeline type contracts.
- `pnpm test:pipeline:db`: exit 0; 16 importer cases against the local database.
- `pnpm verify`: exit 0; 81 unit tests, typecheck, lint, formatting and build.
- `git diff --check` and `git diff --cached --check`: exit 0.
- An initial database run passed assertions and drift but reported new generated types; types were refreshed using the marked artifact. A first unit run failed six profile tests because the new settings link needed router context; the harness was corrected without removing assertions and the full suite passed.

Live mail/SMS, Stripe, Google reauthentication, hosted CI, scheduling,
and production data were not exercised. The synthetic adapter is not a
production delivery or billing integration.
