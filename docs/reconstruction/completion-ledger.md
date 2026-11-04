# Local Reconstruction Ledger

November 4: Phase C remains partial. Staff candidate review and guarded
publication are implemented; general editing, manual/bulk authoring, tags
and blueprints remain open. See [Phase C checkpoint](phase-c-completion.md).

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

| Requirement / PRD                              | Audit   | Current implementation / next acceptance                                                                                                                                 | Phase         | Status                             |
| ---------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ---------------------------------- |
| Trusted grants/profile/governance; 45-48       | F01-F03 | 512 current DB assertions and 8 local hosted-default grant checks pass                                                                                                   | Baseline      | VERIFIED locally                   |
| Import resilience; generation pipeline         | F13-F14 | Offline fixtures and 16 actual importer DB persistence/concurrency cases pass                                                                                            | Baseline      | VERIFIED locally                   |
| Review navigation; 31.1,31.5,46.6              | F10     | Paired cursors, action/resource filters, previous/next and stale-response suppression; real browser traversed 101 reports and 101 audit records; filter-race unit passed | A             | VERIFIED locally                   |
| Retryable reports; 11,31                       | F11     | Form/key retained; real RPC commit followed by lost response safely retried to exactly one report                                                                        | A             | VERIFIED locally                   |
| Keyboard dialogs; 15                           | F12     | Native modal, Tab containment, Escape and trigger restoration passed Chromium; desktop/mobile screenshots visually inspected                                             | A             | VERIFIED locally                   |
| Test preview/update; 20.4,20.7,32.4            | F05     | All preview fields, Continue/new updated identity, strict shortage, original order unchanged                                                                             | B             | VERIFIED locally                   |
| Session options; 20.5-20.6,17.3                | F06     | Trusted launch settings; free 40 cap/defaults, paid exact source-prefix subset and 1-999 timer                                                                           | B             | VERIFIED locally                   |
| Timer visibility; 21.1-21.2                    | F07     | Persisted preference, final-five reveal, monotonic display and server deadline checks                                                                                    | B             | VERIFIED locally                   |
| Explicit uncertainty; 21.3,36.8-36.10          | F08     | UNKNOWN/ordinary/clear persistence, answered-but-incorrect semantics                                                                                                     | B             | VERIFIED locally                   |
| Auto-pause/recovery; 60.1-60.2                 | F09     | Exit recovery, dashboard prompt, genuine competing tab and stale-generation fencing, serialized submission                                                               | B             | VERIFIED locally                   |
| Results/history summaries; 22,24,28            | F15     | Snapshot topic/difficulty summaries and bounded history metadata, immutable results and explanation denial                                                               | B             | VERIFIED locally                   |
| Candidate/question tools; 6,13.2,37-38         | F16     | Monitoring is not review; implement validated edit/approve/reject/publish, one admin minimum and atomic audits                                                           | C             | PARTIAL                            |
| Manual/bulk imports, tags, blueprints; 6,37-38 | F16     | Bounded validation, row errors, AND tag combinations, exact allocation and audited server confirmation                                                                   | C             | PARTIAL                            |
| Owner interfaces; 48                           | F04     | Trusted removal foundation exists; interfaces/invites pending; creation unanimity and admin quorum read from actual PRD                                                  | D             | PARTIAL                            |
| Self-service account lifecycle; 29.4-29.6,50   | F17     | Lifecycle confirmed November 2; implementation and failure/recovery verification remain pending                                                                          | E             | PARTIAL                            |
| Teams/assignments; approved V1 amendment       | —       | Tables/invite foundation insufficient; complete membership, assignments, student submission and instructor results                                                       | F             | PARTIAL                            |
| Billing and trusted entitlements; 17-18,27     | —       | Provider adapters/local fixtures and usable billing interfaces; no live verification authorized                                                                          | F             | PARTIAL                            |
| Notifications/settings; 29,50,59.4             | —       | Local capture/adapters, preferences, truthful persistence and retry required                                                                                             | F             | PARTIAL                            |
| Analytics/search/exports; 23-28                | —       | Implement actual owned records, bounded queries, protected data and export controls                                                                                      | F             | PARTIAL                            |
| Quiz/infinite/hardcore/demo; 7,17.2,19,21      | —       | Implement server contracts and local fixtures; no inert demo controls                                                                                                    | F             | PARTIAL                            |
| Landing/README truthful claims                 | F18     | Remove stale foundation-only claims after validating actual workflows                                                                                                    | Documentation | PARTIAL                            |
| CI backend coverage                            | F19     | Candidate four-job config exists; local equivalents only; hosted runs forbidden                                                                                          | Baseline      | PARTIAL                            |
| Staging provenance/retention                   | F20     | Preserve verified catalog evidence, restrict known local entry points; unknown hosted definitions cannot be fabricated                                                   | Documentation | BLOCKED for hosted-only provenance |

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
