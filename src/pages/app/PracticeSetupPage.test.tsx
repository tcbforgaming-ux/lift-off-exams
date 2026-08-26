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
  generateTestFromBlueprint: vi.fn(),
}));

vi.mock("../../lib/tests/generation", async () => {
  const actual = await vi.importActual<typeof GenerationModule>(
    "../../lib/tests/generation",
  );
  return {
    ...actual,
    fetchActiveBlueprints: mocks.fetchActiveBlueprints,
    generateTestFromBlueprint: mocks.generateTestFromBlueprint,
  };
});

import { PracticeSetupPage } from "./PracticeSetupPage";

describe("PracticeSetupPage", () => {
  beforeEach(() => {
    mocks.fetchActiveBlueprints.mockReset();
    mocks.generateTestFromBlueprint.mockReset();
    mocks.fetchActiveBlueprints.mockResolvedValue([blueprint]);
    mocks.generateTestFromBlueprint.mockResolvedValue(successResult);
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
      expect(mocks.generateTestFromBlueprint).toHaveBeenCalledWith(
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
    expect(mocks.generateTestFromBlueprint).not.toHaveBeenCalled();
  });

  it("disables duplicate submissions while generation is pending", async () => {
    let resolveGeneration: (value: TestGenerationResult) => void = () => undefined;
    mocks.generateTestFromBlueprint.mockReturnValue(
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
    expect(mocks.generateTestFromBlueprint).toHaveBeenCalledTimes(1);

    resolveGeneration(successResult);
    expect(await screen.findByText("AB4F9D72K1PQ")).toBeInTheDocument();
  });

  it("renders structured strict-shortage details", async () => {
    mocks.generateTestFromBlueprint.mockResolvedValue({
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
});
