import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();

vi.mock("../supabase/browserClient", () => ({
  getSupabaseBrowserClient: () => ({ rpc }),
}));

import {
  correctReportedQuestion,
  fetchReportQueue,
  fetchOwnReports,
  fetchAuditLogs,
  submitQuestionReport,
  transitionQuestionReport,
  type ReportDetail,
} from "./reports";

describe("question report RPC boundary", () => {
  beforeEach(() => rpc.mockReset());

  it("forwards stable paired cursors for all three bounded lists", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const cursor = { at: "2026-11-02T00:00:00Z", id: "cursor-id" };
    await fetchOwnReports(cursor);
    expect(rpc).toHaveBeenLastCalledWith(
      "get_own_question_reports",
      expect.objectContaining({
        p_page_size: 50,
        p_cursor_created_at: cursor.at,
        p_cursor_id: cursor.id,
      }),
    );
    await fetchReportQueue({ cursor: { ...cursor, rank: 4 } });
    expect(rpc).toHaveBeenLastCalledWith(
      "list_priority_reports",
      expect.objectContaining({
        p_limit: 100,
        p_before: cursor.at,
        p_id: cursor.id,
        p_rank: 4,
      }),
    );
    await fetchAuditLogs(undefined, {
      cursor,
      action: "question.corrected",
      resourceType: "question",
    });
    expect(rpc).toHaveBeenLastCalledWith(
      "search_admin_audit_logs",
      expect.objectContaining({
        p_cursor_created_at: cursor.at,
        p_cursor_id: cursor.id,
        p_action: "question.corrected",
        p_resource_type: "question",
      }),
    );
  });

  it("submits only the session reference and user-authored report fields", async () => {
    rpc.mockResolvedValue({
      data: [{ report_id: "report-1", report_status: "open", created_at: "now" }],
      error: null,
    });

    await submitQuestionReport({
      sessionId: "session-1",
      questionId: "question-1",
      category: "bad_options",
      description: "Two options appear to mean the same thing.",
      idempotencyKey: "request-1",
    });

    expect(rpc).toHaveBeenCalledWith("submit_question_report", {
      p_session_id: "session-1",
      p_question_id: "question-1",
      p_category: "bad_options",
      p_description: "Two options appear to mean the same thing.",
      p_idempotency_key: "request-1",
    });
  });

  it("uses bounded server-side report queue filters", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await fetchReportQueue({ status: "open", category: "unclear_wording" });
    expect(rpc).toHaveBeenCalledWith(
      "list_priority_reports",
      expect.objectContaining({
        p_limit: 100,
        p_status: "open",
        p_category: "unclear_wording",
      }),
    );
  });

  it("sends optimistic concurrency values for a correction", async () => {
    rpc.mockResolvedValue({ data: [{ report_id: "report-1" }], error: null });
    const detail = {
      report_id: "report-1",
      report_version: 4,
      question_updated_at: "2026-08-26T00:00:00Z",
    } as ReportDetail;

    await correctReportedQuestion({
      detail,
      questionText: "Updated question text?",
      options: ["A", "B", "C", "D"],
      correctOptionId: "A",
      explanation: "The first option is correct.",
      performanceIndicator: "PI-1",
      partitionKey: "Finance",
      questionType: "S",
      difficulty: "M",
      tags: ["Risk Management"],
      reason: "Fix confirmed answer key",
      resolutionMessage: "The answer key was corrected.",
      idempotencyKey: "correction-1",
    });

    expect(rpc).toHaveBeenCalledWith(
      "correct_reported_question",
      expect.objectContaining({
        p_expected_report_version: 4,
        p_expected_question_updated_at: "2026-08-26T00:00:00Z",
        p_idempotency_key: "correction-1",
      }),
    );
  });

  it("preserves the selected final-state metadata", async () => {
    rpc.mockResolvedValue({ data: [{ report_id: "report-2" }], error: null });
    await transitionQuestionReport({
      reportId: "report-2",
      expectedVersion: 2,
      newStatus: "duplicate",
      resolutionCategory: "duplicate",
      resolutionMessage: "This matches the primary report.",
      duplicateOf: "report-1",
      reason: "Same question and issue",
      idempotencyKey: "transition-1",
    });
    expect(rpc).toHaveBeenCalledWith(
      "transition_question_report",
      expect.objectContaining({
        p_new_status: "duplicate",
        p_duplicate_of: "report-1",
        p_resolution_category: "duplicate",
      }),
    );
  });
});
