# Milestone 6: Test IDs and Deterministic Test Generation

## Scope

Milestone 6 creates permanent server-generated Test IDs from approved blueprint
versions. It persists the exact ordered question IDs but does not implement active
test sessions, answers, scoring, timers, or results.

The Make Scheduler, OpenAI Batch API, generation queue, and candidate importer are
unchanged.

## Identity And Access

- `test_ids.definition_id` is the internal UUID identity.
- `test_ids.id` is the 12-character uppercase alphanumeric share code shown as the
  Test ID. It is generated with PostgreSQL cryptographic random bytes.
- Anonymous callers may use `get_test_id_preview()` with an exact Test ID. The
  result contains bounded metadata only.
- An authenticated holder of an exact Test ID may use
  `get_generated_test_manifest()` to retrieve current question content in the
  persisted order. It does not return correct answers or explanations.
- Creators and eligible team assignment recipients may read their test-definition
  rows through RLS. Browser clients cannot insert Test IDs or membership rows.
- All authenticated application roles can generate tests. Blueprint management
  remains restricted to administrators and owners.

## Canonical Blueprint Contract

Only an `Active` row from `blueprint_versions` may be generated. The caller sends
the expected version, and the server rejects a stale version. `distribution` must
use schema version 1:

```json
{
  "schema_version": 1,
  "strata": [
    {
      "id": "finance-easy",
      "priority": 1,
      "count": 25,
      "partition_keys": ["Finance"],
      "performance_indicators": ["FI:001"],
      "question_types": ["Scenario"],
      "difficulties": ["Easy"],
      "tags": ["Financial Analysis"],
      "excluded_tags": ["Legacy"]
    }
  ]
}
```

Rules:

- Every stratum has a stable unique ID and an explicit integer count.
- Stratum counts must sum exactly to `total_questions`.
- The approved total and requested total must match and be between 1 and 250.
- Values within partition, PI, type, and difficulty fields use OR semantics.
- Every required tag uses AND semantics. Any excluded-tag match disqualifies a
  question.
- Compact type (`S`, `D`, `F`, `A`) and difficulty (`E`, `M`, `H`) values are
  canonicalized to repository display values.
- Unknown fields, unknown values, contradictory tags, duplicate stratum IDs, and
  malformed arrays are rejected.
- Strata allocate most-constrained-first, then by explicit priority and stable
  stratum ID. A question can be allocated only once.
- A shortage is strict. The server returns structured unsatisfied-stratum data and
  creates no partial Test ID.

## Determinism

Algorithm version: `sha256-strata-v1`

Eligibility version: `active-complete-v1`

The seed is exact UTF-8 text of at most 128 bytes. Leading zeroes and Unicode are
preserved. Leading or trailing whitespace is rejected rather than silently
normalized. An omitted seed is replaced by the generated Test ID.

Candidate rank is the lowercase hexadecimal SHA-256 digest of the UTF-8 bytes:

```text
algorithm-version US seed US stratum-id US question-uuid
```

Final order uses:

```text
algorithm-version US seed US final-order US question-uuid
```

`US` is ASCII unit separator byte `0x1f`. UUID ascending is the collision
tie-breaker. The canonical blueprint, seed, algorithm version, eligibility version,
pool timestamp, resolved distribution, and exact ordered question IDs are stored.
The request is transactional and idempotency keys are scoped to the authenticated
creator and request fingerprint. Same-user retries with the same key are serialized
with a transaction-scoped advisory lock before the durable record is read.

Question content is not copied into the Test ID. The membership row stores the
question hash and update timestamp at generation. Launch uses current content and
both preview and manifest report when content changed. Full historical question
snapshots are intentionally deferred.

Previous-two-test repetition avoidance is deferred because history-dependent
selection would violate this milestone's deterministic, history-independent
contract unless prior history becomes an explicit input.

## Migration And Compatibility

Migration: `20260826000100_deterministic_test_generation.sql`

Safety-hardening migration:
`20260826000200_test_id_safety_hardening.sql`

Existing 12-character Test ID foreign keys remain valid. Pre-migration Test IDs are
marked `Legacy`; they have no persisted membership and therefore cannot launch via
the new manifest RPC. A separate, explicit legacy backfill or retirement decision
is required before production deployment if remote legacy Test IDs must remain
launchable.

The hardening migration provides two audited staff-only workflows:

- `backfill_legacy_test_membership()` accepts an exact ordered UUID array. It
  rejects count mismatches, duplicate IDs, and missing repository questions. It
  never infers membership.
- `resolve_legacy_test_id()` retires an unrecoverable ID or maps it to a complete
  replacement. The legacy preview remains available but cannot launch.

Run the read-only inventory in
`scripts/migrations/audit_legacy_test_ids.sql` before deciding each legacy ID.

Example exact backfill:

```sql
select public.backfill_legacy_test_membership(
  'LEGACY000001',
  array[
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid
  ],
  'Recovered from the original ordered export'
);
```

Example replacement:

```sql
select public.resolve_legacy_test_id(
  'LEGACY000001',
  'Replaced',
  'NEWTESTID001',
  'Original ordered membership was unavailable'
);
```

Deploy the migration before the frontend. Do not deploy the UI against a database
that lacks the three Milestone 6 RPCs.

If the initial question-table revocation was already run manually, no reversal is
needed. The hardening migration repeats the revocation and then restores only the
authenticated privileges required by staff-only RLS. Anonymous access remains
revoked and standard users see no question rows.

Before a remote push:

1. Create a database backup and run the legacy inventory query.
2. Apply both Milestone 6 migrations through `supabase db push`; do not paste
   partial migration fragments into production.
3. Confirm `questions_select_active_public` no longer exists.
4. Confirm free and anonymous explanation calls fail in staging.
5. Complete one staged OpenAI batch import and verify its final status is
   `imported`.
6. Resolve every legacy ID as Backfilled, Replaced, or Retired before launch.

## Verification

```powershell
supabase db reset
supabase test db
supabase db diff --local --schema public
supabase gen types typescript --local --schema public > src/lib/supabase/database.types.ts
pnpm verify
```

Database contract coverage is in
`supabase/tests/database/008_deterministic_test_generation_contracts.sql`. It
includes canonicalization, a golden ordered-ID fixture, same/different seeds,
overlapping strata, strict shortages, 250-question generation, idempotency, role
access, RLS denials, public preview, authenticated launch, and update warnings.

The repeatable 80,000-row selection probe is
`scripts/performance/001_deterministic_selection.sql`. Run it only against
the local stack:

```powershell
Get-Content scripts/performance/001_deterministic_selection.sql |
  docker exec -i supabase_db_lift-off-exams-production-rebuild psql -U postgres -d postgres
```

On 2026-08-26, the local PostgreSQL 15 stack selected 250 rows from 80,000 eligible
rows in **53.247 ms execution time** using a three-worker parallel sequential scan
and top-N heapsort. This is a development-machine baseline, not a production SLO.
Hash ordering necessarily evaluates all eligible rows; watch this result as the
repository approaches and exceeds 80,000 questions.

## Safety Hardening

- Direct anonymous question reads are revoked. Authenticated table access is
  constrained by staff-only RLS, and customers receive question content only from
  bounded RPCs.
- `get_test_question_explanation()` requires either an active/trialing trusted
  Stripe subscription or an administrator/owner role. Client profile metadata is
  not accepted as proof of payment.
- Test IDs explicitly record `current_with_warning`: identity and order are
  reproducible, corrected content is current, and edits produce warnings. Exact old
  wording is intentionally not promised for Version 1.
- `deca_batch_jobs` now accepts the importer's real terminal `imported` status while
  retaining all prior states.
- The 80,000-row development baseline is 53.247 ms. Use 500 ms p95 as the initial
  staging SLO, test at least 20 concurrent generations, and investigate before
  launch if p95 exceeds the target or the query stops using bounded top-N sorting.

Remaining operational work cannot be completed from local code alone: remote legacy
IDs must be inventoried and resolved, a staging Make/OpenAI batch must complete, and
production query telemetry must be enabled after deployment.
