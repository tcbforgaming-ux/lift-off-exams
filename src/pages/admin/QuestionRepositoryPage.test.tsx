import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as QuestionRepositoryModule from "../../lib/questions/repository";
import type { QuestionRepositoryRow } from "../../lib/questions/repository";

const repositoryRows: QuestionRepositoryRow[] = [
  {
    question_id: "70000000-0000-0000-0000-000000000001",
    partition_key: "Marketing",
    performance_indicator: "PI-001",
    question_type: "Scenario",
    question_text: "How should a manager review a pricing policy?",
    difficulty: "Easy",
    tags: ["Marketing", "Pricing"],
    lifecycle_state: "Active",
    created_at: "2026-07-31T12:00:00Z",
    updated_at: "2026-07-31T12:00:00Z",
    question_hash: null,
    has_next_page: false,
  },
];

const mocks = vi.hoisted(() => ({
  fetchQuestionRepositoryPage: vi.fn(),
  setQuestionLifecycleState: vi.fn(),
}));

vi.mock("../../lib/questions/repository", async () => {
  const actual = await vi.importActual<typeof QuestionRepositoryModule>(
    "../../lib/questions/repository",
  );

  return {
    ...actual,
    fetchQuestionRepositoryPage: mocks.fetchQuestionRepositoryPage,
    setQuestionLifecycleState: mocks.setQuestionLifecycleState,
  };
});

import { QuestionRepositoryPage } from "./QuestionRepositoryPage";

describe("QuestionRepositoryPage", () => {
  beforeEach(() => {
    mocks.fetchQuestionRepositoryPage.mockReset();
    mocks.setQuestionLifecycleState.mockReset();
    mocks.fetchQuestionRepositoryPage.mockResolvedValue(repositoryRows);
    mocks.setQuestionLifecycleState.mockResolvedValue({
      question_id: repositoryRows[0].question_id,
      lifecycle_state: "Retired",
      updated_at: "2026-07-31T12:01:00Z",
    });
  });

  it("loads one repository page and renders question status", async () => {
    render(
      <MemoryRouter initialEntries={["/admin?pageSize=10"]}>
        <QuestionRepositoryPage />
      </MemoryRouter>,
    );

    expect(await screen.findAllByText("Active")).not.toHaveLength(0);
    expect(
      screen.getByText("How should a manager review a pricing policy?"),
    ).toBeInTheDocument();
    expect(mocks.fetchQuestionRepositoryPage).toHaveBeenCalledWith(
      expect.objectContaining({ pageSize: 10 }),
    );
  });

  it("confirms lifecycle actions before calling the RPC", async () => {
    render(
      <MemoryRouter initialEntries={["/admin"]}>
        <QuestionRepositoryPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Retire" }));
    expect(
      screen.getByRole("heading", { name: "Retire Question" }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Retire after review" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => {
      expect(mocks.setQuestionLifecycleState).toHaveBeenCalledWith(
        repositoryRows[0].question_id,
        "Retired",
        "Retire after review",
        repositoryRows[0].updated_at,
      );
    });
    expect(await screen.findAllByText("Retired")).not.toHaveLength(0);
  });
});
