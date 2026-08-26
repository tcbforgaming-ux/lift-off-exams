# Milestone 4: Question Repository

Milestone 4 adds the production question repository foundation for
administrators and owners. It does not implement test generation, test-taking,
analytics, subscriptions, or unrelated admin tooling.

## Repository Access

The browser uses trusted Supabase RPCs instead of direct full-table repository
queries:

- `public.search_question_repository(...)`
- `public.set_question_lifecycle_state(uuid, text, text)`
- `public.is_question_eligible_for_test_generation(uuid)`

Each RPC derives authorization from `public.profiles` through
`public.is_admin()`. Client-supplied roles, route visibility, user IDs, and audit
fields are ignored.

Standard users cannot access the administrative repository or lifecycle RPCs.
Missing or non-elevated role data is denied because `public.current_user_role()`
falls back to `student`.

## Pagination

The repository uses keyset pagination ordered by:

1. `questions.updated_at desc`
2. `questions.id desc`

The unique `id` tie-breaker keeps ordering deterministic when several rows have
the same timestamp. The approved maximum page size is 100 rows. The frontend
defaults to 25 rows and only requests the current page.

The RPC fetches `page_size + 1` rows internally and returns at most `page_size`
rows with a repeated `has_next_page` flag. It does not calculate an exact total
count because exact counts over an 80,000-question repository would add
avoidable work to routine browsing.

## Search

Search is server-side and remains paginated. The approved search fields are:

- Question text
- Explanation
- Performance indicator
- Tags
- Stable question id
- Question hash

Search input is trimmed, capped to 120 characters, and ignored until it has at
least two characters. SQL wildcard characters are escaped before `LIKE` matching.
The frontend debounces keyword changes by 450ms.

No specialized text-search index was added in this milestone. The first version
uses bounded staff queries and documented EXPLAIN review before introducing a
write-costly text index such as trigram or full-text search.

## Filters

Supported filters:

- Lifecycle state: `Active`, `Retired`, or all
- Category / partition key
- Performance indicator
- Difficulty
- Question type
- Topic tag

Combination semantics:

- Different filter groups compose with `AND`.
- Multiple values inside a group are intended to use `OR`.
- The current UI sends one value per group, but the RPC accepts arrays for the
  future multi-select UI.
- Tag filtering uses array overlap for repository search. This does not change
  the separate question-generation tag rules.

The RPC validates lifecycle, difficulty, and question-type filters. Empty
filters are ignored safely.

## Lifecycle

Questions support two application lifecycle states:

- `Active`
- `Retired`

The application has no permanent-delete operation for questions. Browser roles
also do not receive direct `UPDATE` privileges on `public.questions`, so
lifecycle changes must go through `public.set_question_lifecycle_state(...)`.

Lifecycle transitions:

- Require administrator or owner access.
- Require an authenticated actor.
- Require a reason of at least five characters.
- Lock the question row with `FOR UPDATE`.
- Update the question state.
- Insert `question_lifecycle_events`.
- Insert `admin_audit_logs`.
- Return the updated state.

Repeated requests to set a question to its current state are idempotent and do
not create duplicate lifecycle audit entries.

Retired questions remain visible to staff through the repository RPC. Public
table access is limited to active questions.

## Generation Compatibility

The existing Make Scheduler -> Edge Function -> SQL/RPC -> candidate import
pipeline is preserved.

Existing contracts retained:

- `generation_queue_v3`
- `deca_batch_jobs`
- `generated_question_candidates`
- `build_deca_batch_jsonl()`
- `insert_generated_questions()`
- `publish_generated_question()`

`publish_generated_question()` already inserts published questions with
`lifecycle_state = 'Active'`.

One schema mismatch remains documented: the Milestone 4 brief says question
types and difficulties are normalized to compact values (`S/D/F/A` and
`E/M/H`), while the current rebuild schema stores published question rows as
display labels (`Scenario`, `Definition`, `Easy`, `Medium`, `Hard`). The
repository RPC accepts compact filter input and maps it to the stored labels.
Fully normalizing stored values should be handled in a future dedicated
migration because it affects generation, candidates, tests, and UI display.

## Indexes

Added indexes:

- `questions_repository_order_idx`
  - `(lifecycle_state, updated_at desc, id desc)`
  - Supports default active/retired keyset pages.
- `questions_repository_pi_idx`
  - `(performance_indicator, updated_at desc, id desc)`
  - Supports PI-specific review.
- `questions_repository_type_difficulty_idx`
  - `(question_type, difficulty, updated_at desc, id desc)`
  - Supports common type and difficulty filters.

Retained indexes:

- `questions_partition_difficulty_idx`
- `questions_tags_gin_idx`
- `questions_question_hash_key`

No text-search index was added until representative query plans justify the
extra write and storage cost.

## Representative EXPLAIN Review

Run these locally against seeded data only:

```sql
explain (analyze, buffers)
select *
from public.search_question_repository(25, null, null, null, 'Active');

explain (analyze, buffers)
select *
from public.search_question_repository(25, null, null, null, 'Retired');

explain (analyze, buffers)
select *
from public.search_question_repository(25, null, null, 'contract', 'Active');

explain (analyze, buffers)
select *
from public.search_question_repository(25, null, null, null, 'Active', null, array['PI-001']);

explain (analyze, buffers)
select *
from public.search_question_repository(25, null, null, null, 'Active', null, null, array['E'], array['S']);

explain (analyze, buffers)
select *
from public.search_question_repository(25, null, null, null, 'Active', null, null, null, null, array['Marketing']);

explain (analyze, buffers)
select *
from public.search_question_repository(25, null, null, 'pricing', 'Active', array['Marketing'], null, array['E']);
```

Record planning time, execution time, index usage, rows removed by filters, row
estimate accuracy, and buffer reads. Sequential scans are acceptable on tiny
local datasets; investigate them only when representative data shows poor scale.

## Verification

Run from the project root:

```powershell
supabase db reset
supabase test db
supabase db diff --local --schema public
supabase gen types typescript --local --schema public > .\src\lib\supabase\database.types.ts
pnpm verify
```

No production or linked remote Supabase database should be reset for this
milestone.
