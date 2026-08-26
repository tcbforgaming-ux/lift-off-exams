# Milestone 5: Generation Pipeline Import

This milestone preserves the existing Make Scheduler -> Supabase Edge Function ->
OpenAI Batch -> Supabase importer pipeline, while making the database contract
more durable for production.

## Pipeline

1. Make Scheduler calls `start-deca-batch` with `x-batch-secret`.
2. `start-deca-batch` calls `build_deca_batch_jsonl(limit_count)`.
3. The SQL builder claims eligible `generation_queue_v3` rows and creates one
   `deca_batch_jobs` ledger row.
4. `start-deca-batch` uploads JSONL to OpenAI Files and starts an OpenAI Batch.
5. Make Scheduler calls `import-deca-batch` with `x-batch-secret`.
6. `import-deca-batch` checks OpenAI Batch status and imports completed output
   through `insert_generated_questions(uuid,jsonb,text)`.
7. Imported questions land in `generated_question_candidates` for staff review.

The importer does not publish questions directly.

## Database Contracts

- `generation_queue_v3.partition_key` remains text for compatibility.
- `generation_queue_v3.partition_keys` is JSONB queue metadata for merged
  partition prompts.
- `questions.partition_key` remains text for now.
- `generated_question_candidates.partition_keys` keeps the JSONB partition
  metadata received from the queue.
- `generated_question_candidates.import_identity` provides candidate-level
  idempotency.
- `generation_import_receipts` records queue import attempts and retry outcomes.
- `insert_generated_questions(text,jsonb)` remains as the legacy RPC wrapper.
- `insert_generated_questions(uuid,jsonb,text)` is the preferred importer RPC.

The compact generated labels `S/D/F/A` and `E/M/H` remain pipeline-internal and
are normalized before insertion into current candidate columns. Revisit these
labels when the entire question schema migrates.

## Edge Function Secrets

Set these in Supabase Edge Function secrets:

```text
OPENAI_API_KEY
BATCH_SECRET
SERVICE_ROLE_KEY
```

`SERVICE_ROLE_KEY` is used because Supabase blocks custom secrets beginning with
`SUPABASE_`. The shared helper also accepts `SUPABASE_SERVICE_ROLE_KEY` for local
compatibility, but deployed functions should use `SERVICE_ROLE_KEY`.

## Scheduler Calls

Start a batch:

```http
POST /functions/v1/start-deca-batch
x-batch-secret: <BATCH_SECRET>
content-type: application/json

{"limit_count":250}
```

The function name is hyphenated. Make should call
`https://<project-ref>.supabase.co/functions/v1/start-deca-batch`, not
`start_deca_batch`.

If no OpenAI batch is created, the start function returns a diagnostic `reason`:

- `active_batch_exists`: a prior batch is still active and blocks a new one.
- `no_eligible_generation_queue_rows`: no queued `generation_queue_v3` rows have
  any needed question counts.
- `no_rows_claimed`: eligible rows were visible before the builder ran, but the
  SQL builder did not claim any rows.

Import a completed or in-progress batch:

```http
POST /functions/v1/import-deca-batch
x-batch-secret: <BATCH_SECRET>
content-type: application/json

{"chunk_size":25}
```

Optional importer filters:

```json
{ "batch_job_id": "<deca_batch_jobs.id>", "chunk_size": 25 }
```

## Admin Visibility

The application exposes `/admin/generation` to administrators and owners. The
page uses `search_generation_pipeline(...)`, a staff-only RPC, to view queue
status, batch IDs, OpenAI file IDs, import offsets, counters, and errors.

## Fixtures

Sanitized JSONL examples live in
`supabase/functions/fixtures/deca-batch`. They are intended for parser/import
contract checks and troubleshooting, not as training data.

## Validation

Local validation should include:

```powershell
supabase db reset
supabase test db
supabase db diff --local --schema public
pnpm typecheck
pnpm lint
pnpm format
pnpm test
pnpm build
```

After local migrations are applied, refresh generated database types:

```powershell
supabase gen types typescript --local --schema public > src/lib/supabase/database.types.ts
```

## Deferred Risks

- The published `questions` table still stores a single text `partition_key`.
  JSONB partition merging is preserved in queue/candidate metadata until the full
  question schema migration.
- OpenAI Batch output can contain malformed records. The importer records valid
  queue-level failures when a UUID custom id is present; completely malformed
  rows remain summarized on the batch job.
- Make scenario exports were not available in the repository. Scheduler timing,
  retry policy, and alerting still need production Make-side verification.
