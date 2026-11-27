# Phase D: Owner Governance

Status: verified locally. F04 is closed for the approved local workflows.

## Baseline

- Clean `codex/local-reconstruction` baseline: `f783c164f9c85f87852fbb6ed5c19c4790add7e0`, the committed Phase C saved-rule regeneration follow-up. Main Step 3 commit: `fef97956ff98bfa9b7ad8d3a4b28c4be2e160ec1`.
- PRD section 48, F04, Milestone 3 owner-removal rules, November 2 sole-owner rule, and November 4 policy confirmations.
- Isolated local Supabase only: `liftoff-verification-isolated`, API 58431. No interactive database, live provider, hosted CI or deployment.

## Rules and Audit

| Action                                       | Actor, target and live quorum                                                                                                                                                                                                                         | Audit                                                       |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Administrator grant, suspension, restoration | Eligible owners only; matching standard-user or administrator state; two eligible owners when available, otherwise one. Suspension ends only after approved restoration.                                                                              | Proposal, approval, withdrawal, execution                   |
| Owner invitation                             | Eligible owner proposes a recipient email; all eligible owners approve. Seven-day token, hashed at rest, single use, confirmed matching email, live quorum rechecked at acceptance. Eligible owner can revoke an unused token.                        | Proposal, approval, execution/issue, revocation, acceptance |
| Owner removal                                | Eligible owner proposes another owner's removal. Target cannot vote. All eligible non-target owners up to three; minimum one. Final qualifying vote executes atomically. Open ballots can be withdrawn; proposals expire in up to seven days.         | Proposal, ballot, withdrawal, removal                       |
| Governance suspension and restoration        | Target cannot act; unanimous eligible non-target owners approve. Suspension cannot remove the last eligible owner. Governance-suspended and unavailable owners cannot restore themselves.                                                             | Proposal, approval, execution                               |
| Self suspension and recovery                 | Eligible owner may suspend only if another eligible owner remains. Self- and inactivity-suspended owners may recover using a fresh password or provider sign-in. The database requires a recent signed Auth method; the browser is not the authority. | Self suspension, self restoration                           |
| Inactivity                                   | Trusted maintenance only; at least seven days of inactivity and preserve an eligible owner.                                                                                                                                                           | Inactivity suspension                                       |

Proposals require a reason; later actions inherit it. Self-service and
maintenance actions use fixed audit reasons. Governance changes and their audit
events share a database transaction. List reads are owner-only keyset pages
with 25 records and one lookahead.

A rejection closes a proposal only when the remaining eligible voters could
not reach its live approval threshold. A repeated identical ballot is not a
second approval or audit event. New proposals enqueue one notification per
owner; delivering these messages is separate from the queue.

## Changed Areas

- Owner governance, recipient acceptance, and owner-access routes and pages; role-aware navigation and safe login return paths.
- Forward migrations `20261104001000_owner_removal_live_quorum.sql`, `20261104001100_owner_role_proposals_and_invites.sql`, `20261104001200_owner_suspension_and_reauthentication.sql`, `20261104001300_guard_governance_retries.sql`, `20261104001400_governance_rejection_and_notices.sql`, and `20261104001500_allow_removal_of_self_suspended_owners.sql`.
- Generated public database types; `013_stabilization_permissions.sql`, `020_owner_workflow_contracts.sql`, and `owner-governance.spec.ts`.

## Limits

- Invitation delivery uses an issued link shared with the intended recipient; browser fixtures exercise that handoff. No live mail or Google OAuth was exercised.
- Inactivity maintenance is server-only. No scheduler was deployed by this local work.
- Proposal notifications are queued transactionally. No live delivery was enabled.
- No account deletion, ownership transfer for deletion, or billing work. Phase E was not started.

## Verification

The tested revision is the baseline above plus the Phase D files in this report.

- Database coverage spans one, two, and three eligible non-target approvals, the last-owner prohibition, target denial, expiry, withdrawal, stale eligibility and repeat execution; it also exercises invitation expiry, revocation, wrong recipient and replay, fresh-auth requirements, rejection and audit rollback.
- Browser coverage exercises administrator promotion using keyboard and mobile controls, administrator route denial, invitation issue and acceptance across login, replay denial in the same tab, and a real password-based owner suspension and restoration.

- `pnpm test:hosted-grants`: exit 0, 650 database assertions and 8 grant checks on the isolated stack, including the rejection and notification migration.
- `pnpm test:backend`: exit 0, 653 assertions with the final removal migration; public schema drift empty and generated types identical.
- `pnpm test:e2e`: exit 0, 32/32 Chromium tests on the final schema.
- `pnpm test:pipeline`: exit 0, 7 verifier tests and 26 pipeline fixtures; offline pipeline types passed.
- `pnpm test:pipeline:db`: exit 0, 16 importer persistence and concurrency cases.
- `pnpm verify`: exit 0, 81 unit tests, typecheck, lint, formatting and build.
- `git diff --check` and `git diff --cached --check`: exit 0.
- An earlier database run passed its assertions but stopped at expected generated-type differences; types were regenerated from the marked stack.
- An intermediate full browser run had 31 passes and 1 failure. Reopening the same invitation fragment in the same tab retained a stale success state. The invitation now reads the active router location and the replay assertion was retained.
