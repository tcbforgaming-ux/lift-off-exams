# Local Reconstruction Ledger

November 4: Phase C is verified locally and F16 is closed. Step 3 adds staff tag
and blueprint workflows, including joint inventory validation across overlapping
strata. Updated tests use saved blueprint rules against current inventory even
after blueprint retirement.
See [Step 1 evidence](phase-c-step-1-completion.md),
[Step 2 evidence](phase-c-step-2-completion.md) and
[Step 3 evidence](phase-c-step-3-completion.md).

November 4: [Phase D](phase-d-completion.md) adds audited owner governance,
recipient-bound invitations, live quorum checks, rejection and owner access
recovery.

November 4: [Phase E](phase-e-completion.md) adds verified self-service deletion,
recovery-only access, deadline and warning handling, and retry-safe local
finalization.

November 4: [local audit closeout](local-audit-closeout.md) reconciles F18–F20
and carries forward Phase A–E evidence. [Phase F](phase-f-completion.md) adds
owned analytics and customer question search. Version 1 remains incomplete.

Base: `2c19dfe893465330d3aacdd81cd99feb0ff0a04e`.
Branch: `codex/local-reconstruction`; independent worktree `.tmp/local-reconstruction`.
No hosted access, deployment, provider calls or normal-development DB mutation authorized.

Authority: tracked `work/prd/prd_text.txt`, October 18 decision register, later explicit decisions.
November 2 decision: leaving a timed test automatically pauses it. Implement durable
server recovery; unload alone is not a persistence guarantee.

Status is conservative: source changes alone are not VERIFIED workflows.
November 3 evidence and exact commands: `phase-b-completion.md`. Phase A's earlier
two session-suite failures are resolved, not waived. Later-phase foundation rows
do not imply completed product workflows.

| Requirement / PRD                            | Audit   | Current implementation / next acceptance                                                                                                                                 | Phase         | Status                             |
| -------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ---------------------------------- |
| Trusted grants/profile/governance; 45-48     | F01-F03 | 512 current DB assertions and 8 local hosted-default grant checks pass                                                                                                   | Baseline      | VERIFIED locally                   |
| Import resilience; generation pipeline       | F13-F14 | Offline fixtures and 16 actual importer DB persistence/concurrency cases pass                                                                                            | Baseline      | VERIFIED locally                   |
| Review navigation; 31.1,31.5,46.6            | F10     | Paired cursors, action/resource filters, previous/next and stale-response suppression; real browser traversed 101 reports and 101 audit records; filter-race unit passed | A             | VERIFIED locally                   |
| Retryable reports; 11,31                     | F11     | Form/key retained; real RPC commit followed by lost response safely retried to exactly one report                                                                        | A             | VERIFIED locally                   |
| Keyboard dialogs; 15                         | F12     | Native modal, Tab containment, Escape and trigger restoration passed Chromium; desktop/mobile screenshots visually inspected                                             | A             | VERIFIED locally                   |
| Test preview/update; 20.4,20.7,32.4          | F05     | All preview fields, Continue/new updated identity, strict shortage, original order unchanged                                                                             | B             | VERIFIED locally                   |
| Session options; 20.5-20.6,17.3              | F06     | Trusted launch settings; free 40 cap/defaults, paid exact source-prefix subset and 1-999 timer                                                                           | B             | VERIFIED locally                   |
| Timer visibility; 21.1-21.2                  | F07     | Persisted preference, final-five reveal, monotonic display and server deadline checks                                                                                    | B             | VERIFIED locally                   |
| Explicit uncertainty; 21.3,36.8-36.10        | F08     | UNKNOWN/ordinary/clear persistence, answered-but-incorrect semantics                                                                                                     | B             | VERIFIED locally                   |
| Auto-pause/recovery; 60.1-60.2               | F09     | Exit recovery, dashboard prompt, genuine competing tab and stale-generation fencing, serialized submission                                                               | B             | VERIFIED locally                   |
| Results/history summaries; 22,24,28          | F15     | Snapshot topic/difficulty summaries and bounded history metadata, immutable results and explanation denial                                                               | B             | VERIFIED locally                   |
| Candidate/question tools; 6,13.2,37-38       | F16     | Candidate workflow and repository editing verified; concurrent publish, rollback, eligibility, history and browser coverage                                              | C Step 1      | VERIFIED locally                   |
| Manual/JSON authoring; 6.1-6.2               | F16     | Staff-only pending candidates, read-only preview, exact duplicate detection, durable retry and transactional audit                                                       | C Step 2      | VERIFIED locally                   |
| Tag/blueprint management; 5-6,19.3,49        | F16     | Audited metadata, drafts, activation, joint inventory and historical Test ID integrity; retired blueprint regeneration uses original rules against current inventory     | C Step 3      | VERIFIED locally                   |
| Owner interfaces; 48                         | F04     | Owner role proposals, invitations, removal, suspension, recovery and audit verified locally; notification delivery and maintenance scheduling not deployed               | D             | VERIFIED locally                   |
| Self-service account lifecycle; 29.4-29.6,50 | F17     | Recent Auth, recoverable deletion, warning gating, ownership checks, anonymization and finalization verified locally; live providers not enabled                         | E             | VERIFIED locally                   |
| Teams/assignments; approved V1 amendment     | —       | Tables/invite foundation insufficient; complete membership, assignments, student submission and instructor results                                                       | F             | PARTIAL                            |
| Billing and trusted entitlements; 17-18,27   | —       | Provider adapters/local fixtures and usable billing interfaces; no live verification authorized                                                                          | F             | PARTIAL                            |
| Notifications/settings; 29,50,59.4           | —       | Local capture/adapters, preferences, truthful persistence and retry required                                                                                             | F             | PARTIAL                            |
| Analytics/search/exports; 23-28,38,40,53     | —       | Owned analytics and latest-status question search implemented; lifetime answer flags and export controls remain open                                                     | F             | PARTIAL                            |
| Quiz/infinite/hardcore/demo; 7,17.2,19,21    | —       | [Hardcore workflow implemented; verification tracked separately](phase-f-hardcore-completion.md). Infinite and Demo are outside that checkpoint.                         | F             | PARTIAL                            |
| Landing/README truthful claims               | F18     | Corrected and checked on the running local app; Demo is not advertised as usable                                                                                         | Documentation | VERIFIED locally                   |
| CI backend coverage                          | F19     | Four jobs checked in; underlying commands verified locally; GitHub execution not authorized or verified                                                                  | Baseline      | LOCAL ONLY                         |
| Staging provenance/retention                 | F20     | Preserve verified catalog evidence, restrict known local entry points; unknown hosted definitions cannot be fabricated                                                   | Documentation | BLOCKED for hosted-only provenance |

## Historical Verification Record

This historical paragraph is superseded by `phase-a-completion.md` for the
November 2 reconciliation task. Current execution: 490 database assertions pass,
public drift and generated types identical, 81 unit tests and application checks
pass. Full browser suite: 18 pass, 2 unrelated session-presence flows fail.
Phase A scoped repeat and exact changed-file attribution are recorded there.
No later phase is claimed complete by the earlier Phase A verification labels.

Frozen install exited 0. Phase A repeat: all 18 real-auth Chromium flows passed,
including 101-record pagination, actual commit/response-loss retry, keyboard and
mobile framing. Original failed focus-boundary/restore checks were fixed, not
weakened. Latest `pnpm verify` exited 0: 79 unit tests, types, lint, formatting and
production build passed. `pnpm test:pipeline` exited 0: 7 verifier guards plus 26
pipeline fixtures. No new migration has been applied yet. Full DB/RLS/default-grant
and importer-DB suites remain required after backend increments. These are a
dirty-worktree checkpoint, not a final whole-V1 verification claim.

## Confirmed Decisions

- Resolved November 2: a sole eligible owner may approve administrator creation/suspension; normal two-owner approval applies when available.
- Resolved November 2: three-month recoverable deactivation, one-week final warning, anonymized retained audit history and last-owner transfer prerequisite.
- Resolved November 3: shorter Test ID attempts use the first N questions in saved source order.

## November 3 Verification

Phase B final full browser repeat: 24/24 pass, including Phase A regressions.
Database reset/migrations: 512 assertions pass; schema drift and generated types
identical. Local hosted-default simulation: 512 plus 8 checks pass. Offline
pipeline and 16 actual importer DB cases pass. Application verification: 81 unit
tests, types, lint, formatting and build pass. Diff check passes. See
`phase-b-completion.md` for intermediate failures, local auth-startup risk,
recovery tolerances and exact commands. No Phase C-F work was performed.

## November 4 Phase F Checkpoints

Starting branch: `codex/local-reconstruction`, baseline
`75c55a12c5090c86a675836dc24fdb309ee8280a`. The untracked focused audit was
preserved. Only the marked isolated backend was used.

| Task                | Checkpoint                                                                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Owned answer status | [Completion and evidence](phase-f-answer-status-completion.md); commit `4b462e682c816fe176776774411293bf909e59d5`. Legacy search outcomes without durable evidence remain unverified. |
| Test Mode analytics | [Completion and evidence](phase-f-test-analytics-completion.md). Mixed, shortened and non-blueprint histories remain raw-only until expected exposure rules are approved.             |

No exports, additional activity modes, teams, billing or quota enforcement
were implemented in these checkpoints.

## Phase F Test Mode Exports

[Completion and evidence](phase-f-exports-completion.md) for Test result,
analytics, and completed performance history in PDF and CSV. The later
approved unpaid limit is three exports per Monday UTC week, with no protected
explanations; paid exports include owned snapshot explanations. The test quota
and other activity modes remain separate.

## Phase F Quiz and Combined Analytics

[Quiz completion report](phase-f-quiz-completion.md) and
[decision register addendum](decision-register.md). The playable paid Quiz
and Test/Quiz analytics overview are separate checkpoints. Unpaid Quiz launch
still needs an approved allowance policy. Test-only exports and Generate
recommendations remain on their existing contracts.
