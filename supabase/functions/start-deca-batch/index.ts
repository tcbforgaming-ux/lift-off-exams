import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

import {
  authorizeBatchRequest,
  boundedError,
  createPipelineClients,
  jsonResponse,
  validateJsonl,
  type PipelineClients,
} from "../_shared/deca-pipeline.ts";

type StartBatchRequestBody = {
  limit_count?: number;
};

type OpenAiFileResponse = {
  id?: string;
  error?: unknown;
};

type OpenAiBatchResponse = {
  id?: string;
  status?: string;
  error?: unknown;
};

type OpenAiErrorResponse = {
  error: unknown;
  status?: number;
  body?: string;
};

type PreflightState = {
  activeBatch:
    | {
        id: string;
        status: string;
        openai_batch_id: string | null;
        row_count: number;
        import_offset: number;
      }
    | null;
  queuedGenerationRows: number;
};

function getLimitCount(requestBody: StartBatchRequestBody | null) {
  const candidate = Number(requestBody?.limit_count ?? 250);
  if (!Number.isFinite(candidate)) return 250;
  return Math.min(Math.max(Math.trunc(candidate), 1), 500);
}

async function parseBody(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return null;
  }

  return (await request.json()) as StartBatchRequestBody;
}

async function getPreflightState(clients: PipelineClients): Promise<PreflightState> {
  const [activeBatchResult, queuedRowsResult] = await Promise.all([
    clients.supabase
      .from("deca_batch_jobs")
      .select("id, status, openai_batch_id, row_count, import_offset")
      .in("status", ["building", "built", "validating", "in_progress", "finalizing"])
      .order("created_at", { ascending: true })
      .limit(1),
    clients.supabase
      .from("generation_queue_v3")
      .select("id")
      .eq("status", "queued")
      .or(
        "scenario_needed.gt.0,definition_needed.gt.0,fill_needed.gt.0,all_except_needed.gt.0",
      )
      .limit(5),
  ]);

  if (activeBatchResult.error) {
    throw new Error(activeBatchResult.error.message);
  }

  if (queuedRowsResult.error) {
    throw new Error(queuedRowsResult.error.message);
  }

  return {
    activeBatch: activeBatchResult.data?.[0] ?? null,
    queuedGenerationRows: queuedRowsResult.data?.length ?? 0,
  };
}

async function markBatchFailed(
  clients: PipelineClients,
  batchJobId: string,
  error: unknown,
  extra: Record<string, unknown> = {},
) {
  await clients.supabase
    .from("deca_batch_jobs")
    .update({
      ...extra,
      status: "failed",
      error: boundedError(error, 5000),
      updated_at: new Date().toISOString(),
    })
    .eq("id", batchJobId);
}

async function readOpenAiJson<T>(response: Response): Promise<T | OpenAiErrorResponse> {
  const body = await response.text();
  try {
    return JSON.parse(body) as T;
  } catch {
    return {
      error: "OpenAI returned a non-JSON response.",
      status: response.status,
      body: body.slice(0, 1000),
    };
  }
}

export async function handleStartDecaBatch(
  request: Request,
  clients = createPipelineClients(),
) {
  const authError = authorizeBatchRequest(request, clients.env.batchSecret);
  if (authError) return authError;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let requestBody: StartBatchRequestBody | null = null;
  try {
    requestBody = await parseBody(request);
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  const limitCount = getLimitCount(requestBody);
  let preflight: PreflightState;
  try {
    preflight = await getPreflightState(clients);
  } catch (preflightError) {
    return jsonResponse({ error: boundedError(preflightError) }, 500);
  }

  const { data, error } = await clients.supabase.rpc("build_deca_batch_jsonl", {
    limit_count: limitCount,
  });

  if (error) {
    return jsonResponse({ error: error.message }, 500);
  }

  const batch = Array.isArray(data) ? data[0] : null;
  if (!batch || batch.row_count === 0 || !batch.jsonl) {
    if (preflight.activeBatch) {
      return jsonResponse({
        message: "A generation batch is already active.",
        reason: "active_batch_exists",
        row_count: 0,
        active_batch: preflight.activeBatch,
      });
    }

    return jsonResponse({
      message: "No queued rows need generation.",
      reason:
        preflight.queuedGenerationRows === 0
          ? "no_eligible_generation_queue_rows"
          : "no_rows_claimed",
      row_count: 0,
      queued_generation_rows_sampled: preflight.queuedGenerationRows,
    });
  }

  let jsonlSummary: ReturnType<typeof validateJsonl>;
  try {
    jsonlSummary = validateJsonl(batch.jsonl);
  } catch (jsonlError) {
    await markBatchFailed(clients, batch.batch_job_id, jsonlError);
    return jsonResponse({ error: boundedError(jsonlError) }, 500);
  }

  const fileForm = new FormData();
  fileForm.append("purpose", "batch");
  fileForm.append(
    "file",
    new Blob([batch.jsonl], { type: "application/jsonl" }),
    "deca_batch_input.jsonl",
  );

  let fileResponse: Response;
  try {
    fileResponse = await clients.fetch("https://api.openai.com/v1/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clients.env.openAiApiKey}`,
      },
      body: fileForm,
    });
  } catch (fileFetchError) {
    await markBatchFailed(clients, batch.batch_job_id, fileFetchError);
    return jsonResponse({ error: boundedError(fileFetchError) }, 500);
  }
  const fileJson = await readOpenAiJson<OpenAiFileResponse>(fileResponse);

  if (!fileResponse.ok || !("id" in fileJson) || !fileJson.id) {
    await markBatchFailed(clients, batch.batch_job_id, fileJson);
    return jsonResponse({ error: fileJson }, 500);
  }

  let batchResponse: Response;
  try {
    batchResponse = await clients.fetch("https://api.openai.com/v1/batches", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clients.env.openAiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input_file_id: fileJson.id,
        endpoint: "/v1/responses",
        completion_window: "24h",
      }),
    });
  } catch (batchFetchError) {
    await markBatchFailed(clients, batch.batch_job_id, batchFetchError, {
      input_file_id: fileJson.id,
    });
    return jsonResponse({ error: boundedError(batchFetchError) }, 500);
  }
  const batchJson = await readOpenAiJson<OpenAiBatchResponse>(batchResponse);

  if (!batchResponse.ok || !("id" in batchJson) || !batchJson.id) {
    await markBatchFailed(clients, batch.batch_job_id, batchJson, {
      input_file_id: fileJson.id,
    });
    return jsonResponse({ error: batchJson }, 500);
  }

  const status = batchJson.status ?? "validating";
  const { error: updateError } = await clients.supabase
    .from("deca_batch_jobs")
    .update({
      openai_batch_id: batchJson.id,
      input_file_id: fileJson.id,
      status,
      row_count: batch.row_count,
      metadata: {
        custom_ids: jsonlSummary.customIds,
        line_count: jsonlSummary.lineCount,
        limit_count: limitCount,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", batch.batch_job_id);

  if (updateError) {
    return jsonResponse({ error: updateError.message }, 500);
  }

  return jsonResponse({
    message: "Batch started.",
    row_count: batch.row_count,
    batch_job_id: batch.batch_job_id,
    openai_batch_id: batchJson.id,
    input_file_id: fileJson.id,
    status,
  });
}

serve((request) => handleStartDecaBatch(request));
