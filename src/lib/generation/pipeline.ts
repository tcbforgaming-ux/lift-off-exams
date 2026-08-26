import { getSupabaseBrowserClient } from "../supabase/browserClient";
import type { Json } from "../supabase/database.types";

export const GENERATION_PIPELINE_DEFAULT_PAGE_SIZE = 25;
export const GENERATION_PIPELINE_MAX_PAGE_SIZE = 100;
export const GENERATION_PIPELINE_SEARCH_DELAY_MS = 450;

export type GenerationPipelineFilters = {
  search: string;
  status: string;
  category: string;
  batchJobId: string;
  hasErrors: "all" | "yes" | "no";
  pageSize: number;
  cursorUpdatedAt: string | null;
  cursorId: string | null;
};

export type GenerationPipelineRow = {
  queue_id: string;
  indicator_code: string;
  performance_indicator: string | null;
  category: string;
  partition_key: string;
  partition_keys: Json;
  queue_status: string;
  scenario_needed: number;
  definition_needed: number;
  fill_needed: number;
  all_except_needed: number;
  priority: number;
  locked_by_batch_id: string | null;
  queue_last_error: string | null;
  queue_created_at: string;
  queue_updated_at: string;
  batch_status: string | null;
  openai_batch_id: string | null;
  input_file_id: string | null;
  output_file_id: string | null;
  row_count: number | null;
  imported_count: number | null;
  failed_count: number | null;
  import_offset: number | null;
  batch_error: string | null;
  has_next_page: boolean;
};

type RpcError = {
  message: string;
};

type PipelineRpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: RpcError | null }>;
};

const emptyFilters: GenerationPipelineFilters = {
  search: "",
  status: "",
  category: "",
  batchJobId: "",
  hasErrors: "all",
  pageSize: GENERATION_PIPELINE_DEFAULT_PAGE_SIZE,
  cursorUpdatedAt: null,
  cursorId: null,
};

function boundedPageSize(value: string | number | null | undefined) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return GENERATION_PIPELINE_DEFAULT_PAGE_SIZE;

  return Math.min(Math.max(Math.trunc(numeric), 1), GENERATION_PIPELINE_MAX_PAGE_SIZE);
}

function cleanTextParam(value: string | null) {
  return value?.trim() ?? "";
}

function getPipelineClient(): PipelineRpcClient {
  return getSupabaseBrowserClient() as unknown as PipelineRpcClient;
}

export function parseGenerationPipelineFilters(
  params: URLSearchParams,
): GenerationPipelineFilters {
  const hasErrors = params.get("hasErrors");

  return {
    search: cleanTextParam(params.get("q")),
    status: cleanTextParam(params.get("status")),
    category: cleanTextParam(params.get("category")),
    batchJobId: cleanTextParam(params.get("batch")),
    hasErrors:
      hasErrors === "yes" || hasErrors === "no" ? hasErrors : emptyFilters.hasErrors,
    pageSize: boundedPageSize(params.get("pageSize")),
    cursorUpdatedAt: params.get("cursorUpdatedAt"),
    cursorId: params.get("cursorId"),
  };
}

export function writeGenerationPipelineFilters(
  params: URLSearchParams,
  filters: Partial<GenerationPipelineFilters>,
) {
  const nextParams = new URLSearchParams(params);

  const setOrDelete = (key: string, value: string | number | null | undefined) => {
    const cleanValue = value == null ? "" : String(value).trim();
    if (cleanValue) {
      nextParams.set(key, cleanValue);
    } else {
      nextParams.delete(key);
    }
  };

  if ("search" in filters) setOrDelete("q", filters.search);
  if ("status" in filters) setOrDelete("status", filters.status);
  if ("category" in filters) setOrDelete("category", filters.category);
  if ("batchJobId" in filters) setOrDelete("batch", filters.batchJobId);
  if ("hasErrors" in filters) {
    if (filters.hasErrors && filters.hasErrors !== "all") {
      nextParams.set("hasErrors", filters.hasErrors);
    } else {
      nextParams.delete("hasErrors");
    }
  }
  if ("pageSize" in filters) {
    const pageSize = boundedPageSize(filters.pageSize);
    if (pageSize === GENERATION_PIPELINE_DEFAULT_PAGE_SIZE) {
      nextParams.delete("pageSize");
    } else {
      nextParams.set("pageSize", String(pageSize));
    }
  }
  if ("cursorUpdatedAt" in filters) {
    setOrDelete("cursorUpdatedAt", filters.cursorUpdatedAt);
  }
  if ("cursorId" in filters) setOrDelete("cursorId", filters.cursorId);

  return nextParams;
}

export async function fetchGenerationPipelinePage(filters: GenerationPipelineFilters) {
  const { data, error } = await getPipelineClient().rpc("search_generation_pipeline", {
    p_page_size: filters.pageSize,
    p_cursor_updated_at: filters.cursorUpdatedAt,
    p_cursor_id: filters.cursorId,
    p_status: filters.status || null,
    p_category: filters.category || null,
    p_search: filters.search || null,
    p_batch_job_id: filters.batchJobId || null,
    p_has_errors: filters.hasErrors === "all" ? null : filters.hasErrors === "yes",
  });

  if (error) throw new Error(error.message);

  return (Array.isArray(data) ? data : []) as GenerationPipelineRow[];
}
