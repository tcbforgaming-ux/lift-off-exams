import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("../supabase/browserClient", () => ({
  getSupabaseBrowserClient: () => ({ rpc: mocks.rpc }),
}));

import {
  fetchTestResult,
  formatDuration,
  parseAnswerOptions,
  saveSessionAnswer,
  startTestSession,
} from "./session";

describe("session client", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
  });

  it("normalizes string and object answer options", () => {
    expect(parseAnswerOptions(["First", "Second", "Third", "Fourth"])).toEqual([
      { id: "A", text: "First" },
      { id: "B", text: "Second" },
      { id: "C", text: "Third" },
      { id: "D", text: "Fourth" },
    ]);
    expect(
      parseAnswerOptions([
        { id: "A", text: "First" },
        { id: "B", text: "Second" },
        { id: "C", text: "Third" },
        { id: "D", text: "Fourth" },
      ]),
    ).toHaveLength(4);
  });

  it("rejects malformed answer options before rendering a question", () => {
    expect(() => parseAnswerOptions(["A", "B", "C"])).toThrow(
      "four valid answer options",
    );
    expect(() =>
      parseAnswerOptions([{ id: "B", text: "Wrong order" }, "B", "C", "D"]),
    ).toThrow("invalid answer option");
  });

  it("formats active duration without inventing a timer", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(125)).toBe("2:05");
    expect(formatDuration(3723)).toBe("1:02:03");
  });

  it("normalizes Test IDs and sends an idempotency key to the server", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ session_id: "session-1", session_status: "in_progress" }],
      error: null,
    });

    await expect(startTestSession(" ab4f9d72k1pq ", "launch-1")).resolves.toMatchObject(
      {
        session_id: "session-1",
      },
    );
    expect(mocks.rpc).toHaveBeenCalledWith("start_test_session_configured", {
      p_test_id: "AB4F9D72K1PQ",
      p_idempotency_key: "launch-1",
      p_options: null,
    });
  });

  it("passes optimistic versions when saving answers", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ session_version: 8, answer_version: 1 }],
      error: null,
    });

    await saveSessionAnswer({
      sessionId: "session-1",
      questionId: "question-1",
      selectedOptionId: "C",
      expectedVersion: 7,
    });

    expect(mocks.rpc).toHaveBeenCalledWith("save_test_session_answer", {
      p_session_id: "session-1",
      p_question_id: "question-1",
      p_selected_option_id: "C",
      p_expected_session_version: 7,
    });
  });

  it("does not request premium explanations for a free result", async () => {
    mocks.rpc.mockResolvedValue({
      data: [{ question_id: "question-1", can_view_explanations: false }],
      error: null,
    });

    await fetchTestResult("session-1");
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).toHaveBeenCalledWith("get_test_result", {
      p_session_id: "session-1",
    });
  });

  it("requests and merges explanations only after server authorization", async () => {
    mocks.rpc
      .mockResolvedValueOnce({
        data: [{ question_id: "question-1", can_view_explanations: true }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ question_id: "question-1", explanation: "Because it is correct." }],
        error: null,
      });

    const result = await fetchTestResult("session-1");
    expect(result[0]?.explanation).toBe("Because it is correct.");
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "get_test_result_explanations", {
      p_session_id: "session-1",
    });
  });

  it("surfaces server errors without mutating client state", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "Session version conflict. Reload before retrying." },
    });

    await expect(
      saveSessionAnswer({
        sessionId: "session-1",
        questionId: "question-1",
        selectedOptionId: "A",
        expectedVersion: 1,
      }),
    ).rejects.toThrow("Session version conflict");
  });
});
