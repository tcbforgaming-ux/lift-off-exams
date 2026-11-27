# Reconstruction Decision Register Addendum

This addendum records the Quiz milestone decisions alongside the tracked PRD and
the previously referenced October 18 register. It does not replace earlier
approvals.

| Topic                    | Decision                                                                                                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Quiz launch              | PRD 7.1: untimed with a 20-question default, immediate results, and post-submit review. This implementation offers only the supported 20-question mixed practice setup.                                                              |
| Free Quiz allowance      | Unpaid Quiz uses the shared Test/Quiz/Hardcore allowance; it does not consume a generation or Test ID slot.                                                                                                                          |
| Activity analytics       | Default to owned completed Tests and Quizzes. The free view shows completed activities and the 30-day average. A trusted paid subscription unlocks mode and date detail; no staff-only override was approved for combined analytics. |
| Topic sample eligibility | Keep the existing fixed-blueprint Test rule. Quiz-only and combined histories show raw observations without rankings or recommendations until an eligibility rule is approved.                                                       |
| Exports                  | Continue Test-only PDF/CSV and the previously approved entitlement and weekly export policy. An analytics mode filter never changes export mode.                                                                                     |

## November 15: Weekly Activity

- Three successful Test generations (including updated regeneration) and
  seven new Test ID attempts (including first launch of a self-generated ID)
  are independent free allowances. Preview, resume, and retry do not charge.
- Reserve one of ten shared Test/Quiz/Hardcore slots on successful launch in
  the launch week. Monday 00:00 UTC starts a new window.
- Release only the shared slot on explicit abandonment or a terminal no-result
  expiry. Pauses and disconnects do not release it. A scored timer auto-submit
  retains the slot. Finishing after reset does not create another charge.

## November 15: Infinite Run Weak Area Focus

- Use owned graded Test, Quiz, Hardcore, Infinite Run, and Question Search
  evidence. Count the latest graded attempt once per question and once per
  distinct attached topic. A wrong answer and I Don't Know both count as
  incorrect; skips and unrecoverable legacy status do not count.
- A weak topic needs at least eight distinct answered questions and strictly
  less than 70% accuracy. All modes have equal weight. Rank lowest accuracy
  first, with deterministic topic-name ties. This does not change Test's
  fixed-blueprint recommendation rule.
- Freeze ranked topics at successful launch. Favor unseen focused questions
  before seen focused questions, then prefer the weaker topic in each tier;
  avoid immediately repeating the current question when possible.
- With insufficient data, show that state and leave Standard as an explicit
  option. A running focus session uses visible Standard fallback if the
  active focused pool empties, then returns to focus on replenishment.

## November 15: V1 DECA Blueprint Catalog

- Use the 15 exams and exact counts in the original PRD §19.3, not an
  externally revised allocation. Record source spellings and zero counts
  separately from normalized names and selectable strata.
- Custom practice matches any selected topic across strata, while each
  question must meet all requirements of its assigned stratum. For example,
  Promotion-only, Pricing-only, and dual-tag questions can qualify when both
  topics are selected, but a saved stratum requiring both still requires both.
- Keep the approved strict scarcity rule: do not substitute other categories,
  relax filters, shorten presets, or charge quota when generation fails.
  Generate Updated Test uses the original saved rules against the current bank.

## November 27: Remaining Admin Work

- Valid opens correction work (in_review + valid), Work In Progress is
  in_review + work_in_progress, Fixed is resolved + fixed, and Invalid
  and Spam are rejected + invalid/spam. Admins and Owners supply a reason
  and public message; notify only the reporter.
- Queue priority is the question's current open/in-review report count,
  separate from quality-rate flags. Default threshold three; editable by staff.
- Near-match discovery compares with repository questions only. Pending
  candidates retain exact-duplicate checks and repository publication rechecks.
- Retiring a tag hides it from new authoring/custom choices, not from
  question associations, saved blueprint rules, membership, or historical
  results. Restoration re-enables selection without retagging questions.
