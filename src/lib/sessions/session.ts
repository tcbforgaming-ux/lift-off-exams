import { getSupabaseBrowserClient } from "../supabase/browserClient";

export type AnswerOption = {
  id: "A" | "B" | "C" | "D";
  text: string;
};

export type SessionQuestion = {
  session_id: string;
  test_id: string;
  session_status: "in_progress" | "paused" | "submitted";
  session_version: number;
  total_questions: number;
  answered_questions: number;
  current_position: number;
  started_at: string;
  last_activity_at: string;
  active_duration_seconds: number;
  question_position: number;
  question_id: string;
  question_type: string;
  question_text: string;
  options: unknown;
  difficulty: string;
  tags: string[];
  selected_option_id: string | null;
  answer_version: number | null;
};

export type SessionStart = {
  session_id: string;
  test_id: string;
  status: "in_progress" | "paused" | "submitted";
  session_version: number;
  question_count: number;
  current_position: number;
  started_at: string;
};

export type SessionResultItem = {
  session_id: string;
  test_id: string;
  total_questions: number;
  answered_questions: number;
  unanswered_questions: number;
  correct_answers: number;
  incorrect_answers: number;
  percentage: number;
  active_duration_seconds: number;
  submitted_at: string;
  can_view_explanations: boolean;
  question_position: number;
  question_id: string;
  question_type: string;
  question_text: string;
  options: unknown;
  difficulty: string;
  tags: string[];
  selected_option_id: string | null;
  correct_option_id: string;
  is_correct: boolean;
  explanation?: string | null;
};

export type HistoryEntry = {
  session_id: string;
  test_id: string;
  mode: string;
  session_status: "in_progress" | "paused" | "submitted";
  started_at: string;
  last_activity_at: string;
  submitted_at: string | null;
  question_count: number;
  answered_questions: number;
  percentage: number | null;
  category: string;
  topic_tags: string[];
  has_next_page: boolean;
};

type RpcError = { message: string };

type SessionRpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: RpcError | null }>;
};

function rpcClient() {
  return getSupabaseBrowserClient() as unknown as SessionRpcClient;
}

export type PracticeSessionSettings = {
  timer_seconds: number | null;
  active_duration_seconds: number;
  status: SessionQuestion["session_status"];
  show_answers: boolean;
  show_explanations: boolean;
};

export async function fetchPracticeSessionSettings(sessionId: string) {
  const { data, error } = await rpcClient().rpc("get_practice_session_settings", {
    p_session_id: sessionId,
  });
  if (error) throw new Error(error.message);
  return data as PracticeSessionSettings;
}

export async function fetchPracticeFeedback(sessionId: string, questionId: string) {
  const { data, error } = await rpcClient().rpc("get_practice_feedback", {
    p_session_id: sessionId,
    p_question_id: questionId,
  });
  if (error) throw new Error(error.message);
  return data as { correct_option_id: string | null; explanation: string | null };
}

function rows<T>(data: unknown) {
  return (Array.isArray(data) ? data : []) as T[];
}

function first<T>(data: unknown, message: string) {
  const value: unknown = Array.isArray(data) ? (data as unknown[])[0] : data;
  if (!value) throw new Error(message);
  return value as T;
}

export function parseAnswerOptions(value: unknown): AnswerOption[] {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new Error("This question does not contain four valid answer options.");
  }

  const ids = ["A", "B", "C", "D"] as const;
  return value.map((option, index) => {
    if (typeof option === "string") return { id: ids[index], text: option };
    if (option && typeof option === "object") {
      const record = option as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id.toUpperCase() : ids[index];
      const textValue = [record.text, record.label, record.value].find(
        (candidate): candidate is string => typeof candidate === "string",
      );
      const text = textValue?.trim() ?? "";
      if (ids[index] !== id || !text) {
        throw new Error("This question contains an invalid answer option.");
      }
      return { id: ids[index], text };
    }
    throw new Error("This question contains an invalid answer option.");
  });
}

export function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export async function startTestSession(testId: string, idempotencyKey: string) {
  const { data, error } = await rpcClient().rpc("start_test_session", {
    p_test_id: testId.trim().toUpperCase(),
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw new Error(error.message);
  return first<SessionStart>(data, "The session service returned no session.");
}

export async function fetchTestSession(sessionId: string) {
  const { data, error } = await rpcClient().rpc("get_test_session", {
    p_session_id: sessionId,
  });
  if (error) throw new Error(error.message);
  const result = rows<SessionQuestion>(data);
  if (result.length === 0) throw new Error("The session contains no questions.");
  return result;
}

export async function saveSessionAnswer(input: {
  sessionId: string;
  questionId: string;
  selectedOptionId: string;
  expectedVersion: number;
}) {
  const { data, error } = await rpcClient().rpc("save_test_session_answer", {
    p_session_id: input.sessionId,
    p_question_id: input.questionId,
    p_selected_option_id: input.selectedOptionId,
    p_expected_session_version: input.expectedVersion,
  });
  if (error) throw new Error(error.message);
  return first<{
    session_version: number;
    answer_version: number;
    answered_questions: number;
    total_questions: number;
  }>(data, "The answer service returned no acknowledgement.");
}

export async function saveSessionPosition(
  sessionId: string,
  position: number,
  expectedVersion: number,
) {
  const { data, error } = await rpcClient().rpc("set_test_session_position", {
    p_session_id: sessionId,
    p_position: position,
    p_expected_session_version: expectedVersion,
  });
  if (error) throw new Error(error.message);
  return Number(data);
}

async function transitionSession(
  functionName: "pause_test_session" | "resume_test_session",
  sessionId: string,
  expectedVersion: number,
) {
  const { data, error } = await rpcClient().rpc(functionName, {
    p_session_id: sessionId,
    p_expected_session_version: expectedVersion,
  });
  if (error) throw new Error(error.message);
  return Number(data);
}

export function pauseSession(sessionId: string, expectedVersion: number) {
  return transitionSession("pause_test_session", sessionId, expectedVersion);
}

export function resumeSession(sessionId: string, expectedVersion: number) {
  return transitionSession("resume_test_session", sessionId, expectedVersion);
}

export async function submitSession(sessionId: string, expectedVersion: number) {
  const { data, error } = await rpcClient().rpc("submit_test_session", {
    p_session_id: sessionId,
    p_expected_session_version: expectedVersion,
  });
  if (error) throw new Error(error.message);
  return first<SessionResultItem>(data, "The submission service returned no result.");
}

export async function fetchTestResult(sessionId: string) {
  const { data, error } = await rpcClient().rpc("get_test_result", {
    p_session_id: sessionId,
  });
  if (error) throw new Error(error.message);
  const result = rows<SessionResultItem>(data);
  if (result.length === 0) throw new Error("The result contains no questions.");

  if (!result[0]?.can_view_explanations) return result;

  const explanationResponse = await rpcClient().rpc("get_test_result_explanations", {
    p_session_id: sessionId,
  });
  if (explanationResponse.error) throw new Error(explanationResponse.error.message);
  const explanations = new Map(
    rows<{ question_id: string; explanation: string | null }>(
      explanationResponse.data,
    ).map((item) => [item.question_id, item.explanation]),
  );
  return result.map((item) => ({
    ...item,
    explanation: explanations.get(item.question_id) ?? null,
  }));
}

export async function fetchTestHistory(
  input: {
    pageSize?: number;
    cursorActivityAt?: string | null;
    cursorSessionId?: string | null;
    status?: string | null;
  } = {},
) {
  const { data, error } = await rpcClient().rpc("get_test_history", {
    p_page_size: input.pageSize ?? 20,
    p_cursor_activity_at: input.cursorActivityAt ?? null,
    p_cursor_session_id: input.cursorSessionId ?? null,
    p_status: input.status ?? null,
  });
  if (error) throw new Error(error.message);
  return rows<HistoryEntry>(data);
}
