import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  authorizeBatchRequest,
  createPipelineClients,
  extractResponseText,
  jsonResponse,
  parseBatchOutputJsonl,
  parseGeneratedQuestions,
  type PipelineClients,
  type BatchOutputLine,
} from "../_shared/deca-pipeline.ts";

type ImportRequestBody = { batch_job_id?: string; chunk_size?: number };
type Job = {
  id: string;
  openai_batch_id: string;
  output_file_id: string | null;
  metadata: Record<string, unknown>;
};

async function rpc(
  clients: PipelineClients,
  name: string,
  args: Record<string, unknown>,
) {
  const { data, error } = await clients.supabase.rpc(name, args);
  // Validation errors can embed full question content. Do not persist or return
  // provider/SQL messages. Durable outcomes contain fixed codes only.
  if (error)
    throw new Error(
      name === "reconcile_generation_output"
        ? "Generation checkpoint failure; retry safely."
        : "Generation outcome persistence failure; retry safely.",
    );
  return Array.isArray(data) ? data[0] : data;
}

function questionsFor(line: BatchOutputLine) {
  if (line.parse_error) return { failure: line.parse_error, questions: null };
  if (!line.custom_id) return { failure: "missing_custom_id", questions: null };
  if (
    typeof line.custom_id !== "string" ||
    !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(line.custom_id)
  ) {
    return { failure: "invalid_custom_id", questions: null };
  }
  if (
    line.error != null ||
    (line.response?.status_code && line.response.status_code !== 200)
  )
    return { failure: "record_error", questions: null };
  const text = extractResponseText(line.response?.body);
  if (!text) return { failure: "missing_model_text", questions: null };
  try {
    return { failure: null, questions: parseGeneratedQuestions(text) };
  } catch {
    return { failure: "invalid_model_json", questions: null };
  }
}

async function outputText(response: Response, budget: number) {
  if (!response.ok || !response.body) throw new Error("Output file unavailable.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let output = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > budget) {
        await reader.cancel();
        throw new Error("Output exceeds bounded file limit.");
      }
      output += decoder.decode(value, { stream: true });
    }
    return { text: output + decoder.decode(), bytes: size };
  } finally {
    reader.releaseLock();
  }
}

async function importJob(clients: PipelineClients, job: Job, chunkSize: number) {
  let files = Array.isArray(job.metadata?.output_sources)
    ? job.metadata.output_sources.map((source: { file_id: string }) => source.file_id)
    : job.output_file_id
      ? [job.output_file_id]
      : [];
  if (job.metadata?.output_ledger_version !== 1) {
    const response = await clients.fetch(
      `https://api.openai.com/v1/batches/${job.openai_batch_id}`,
      {
        headers: { Authorization: `Bearer ${clients.env.openAiApiKey}` },
      },
    );
    if (!response.ok) throw new Error("Batch status unavailable.");
    const status = await response.json();
    if (status.status !== "completed") {
      const state = [
        "failed",
        "expired",
        "cancelled",
        "validating",
        "finalizing",
      ].includes(status.status)
        ? status.status
        : "in_progress";
      const { error } = await clients.supabase
        .from("deca_batch_jobs")
        .update({ status: state })
        .eq("id", job.id);
      if (error) throw new Error("Batch status persistence failed.");
      return { batch_job_id: job.id, status: state, processed_count: 0 };
    }
    files = [
      ...new Set(
        [status.output_file_id ?? job.output_file_id, status.error_file_id].filter(
          (id): id is string => typeof id === "string" && id.length > 0,
        ),
      ),
    ];
  }
  if (
    files.length < 1 ||
    files.length > 2 ||
    files.some((id) => typeof id !== "string" || id.length > 256)
  )
    throw new Error("Completed batch lacks bounded output sources.");
  const lines: BatchOutputLine[] = [];
  const sources: { file_id: string; record_count: number }[] = [];
  let budget = 32 * 1024 * 1024;
  for (const file of files) {
    const response = await clients.fetch(
      `https://api.openai.com/v1/files/${encodeURIComponent(file)}/content`,
      { headers: { Authorization: `Bearer ${clients.env.openAiApiKey}` } },
    );
    const output = await outputText(response, budget);
    budget -= output.bytes;
    const parsed = parseBatchOutputJsonl(output.text);
    sources.push({ file_id: file, record_count: parsed.length });
    for (const line of parsed) lines.push({ ...line, position: lines.length });
    if (lines.length > 10000) throw new Error("Output exceeds bounded record limit.");
  }
  const file = files[0];
  await rpc(clients, "register_generation_output_sources", {
    p_batch_job_id: job.id,
    p_sources: sources,
  });
  const manifest = {
    p_batch_job_id: job.id,
    p_output_file_id: file,
    p_record_count: lines.length,
  };
  // Reconcile before processing, even when no new lines remain. Never add
  // invocation deltas to stale job counters after an ambiguous prior commit.
  const before = await rpc(clients, "reconcile_generation_output", manifest);
  const chunk = lines.slice(before.import_offset, before.import_offset + chunkSize);
  const errors: string[] = [];
  const invocation = { imported_count: 0, failed_count: 0, skipped_count: 0 };
  for (const line of chunk) {
    const parsed = questionsFor(line);
    const hash = [
      ...new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(line.source_text),
        ),
      ),
    ]
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    const customId =
      typeof line.custom_id === "string" &&
      /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(line.custom_id)
        ? line.custom_id
        : null;
    const result = await rpc(clients, "commit_generation_output_line", {
      p_batch_job_id: job.id,
      p_output_file_id: file,
      p_position: line.position,
      p_source_line: line.source_line,
      p_content_hash: hash,
      p_custom_id: customId,
      p_questions: parsed.questions,
      p_failure_code: parsed.failure,
    });
    if (!result.replayed && result.failure_code === "duplicate_conflict") {
      invocation.failed_count += result.failed_count;
    } else if (result.replayed || result.receipt_replayed) {
      invocation.skipped_count += parsed.questions?.length ?? 0;
    } else {
      invocation.imported_count += result.imported_count;
      invocation.failed_count += result.failed_count;
      invocation.skipped_count += result.skipped_count;
    }
    if (result.failure_code && errors.length < 5)
      errors.push(`Source line ${line.source_line}: ${result.failure_code}`);
  }
  const after = await rpc(clients, "reconcile_generation_output", manifest);
  return {
    batch_job_id: job.id,
    openai_batch_id: job.openai_batch_id,
    ...after,
    ...invocation,
    batch_totals: {
      imported_count: after.imported_count,
      failed_count: after.failed_count,
      skipped_count: after.skipped_count,
    },
    processed_count: chunk.length,
    total_processed_count: after.processed_count,
    errors,
  };
}

export async function handleImportDecaBatch(
  request: Request,
  clients = createPipelineClients(),
) {
  const denied = authorizeBatchRequest(request, clients.env.batchSecret);
  if (denied) return denied;
  if (request.method !== "POST")
    return jsonResponse({ error: "Method not allowed" }, 405);
  let body: ImportRequestBody | null = null;
  try {
    if (request.headers.get("content-type")?.includes("application/json"))
      body = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }
  const value = Number(body?.chunk_size ?? 25);
  const chunkSize = Number.isFinite(value)
    ? Math.min(100, Math.max(1, Math.trunc(value)))
    : 25;
  let query = clients.supabase
    .from("deca_batch_jobs")
    .select("id,openai_batch_id,output_file_id,status,metadata")
    .not("openai_batch_id", "is", null)
    .in("status", ["validating", "in_progress", "finalizing", "completed"])
    .order("created_at", { ascending: true })
    .limit(3);
  if (body?.batch_job_id) query = query.eq("id", body.batch_job_id);
  const { data, error } = await query;
  if (error) throw new Error("Import job lookup failed.");
  const batches = [];
  for (const job of (data ?? []) as Job[])
    batches.push(await importJob(clients, job, chunkSize));
  return jsonResponse({
    message: batches.length
      ? "Import check completed."
      : "No importable batches found.",
    chunk_size: chunkSize,
    batches,
  });
}
serve((request) =>
  handleImportDecaBatch(request).catch(() =>
    jsonResponse(
      { error: "Import persistence or upstream read failed; retry safely." },
      500,
    ),
  ),
);
