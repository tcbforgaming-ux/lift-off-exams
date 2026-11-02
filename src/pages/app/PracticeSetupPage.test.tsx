import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as GenerationModule from "../../lib/tests/generation";
import type {
  TestBlueprintSummary,
  TestGenerationResult,
} from "../../lib/tests/generation";

const blueprint: TestBlueprintSummary = {
  id: "84000000-0000-0000-0000-000000000001",
  blueprint_name: "State Marketing Exam",
  category: "Marketing",
  cluster: "Marketing",
  level: "State",
  version: "1.0.0",
  total_questions: 250,
  distribution: {},
};

const successResult: TestGenerationResult = {
  success: true,
  test_definition_id: "85000000-0000-0000-0000-000000000001",
  test_id: "AB4F9D72K1PQ",
  generation_status: "Ready",
  requested_count: 250,
  selected_count: 250,
  canonical_seed: "000123",
  algorithm_version: "sha256-strata-v1",
  blueprint_summary: {},
  shortage: {},
};

const mocks = vi.hoisted(() => ({
  fetchActiveBlueprints: vi.fn(),
  generateCustomPractice: vi.fn(),
}));

vi.mock("../../lib/tests/generation", async () => {
  const actual = await vi.importActual<typeof GenerationModule>(
    "../../lib/tests/generation",
  );
  return {
    ...actual,
    fetchActiveBlueprints: mocks.fetchActiveBlueprints,
    generateCustomPractice: mocks.generateCustomPractice,
  };
});

import { PracticeSetupPage } from "./PracticeSetupPage";

describe("PracticeSetupPage", () => {
  beforeEach(() => {
    mocks.fetchActiveBlueprints.mockReset();
    mocks.generateCustomPractice.mockReset();
    mocks.fetchActiveBlueprints.mockResolvedValue([blueprint]);
    mocks.generateCustomPractice.mockResolvedValue(successResult);
  });

  it("loads approved blueprints and allows a 250-question request", async () => {
    render(
      <MemoryRouter>
        <PracticeSetupPage />
      </MemoryRouter>,
    );

    expect(await screen.findByDisplayValue("250")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Seed"), {
      target: { value: "000123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate Test" }));

    await waitFor(() => {
      expect(mocks.generateCustomPractice).toHaveBeenCalledWith(
        expect.objectContaining({
          blueprintId: blueprint.id,
          expectedVersion: "1.0.0",
          requestedCount: 250,
          seed: "000123",
        }),
      );
    });
    expect(await screen.findByText("AB4F9D72K1PQ")).toBeInTheDocument();
  });

  it("rejects 251 questions before calling the server", async () => {
    render(
      <MemoryRouter>
        <PracticeSetupPage />
      </MemoryRouter>,
    );

    const count = await screen.findByLabelText("Questions");
    fireEvent.change(count, { target: { value: "251" } });
    fireEvent.submit(count.closest("form") as HTMLFormElement);

    expect(
      await screen.findByText("Question count must be between 1 and 250."),
    ).toBeInTheDocument();
    expect(mocks.generateCustomPractice).not.toHaveBeenCalled();
  });

  it("disables duplicate submissions while generation is pending", async () => {
    let resolveGeneration: (value: TestGenerationResult) => void = () => undefined;
    mocks.generateCustomPractice.mockReturnValue(
      new Promise<TestGenerationResult>((resolve) => {
        resolveGeneration = resolve;
      }),
    );

    render(
      <MemoryRouter>
        <PracticeSetupPage />
      </MemoryRouter>,
    );

    await screen.findByDisplayValue("250");
    const submit = screen.getByRole("button", { name: "Generate Test" });
    fireEvent.click(submit);
    expect(await screen.findByRole("button", { name: "Generating…" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Generating…" }));
    expect(mocks.generateCustomPractice).toHaveBeenCalledTimes(1);

    resolveGeneration(successResult);
    expect(await screen.findByText("AB4F9D72K1PQ")).toBeInTheDocument();
  });

  it("renders structured strict-shortage details", async () => {
    mocks.generateCustomPractice.mockResolvedValue({
      ...successResult,
      success: false,
      test_definition_id: null,
      test_id: null,
      generation_status: "Failed",
      selected_count: 249,
      shortage: {
        unsatisfied_strata: [
          {
            stratum_id: "finance",
            requested: 250,
            available: 249,
            raw_available: 249,
            constraints_overlap: false,
            guidance: "Add eligible active questions.",
          },
        ],
      },
    });

    render(
      <MemoryRouter>
        <PracticeSetupPage />
      </MemoryRouter>,
    );

    await screen.findByDisplayValue("250");
    fireEvent.click(screen.getByRole("button", { name: "Generate Test" }));
    expect(await screen.findByText("Question pool shortage")).toBeInTheDocument();
    expect(screen.getByText("249 of 250 available")).toBeInTheDocument();
  });

  it("sends customized count, difficulty, and timer settings with a fresh retry key", async () => {
    render(
      <MemoryRouter>
        <PracticeSetupPage />
      </MemoryRouter>,
    );
    await screen.findByDisplayValue("250");
    fireEvent.click(screen.getByRole("button", { name: "Generate Test" }));
    await screen.findByText(successResult.test_id!);
    const firstRequest = mocks.generateCustomPractice.mock.calls[0][0] as Parameters<
      typeof GenerationModule.generateCustomPractice
    >[0];
    const firstKey = firstRequest.idempotencyKey;
    fireEvent.change(screen.getByLabelText("Questions"), { target: { value: "25" } });
    fireEvent.click(screen.getByLabelText("Hard"));
    fireEvent.change(screen.getByLabelText("Timer"), { target: { value: "custom" } });
    fireEvent.change(screen.getByLabelText("Minutes"), { target: { value: "999" } });
    fireEvent.click(screen.getByRole("button", { name: "Generate Test" }));
    await waitFor(() => expect(mocks.generateCustomPractice).toHaveBeenCalledTimes(2));
    expect(mocks.generateCustomPractice.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        requestedCount: 25,
        difficulties: ["Easy", "Medium"],
        timerMinutes: 999,
      }),
    );
    const nextRequest = mocks.generateCustomPractice.mock.calls[1][0] as Parameters<
      typeof GenerationModule.generateCustomPractice
    >[0];
    expect(nextRequest.idempotencyKey).not.toBe(firstKey);
  });

  it("switches categories without carrying over unrelated topics", async () => {
    mocks.fetchActiveBlueprints.mockResolvedValue([
      { ...blueprint, distribution: { strata: [{ tags: ["Channel Management"] }] } },
      {
        ...blueprint,
        id: "finance",
        category: "Finance",
        blueprint_name: "Finance Exam",
        distribution: { strata: [{ tags: ["Financial Analysis"] }] },
      },
    ]);
    render(
      <MemoryRouter>
        <PracticeSetupPage />
      </MemoryRouter>,
    );
    await screen.findByLabelText("Channel Management");
    fireEvent.change(screen.getByLabelText("Category"), {
      target: { value: "Finance" },
    });
    expect(screen.queryByLabelText("Channel Management")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Financial Analysis")).toBeChecked();
  });
});
