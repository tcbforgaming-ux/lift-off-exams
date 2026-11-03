import { getSupabaseBrowserClient } from "../supabase/browserClient";

export const reportCategories = [
  "incorrect_answer",
  "incorrect_explanation",
  "bad_options",
  "unclear_wording",
  "outdated_content",
  "other",
] as const;

export type ReportCategory = (typeof reportCategories)[number];
export type ReportStatus = "open" | "in_review" | "resolved" | "rejected" | "duplicate";

export const reportCategoryLabels: Record<ReportCategory, string> = {
  incorrect_answer: "Incorrect answer",
  incorrect_explanation: "Incorrect explanation",
  bad_options: "Problem with answer options",
  unclear_wording: "Unclear wording",
  outdated_content: "Outdated content",
  other: "Other",
};

export type OwnQuestionReport = {
  report_id: string;
  question_id: string;
  test_id: string;
  category: ReportCategory;
  report_status: ReportStatus;
  resolution_category: string | null;
  resolution_message: string | null;
  created_at: string;
  updated_at: string;
  has_next_page: boolean;
};

export type ReportQueueRow = {
  report_id: string;
  question_id: string;
  test_id: string;
  category: ReportCategory;
  report_status: ReportStatus;
  report_version: number;
  reporter_email: string | null;
  performance_indicator: string;
  question_type: string;
  difficulty: string;
  lifecycle_state: "Active" | "Retired";
  created_at: string;
  updated_at: string;
  has_next_page: boolean;
};

export type ReportDetail = Omit<ReportQueueRow, "has_next_page"> & {
  description: string;
  resolution_category: string | null;
  resolution_message: string | null;
  duplicate_of: string | null;
  encountered_snapshot: Record<string, unknown>;
  question_text: string;
  options: unknown;
  correct_option_id: string;
  explanation: string;
  partition_key: string;
  tags: string[];
  question_updated_at: string;
  correction_version_id: string | null;
  lifecycle_event_id: string | null;
};

export type AuditLogRow = {
  audit_id: string;
  actor_user_id: string;
  actor_email: string | null;
  actor_role: string;
  action: string;
  resource_type: string;
  resource_id: string;
  report_id: string | null;
  reason: string | null;
  previous_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
  has_next_page: boolean;
};

type RpcError = { message: string };
type ReportsRpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: RpcError | null }>;
};

function client() {
  return getSupabaseBrowserClient() as unknown as ReportsRpcClient;
}

function rows<T>(data: unknown) {
  return (Array.isArray(data) ? data : []) as T[];
}

function first<T>(data: unknown, message: string) {
  const item: unknown = Array.isArray(data) ? (data as unknown[])[0] : data;
  if (!item) throw new Error(message);
  return item as T;
}

async function rpc<T>(
  name: string,
  args: Record<string, unknown>,
  emptyMessage: string,
) {
  const { data, error } = await client().rpc(name, args);
  if (error) throw new Error(error.message);
  return first<T>(data, emptyMessage);
}

export async function submitQuestionReport(input: {
  sessionId: string;
  questionId: string;
  category: ReportCategory;
  description: string;
  idempotencyKey: string;
}) {
  return rpc<{ report_id: string; report_status: ReportStatus; created_at: string }>(
    "submit_question_report",
    {
      p_session_id: input.sessionId,
      p_question_id: input.questionId,
      p_category: input.category,
      p_description: input.description,
      p_idempotency_key: input.idempotencyKey,
    },
    "The report service returned no acknowledgement.",
  );
}

export type ReportCursor = { at: string; id: string };

export async function fetchOwnReports(cursor?: ReportCursor) {
  const { data, error } = await client().rpc("get_own_question_reports", {
    p_page_size: 50,
    p_cursor_created_at: cursor?.at ?? null,
    p_cursor_id: cursor?.id ?? null,
  });
  if (error) throw new Error(error.message);
  return rows<OwnQuestionReport>(data);
}

export async function fetchReportQueue(
  input: {
    status?: string;
    category?: string;
    lifecycleState?: string;
    cursor?: ReportCursor;
  } = {},
) {
  const { data, error } = await client().rpc("search_question_report_queue", {
    p_page_size: 100,
    p_cursor_updated_at: input.cursor?.at ?? null,
    p_cursor_id: input.cursor?.id ?? null,
    p_status: input.status || null,
    p_category: input.category || null,
    p_lifecycle_state: input.lifecycleState || null,
    p_performance_indicator: null,
    p_question_type: null,
    p_difficulty: null,
    p_created_from: null,
    p_created_to: null,
  });
  if (error) throw new Error(error.message);
  return rows<ReportQueueRow>(data);
}

export async function fetchReportDetail(reportId: string) {
  return rpc<ReportDetail>(
    "get_question_report_detail",
    { p_report_id: reportId },
    "The report was not found.",
  );
}

export function transitionQuestionReport(input: {
  reportId: string;
  expectedVersion: number;
  newStatus: "in_review" | "resolved" | "rejected" | "duplicate";
  resolutionCategory?: string | null;
  resolutionMessage?: string | null;
  duplicateOf?: string | null;
  reason: string;
  idempotencyKey: string;
}) {
  return rpc<{
    report_id: string;
    report_status: ReportStatus;
    report_version: number;
  }>(
    "transition_question_report",
    {
      p_report_id: input.reportId,
      p_expected_version: input.expectedVersion,
      p_new_status: input.newStatus,
      p_resolution_category: input.resolutionCategory ?? null,
      p_resolution_message: input.resolutionMessage ?? null,
      p_duplicate_of: input.duplicateOf ?? null,
      p_reason: input.reason,
      p_idempotency_key: input.idempotencyKey,
    },
    "The review service returned no acknowledgement.",
  );
}

export function correctReportedQuestion(input: {
  detail: ReportDetail;
  questionText: string;
  options: string[];
  correctOptionId: string;
  explanation: string;
  performanceIndicator: string;
  partitionKey: string;
  questionType: string;
  difficulty: string;
  tags: string[];
  reason: string;
  resolutionMessage: string;
  idempotencyKey: string;
}) {
  return rpc<{
    report_id: string;
    report_status: ReportStatus;
    report_version: number;
  }>(
    "correct_reported_question",
    {
      p_report_id: input.detail.report_id,
      p_expected_report_version: input.detail.report_version,
      p_expected_question_updated_at: input.detail.question_updated_at,
      p_question_text: input.questionText,
      p_options: input.options,
      p_correct_option_id: input.correctOptionId,
      p_explanation: input.explanation,
      p_performance_indicator: input.performanceIndicator,
      p_partition_key: input.partitionKey,
      p_question_type: input.questionType,
      p_difficulty: input.difficulty,
      p_tags: input.tags,
      p_reason: input.reason,
      p_resolution_message: input.resolutionMessage,
      p_idempotency_key: input.idempotencyKey,
    },
    "The correction service returned no acknowledgement.",
  );
}

export function resolveReportLifecycle(input: {
  detail: ReportDetail;
  lifecycleState: "Active" | "Retired";
  reason: string;
  resolutionMessage: string;
  idempotencyKey: string;
}) {
  return rpc<{
    report_id: string;
    report_status: ReportStatus;
    report_version: number;
  }>(
    "resolve_report_with_question_lifecycle",
    {
      p_report_id: input.detail.report_id,
      p_expected_report_version: input.detail.report_version,
      p_expected_question_updated_at: input.detail.question_updated_at,
      p_new_lifecycle_state: input.lifecycleState,
      p_reason: input.reason,
      p_resolution_message: input.resolutionMessage,
      p_idempotency_key: input.idempotencyKey,
    },
    "The lifecycle service returned no acknowledgement.",
  );
}

export async function fetchAuditLogs(
  reportId?: string,
  input: {
    cursor?: ReportCursor;
    action?: string;
    resourceType?: string;
    actorUserId?: string;
    resourceId?: string;
    reportId?: string;
    createdFrom?: string;
    createdTo?: string;
  } = {},
) {
  const { data, error } = await client().rpc("search_admin_audit_logs", {
    p_page_size: 100,
    p_cursor_created_at: input.cursor?.at ?? null,
    p_cursor_id: input.cursor?.id ?? null,
    p_actor_user_id: input.actorUserId || null,
    p_action: input.action || null,
    p_resource_type: input.resourceType || null,
    p_resource_id: input.resourceId || null,
    p_report_id: reportId || input.reportId || null,
    p_created_from: input.createdFrom || null,
    p_created_to: input.createdTo || null,
  });
  if (error) throw new Error(error.message);
  return rows<AuditLogRow>(data);
}
