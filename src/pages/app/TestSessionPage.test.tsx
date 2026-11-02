import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const question = {
  session_id: "00000000-0000-4000-8000-000000000001",
  test_id: "AB4F9D72K1PQ",
  session_status: "in_progress" as const,
  session_version: 3,
  total_questions: 1,
  answered_questions: 0,
  current_position: 1,
  started_at: "2026-08-26T12:00:00Z",
  last_activity_at: "2026-08-26T12:00:00Z",
  active_duration_seconds: 65,
  question_position: 1,
  question_id: "00000000-0000-4000-8000-000000000002",
  question_type: "Scenario",
  question_text: "Which response is best?",
  options: ["First", "Second", "Third", "Fourth"],
  difficulty: "Medium",
  tags: ["Business Law"],
  selected_option_id: null,
  answer_version: null,
};

const mocks = vi.hoisted(() => ({
  fetchTestSession: vi.fn(),
  fetchPracticeSessionSettings: vi.fn(),
  fetchPracticeFeedback: vi.fn(),
  saveSessionAnswer: vi.fn(),
  saveSessionPosition: vi.fn(),
  pauseSession: vi.fn(),
  resumeSession: vi.fn(),
  submitSession: vi.fn(),
}));

vi.mock("../../lib/sessions/session", () => {
  const ids = ["A", "B", "C", "D"] as const;
  return {
    ...mocks,
    parseAnswerOptions: (options: unknown) =>
      Array.isArray(options)
        ? (options as unknown[]).map((text, index) => ({
            id: ids[index],
            text: typeof text === "string" ? text : "",
          }))
        : [],
    formatDuration: (seconds: number) =>
      `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`,
  };
});

import { TestSessionPage } from "./TestSessionPage";

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/sessions/${question.session_id}`]}>
      <Routes>
        <Route path="/sessions/:sessionId" element={<TestSessionPage />} />
        <Route path="/results/:sessionId" element={<p>Result route</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("TestSessionPage", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.fetchTestSession.mockResolvedValue([question]);
    mocks.fetchPracticeSessionSettings.mockResolvedValue({
      timer_seconds: null,
      active_duration_seconds: 65,
      status: "in_progress",
      show_answers: false,
      show_explanations: false,
    });
    mocks.saveSessionAnswer.mockResolvedValue({
      session_version: 4,
      answer_version: 1,
      answered_questions: 1,
      total_questions: 1,
    });
    mocks.submitSession.mockResolvedValue({ session_id: question.session_id });
  });

  it("redirects to results after the server expires the timer", async () => {
    mocks.fetchPracticeSessionSettings.mockResolvedValue({
      timer_seconds: 60,
      active_duration_seconds: 60,
      status: "submitted",
      show_answers: false,
      show_explanations: false,
    });
    renderPage();
    expect(await screen.findByText("Result route")).toBeInTheDocument();
  });

  it("loads premium study feedback only after an answer is saved", async () => {
    mocks.fetchPracticeSessionSettings.mockResolvedValue({
      timer_seconds: null,
      active_duration_seconds: 65,
      status: "in_progress",
      show_answers: true,
      show_explanations: true,
    });
    mocks.fetchPracticeFeedback.mockResolvedValue({
      correct_option_id: "A",
      explanation: "Study explanation",
    });
    renderPage();
    await screen.findByText(question.question_text);
    expect(mocks.fetchPracticeFeedback).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("radio", { name: /B Second/ }));
    expect(await screen.findByText("Study explanation")).toBeInTheDocument();
    expect(screen.getByText("Correct answer: A")).toBeInTheDocument();
  });

  it("loads only safe question data and persists one selected answer", async () => {
    renderPage();

    expect(await screen.findByText("Which response is best?")).toBeInTheDocument();
    expect(screen.queryByText(/correct answer/i)).not.toBeInTheDocument();
    expect(screen.getByText("1:05")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /B Second/ }));
    await waitFor(() => {
      expect(mocks.saveSessionAnswer).toHaveBeenCalledWith({
        sessionId: question.session_id,
        questionId: question.question_id,
        selectedOptionId: "B",
        expectedVersion: 3,
      });
    });
    expect(await screen.findByText("Answer saved.")).toBeInTheDocument();
  });

  it("warns about unanswered questions and submits into the terminal result route", async () => {
    renderPage();
    await screen.findByText("Which response is best?");

    fireEvent.click(screen.getByRole("button", { name: "Submit Test" }));
    expect(screen.getByRole("dialog", { name: "Submit this test?" })).toHaveTextContent(
      "1 unanswered question remains",
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Submit Test" })[1]);

    expect(await screen.findByText("Result route")).toBeInTheDocument();
    expect(mocks.submitSession).toHaveBeenCalledWith(question.session_id, 3);
  });

  it("opens a categorized question report form without exposing answer keys", async () => {
    renderPage();
    await screen.findByText("Which response is best?");

    fireEvent.click(screen.getByRole("button", { name: "Report Question" }));

    expect(screen.getByRole("dialog", { name: "Report question" })).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Incorrect answer" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/correct option/i)).not.toBeInTheDocument();
  });
});
