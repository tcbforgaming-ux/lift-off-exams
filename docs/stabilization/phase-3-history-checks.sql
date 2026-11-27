-- PREPARED ONLY. NOT covered by catalog-only inspection. Requires separate
-- authorization to inspect historical operational metadata. Aggregate output
-- only; no question text, raw output, user identifiers, tokens or mutation RPCs.
-- Run only after verifying that these table/column contracts exist.
begin read only;
set local statement_timeout = '15s';
select count(*) filter (where import_offset<0) as negative_offsets,
  count(*) filter (where metadata->>'output_ledger_version'='1'
    and import_offset>(metadata->>'output_record_count')::integer) as offsets_beyond_manifest,
  count(*) filter (where status='completed' and output_file_id is null
    and not (metadata ? 'output_sources')) as missing_source_references
from public.deca_batch_jobs;
-- Manifest counts must be separately validated before casting manually altered
-- legacy metadata; a cast error is a stop condition, not permission to repair it.
select count(*) as ledger_receipt_contribution_mismatches
from public.deca_batch_jobs j
where j.metadata->>'output_ledger_version'='1' and j.imported_count<>(
  select coalesce(sum(r.imported_count),0) from public.generation_import_receipts r
  where r.batch_job_id=j.id or r.import_identity like j.id::text || ':%');
select count(*) as imported_outcomes_without_receipts
from public.generation_output_lines l left join public.generation_import_receipts r on r.id=l.receipt_id
where l.outcome in ('Imported','Partial') and r.id is null;
select count(*) as receipt_batch_identity_mismatches
from public.generation_import_receipts r
where r.batch_job_id is not null and r.import_identity not like r.batch_job_id::text || ':%';
-- A file reference does not prove the file still exists at its provider.
-- No provider fetch is authorized by running this SQL.
rollback;
