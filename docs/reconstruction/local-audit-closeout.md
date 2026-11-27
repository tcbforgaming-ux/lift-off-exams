# Local Audit Closeout

Baseline: `codex/local-reconstruction` at
`3608a4e9faaeb0b2e1777e9708ba4500c7cb961b`. Sources: the October 18 audit and
decision register, tracked PRD, and Phase A–E reports. This is a local evidence
closeout, not a hosted release or full Version 1 sign-off.

| Finding | Local disposition and evidence                                                                                                                                                                                            | Remaining limit                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| F01–F03 | Local trusted-grant and ownership repairs, [Stabilization Phase 1](../stabilization/phase-1.md).                                                                                                                          | Hosted effective grants not rechecked.                                                                                        |
| F04     | Closed locally; [Phase D](phase-d-completion.md), commit `4703819b250ff349571f05f85d5d514af76b0d26`.                                                                                                                      | Live delivery and scheduler not exercised.                                                                                    |
| F05–F09 | Closed locally; [Phase B](phase-b-completion.md), verified Phase A/B commit `4cfffd664fa4b38b527aebf4e2f7014ff9e17cd2`. F05 also has saved-rule regeneration in `f783c164f9c85f87852fbb6ed5c19c4790add7e0`.               | The intermittent **Checking session** stall remains an observed reliability risk. A passing repeat is not a demonstrated fix. |
| F10–F12 | Closed locally; [Phase A](phase-a-completion.md), same verified Phase A/B commit.                                                                                                                                         | Browser evidence is Chromium.                                                                                                 |
| F13–F14 | Local importer persistence, ordering, receipt and retry repairs; [Stabilization Phase 2](../stabilization/phase-2.md).                                                                                                    | No live OpenAI batch or Make execution.                                                                                       |
| F15     | Closed locally; [Phase B](phase-b-completion.md), verified Phase A/B commit above.                                                                                                                                        | Scope is existing Test Mode history and results.                                                                              |
| F16     | User-confirmed local closure; [Phase C Step 3 and saved-rule follow-up](phase-c-step-3-completion.md).                                                                                                                    | No destructive tag management policy was approved.                                                                            |
| F17     | Closed locally; [Phase E](phase-e-completion.md), baseline commit above.                                                                                                                                                  | Live warning/cancellation adapters and scheduling not verified.                                                               |
| F18     | Landing copy and README describe implemented workflows and safe local setup. No inert Demo action.                                                                                                                        | Demo itself remains Phase F work.                                                                                             |
| F19     | `.github/workflows/ci.yml` declares frozen installs and four jobs: `verify`, `database-security`, `pipeline-fixtures`, `backend-browser`. See [Phase F verification](phase-f-completion.md) for actual local equivalents. | GitHub execution, runner parity, triggers and artifact upload were not exercised.                                             |
| F20     | Local absent-object and synthetic staging permission-repair paths covered by the hosted-default simulation.                                                                                                               | Real object provenance, owner, dependency and retention decisions are unverified.                                             |

## F20 Evidence Boundary

The checked-in audit reports nine extra hosted tables by metadata:
`question_duplicate_review`, `staging_generated_question_candidates_raw`,
`staging_generation_queue`, `staging_generation_queue_import`,
`staging_generation_queue_raw`, `staging_questions`, `staging_questions_import`,
`staging_questions_raw`, and `staging_questions_raw1`. Their names suggest
review/import staging; names do not establish the purpose, business owner,
storage contents, approved retention, or migration definition. Matching migration
identifiers does not establish schema parity.

The captured function inventory shows the zero-argument
`import_staging_generation_queue()` was SECURITY DEFINER with anonymous and
authenticated EXECUTE. The forward repair restricts the optional known signature
if present. The synthetic fixture proves the privilege transition, not the
hosted function body, table ownership, policy, or present deployment. Keep the
objects untouched pending separately authorized metadata review and an approved
retention plan.

## Landing and CI Evidence

The running Chromium app confirmed the current title, tagline, and working Test
ID entry link, and that there is no inert Demo action. The focused run was
`pnpm test:e2e tests/e2e/analytics.spec.ts tests/e2e/question-search.spec.ts`
(exit 0, 2 passed). README setup now points to the isolated runner rather than
an unqualified database reset. The CI failure-artifact paths point to that
runner's actual working directory. No hosted CI run was started.
