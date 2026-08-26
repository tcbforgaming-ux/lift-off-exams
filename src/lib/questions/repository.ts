import { getSupabaseBrowserClient } from "../supabase/browserClient";

export const QUESTION_REPOSITORY_MAX_PAGE_SIZE = 100;
export const QUESTION_REPOSITORY_DEFAULT_PAGE_SIZE = 25;
export const QUESTION_REPOSITORY_SEARCH_DELAY_MS = 450;

export type QuestionLifecycleState = "Active" | "Retired";

export type QuestionRepositoryFilters = {
  search: string;
  lifecycleState: QuestionLifecycleState | "All";
  partitionKey: string;
  performanceIndicator: string;
  difficulty: string;
  questionType: string;
  tag: string;
  pageSize: number;
  cursorUpdatedAt: string | null;
  cursorId: string | null;
};

export type QuestionRepositoryRow = {
  question_id: string;
  partition_key: string;
  performance_indicator: string | null;
  question_type: string;
  question_text: string;
  difficulty: string;
  tags: string[];
  lifecycle_state: QuestionLifecycleState;
  created_at: string;
  updated_at: string;
  question_hash: string | null;
  has_next_page: boolean;
};

export type QuestionLifecycleResult = {
  question_id: string;
  lifecycle_state: QuestionLifecycleState;
  updated_at: string;
};

type RpcError = {
  message: string;
};

type RepositoryRpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: RpcError | null }>;
};

const emptyFilters: QuestionRepositoryFilters = {
  search: "",
  lifecycleState: "Active",
  partitionKey: "",
  performanceIndicator: "",
  difficulty: "",
  questionType: "",
  tag: "",
  pageSize: QUESTION_REPOSITORY_DEFAULT_PAGE_SIZE,
  cursorUpdatedAt: null,
  cursorId: null,
};

function boundedPageSize(value: string | number | null | undefined) {
  if (value == null || String(value).trim() === "") {
    return QUESTION_REPOSITORY_DEFAULT_PAGE_SIZE;
  }

  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return QUESTION_REPOSITORY_DEFAULT_PAGE_SIZE;

  return Math.min(Math.max(Math.trunc(numeric), 1), QUESTION_REPOSITORY_MAX_PAGE_SIZE);
}

function cleanTextParam(value: string | null) {
  return value?.trim() ?? "";
}

function scalarToArray(value: string) {
  const cleanValue = value.trim();
  return cleanValue ? [cleanValue] : null;
}

export function parseQuestionRepositoryFilters(
  params: URLSearchParams,
): QuestionRepositoryFilters {
  const status = params.get("status");

  return {
    search: cleanTextParam(params.get("q")),
    lifecycleState:
      status === "Retired" || status === "All" || status === "Active"
        ? status
        : emptyFilters.lifecycleState,
    partitionKey: cleanTextParam(params.get("partition")),
    performanceIndicator: cleanTextParam(params.get("pi")),
    difficulty: cleanTextParam(params.get("difficulty")),
    questionType: cleanTextParam(params.get("type")),
    tag: cleanTextParam(params.get("tag")),
    pageSize: boundedPageSize(params.get("pageSize")),
    cursorUpdatedAt: params.get("cursorUpdatedAt"),
    cursorId: params.get("cursorId"),
  };
}

export function writeQuestionRepositoryFilters(
  params: URLSearchParams,
  filters: Partial<QuestionRepositoryFilters>,
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
  if ("lifecycleState" in filters) {
    if (filters.lifecycleState && filters.lifecycleState !== "Active") {
      nextParams.set("status", filters.lifecycleState);
    } else {
      nextParams.delete("status");
    }
  }
  if ("partitionKey" in filters) setOrDelete("partition", filters.partitionKey);
  if ("performanceIndicator" in filters) {
    setOrDelete("pi", filters.performanceIndicator);
  }
  if ("difficulty" in filters) setOrDelete("difficulty", filters.difficulty);
  if ("questionType" in filters) setOrDelete("type", filters.questionType);
  if ("tag" in filters) setOrDelete("tag", filters.tag);
  if ("pageSize" in filters) {
    const pageSize = boundedPageSize(filters.pageSize);
    if (pageSize === QUESTION_REPOSITORY_DEFAULT_PAGE_SIZE) {
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

function getRepositoryClient(): RepositoryRpcClient {
  return getSupabaseBrowserClient() as unknown as RepositoryRpcClient;
}

export async function fetchQuestionRepositoryPage(filters: QuestionRepositoryFilters) {
  const lifecycleState =
    filters.lifecycleState === "All" ? null : filters.lifecycleState;

  const { data, error } = await getRepositoryClient().rpc(
    "search_question_repository",
    {
      p_page_size: filters.pageSize,
      p_cursor_updated_at: filters.cursorUpdatedAt,
      p_cursor_id: filters.cursorId,
      p_search: filters.search,
      p_lifecycle_state: lifecycleState,
      p_partition_keys: scalarToArray(filters.partitionKey),
      p_performance_indicators: scalarToArray(filters.performanceIndicator),
      p_difficulties: scalarToArray(filters.difficulty),
      p_question_types: scalarToArray(filters.questionType),
      p_tags: scalarToArray(filters.tag),
      p_created_from: null,
      p_created_to: null,
    },
  );

  if (error) throw new Error(error.message);

  return (Array.isArray(data) ? data : []) as QuestionRepositoryRow[];
}

export async function setQuestionLifecycleState(
  questionId: string,
  newState: QuestionLifecycleState,
  reason: string,
) {
  const { data, error } = await getRepositoryClient().rpc(
    "set_question_lifecycle_state",
    {
      p_question_id: questionId,
      p_new_state: newState,
      p_reason: reason,
    },
  );

  if (error) throw new Error(error.message);

  return (Array.isArray(data) ? data.at(0) : data) as QuestionLifecycleResult | null;
}
