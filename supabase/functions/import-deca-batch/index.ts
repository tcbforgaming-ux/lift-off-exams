import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

import {
  authorizeBatchRequest,
  boundedError,
  createPipelineClients,
  extractResponseText,
  jsonResponse,
  parseBatchOutputJsonl,
  parseGeneratedQuestions,
  type BatchOutputRecord,
  type PipelineClients,
} from "../_shared/deca-pipeline.ts";

type ImportRequestBody = {
  batch_job_id?: string;
  chunk_size?: number;
};

type DecaBatchJob = {
  id: string;
  openai_batch_id: string | null;
  output_file_id: string | null;
  status: string;
  import_offset: number;
  imported_count: number;
  failed_count: number;
};

type OpenAiBatchStatus = {
  id?: string;
  status?: string;
  output_file_id?: string | null;
  error_file_id?: string | null;
  errors?: unknown;
};

type ImportSummary = {
  batch_job_id: string;
  openai_batch_id: string | null;
  status: string;
  imported_count: number;
  failed_count: number;
  skipped_count: number;
  processed_count: number;
  remaining_count: number;
  errors: string[];
};

function getChunkSize(requestBody: ImportRequestBody | null) {
  const candidate = Number(requestBody?.chunk_size ?? 25);
  if (!Number.isFinite(candidate)) return 25;
  return Math.min(Math.max(Math.trunc(candidate), 1), 100);
}

async function parseBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return null;
  }

  return (await request.json()) as ImportRequestBody;
}

function mapOpenAiStatus(status: string | undefined) {
  if (status === "completed") return "completed";
  if (status === "failed" || status === "expired" || status === "cancelled") {
    return "failed";
  }
  if (status === "validating") return "validating";
  if (status === "finalizing") return "finalizing";
  return "in_progress";
}

function isUuid(value: string | undefined): value is string {
  return Boolean(
    value?.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    ),
  );
}

async function recordImportFailure(
  clients: PipelineClients,
  job: DecaBatchJob,
  record: BatchOutputRecord | null,
  importIdentity: string,
  message: string,
) {
  if (!isUuid(record?.custom_id)) return;

  await clients.supabase.from("generation_import_receipts").upsert(
    {
      batch_job_id: job.id,
      queue_id: record?.custom_id,
      import_identity: importIdentity,
      source_custom_id: record?.custom_id ?? "unknown",
      imported_count: 0,
      failed_count: 1,
      skipped_count: 0,
      status: "Failed",
      error_summary: message,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "import_identity" },
  );
}

async function fetchOpenAiBatchStatus(clients: PipelineClients, openAiBatchId: string) {
  const response = await clients.fetch(
    `https://api.openai.com/v1/batches/${openAiBatchId}`,
    {
      headers: {
        Authorization: `Bearer ${clients.env.openAiApiKey}`,
      },
    },
  );
  const body = (await response.json()) as OpenAiBatchStatus;

  if (!response.ok) {
    throw new Error(boundedError(body));
  }

  return body;
}

async function fetchOutputFile(clients: PipelineClients, outputFileId: string) {
  const response = await clients.fetch(
    `https://api.openai.com/v1/files/${outputFileId}/content`,
    {
      headers: {
        Authorization: `Bearer ${clients.env.openAiApiKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.text();
}

async function getImportJobs(
  clients: PipelineClients,
  requestBody: ImportRequestBody | null,
) {
  let query = clients.supabase
    .from("deca_batch_jobs")
    .select(
      "id, openai_batch_id, output_file_id, status, import_offset, imported_count, failed_count",
    )
    .not("openai_batch_id", "is", null)
    .in("status", ["validating", "in_progress", "finalizing", "completed"])
    .order("created_at", { ascending: true })
    .limit(3);

  if (requestBody?.batch_job_id) {
    query = query.eq("id", requestBody.batch_job_id);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as DecaBatchJob[];
}

async function updateJobStatus(
  clients: PipelineClients,
  jobId: string,
  values: Record<string, unknown>,
) {
  const { error } = await clients.supabase
    .from("deca_batch_jobs")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  if (error) throw new Error(error.message);
}

async function importRecord(
  clients: PipelineClients,
  job: DecaBatchJob,
  record: BatchOutputRecord,
) {
  if (!record.custom_id) {
    throw new Error("Batch output record is missing custom_id.");
  }

  if (record.error) {
    throw new Error(boundedError(record.error));
  }

  const responseText = extractResponseText(record.response?.body);
  if (!responseText) {
    throw new Error("Batch output record is missing model response text.");
  }

  const questions = parseGeneratedQuestions(responseText);
  const importIdentity = `${job.id}:${record.custom_id}`;
  const { data, error } = await clients.supabase.rpc("insert_generated_questions", {
    p_queue_id: record.custom_id,
    p_questions: questions,
    p_import_identity: importIdentity,
  });

  if (error) {
    throw new Error(error.message);
  }

  const result = Array.isArray(data) ? data[0] : data;
  return {
    importIdentity,
    importedCount: Number(result?.imported_count ?? 0),
    failedCount: Number(result?.failed_count ?? 0),
    skippedCount: Number(result?.skipped_count ?? 0),
  };
}

async function importJob(
  clients: PipelineClients,
  job: DecaBatchJob,
  chunkSize: number,
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    batch_job_id: job.id,
    openai_batch_id: job.openai_batch_id,
    status: job.status,
    imported_count: 0,
    failed_count: 0,
    skipped_count: 0,
    processed_count: 0,
    remaining_count: 0,
    errors: [],
  };

  if (!job.openai_batch_id) {
    summary.status = "failed";
    summary.errors.push("Batch job is missing openai_batch_id.");
    await updateJobStatus(clients, job.id, {
      status: "failed",
      error: "Batch job is missing openai_batch_id.",
    });
    return summary;
  }

  const openAiStatus = await fetchOpenAiBatchStatus(clients, job.openai_batch_id);
  const mappedStatus = mapOpenAiStatus(openAiStatus.status);

  if (mappedStatus !== "completed") {
    summary.status = mappedStatus;
    await updateJobStatus(clients, job.id, {
      status: mappedStatus,
      output_file_id: openAiStatus.output_file_id ?? job.output_file_id,
      error: openAiStatus.errors ? boundedError(openAiStatus.errors, 5000) : null,
    });
    return summary;
  }

  const outputFileId = openAiStatus.output_file_id ?? job.output_file_id;
  if (!outputFileId) {
    summary.status = "failed";
    summary.errors.push("Completed OpenAI batch is missing output_file_id.");
    await updateJobStatus(clients, job.id, {
      status: "failed",
      error: "Completed OpenAI batch is missing output_file_id.",
    });
    return summary;
  }

  const output = await fetchOutputFile(clients, outputFileId);
  const records = parseBatchOutputJsonl(output);
  const start = Math.max(job.import_offset, 0);
  const chunk = records.slice(start, start + chunkSize);

  for (let index = 0; index < chunk.length; index += 1) {
    const record = chunk[index];
    const importIdentity = `${job.id}:${record.custom_id ?? `offset-${start + index}`}`;

    try {
      const result = await importRecord(clients, job, record);
      summary.imported_count += result.importedCount;
      summary.failed_count += result.failedCount;
      summary.skipped_count += result.skippedCount;
    } catch (error) {
      const message = boundedError(error);
      summary.failed_count += 1;
      summary.errors.push(message);
      await recordImportFailure(clients, job, record, importIdentity, message);
    }

    summary.processed_count += 1;
  }

  const nextOffset = start + summary.processed_count;
  summary.remaining_count = Math.max(records.length - nextOffset, 0);
  summary.status = summary.remaining_count === 0 ? "imported" : "completed";

  await updateJobStatus(clients, job.id, {
    status: summary.status,
    output_file_id: outputFileId,
    import_offset: nextOffset,
    imported_count: job.imported_count + summary.imported_count,
    failed_count: job.failed_count + summary.failed_count,
    error: summary.errors.length > 0 ? summary.errors.slice(0, 5).join("\n") : null,
    completed_at:
      summary.remaining_count === 0 ? new Date().toISOString() : undefined,
  });

  return summary;
}

export async function handleImportDecaBatch(
  request: Request,
  clients = createPipelineClients(),
) {
  const authError = authorizeBatchRequest(request, clients.env.batchSecret);
  if (authError) return authError;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let requestBody: ImportRequestBody | null = null;
  try {
    requestBody = await parseBody(request);
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  const chunkSize = getChunkSize(requestBody);
  const jobs = await getImportJobs(clients, requestBody);

  if (jobs.length === 0) {
    return jsonResponse({ message: "No importable batches found.", batches: [] });
  }

  const batches = [];
  for (const job of jobs) {
    batches.push(await importJob(clients, job, chunkSize));
  }

  return jsonResponse({
    message: "Import check completed.",
    chunk_size: chunkSize,
    batches,
  });
}

serve((request) => handleImportDecaBatch(request));
