import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TestIdPreview } from "../../lib/tests/generation";

const preview: TestIdPreview = {
  test_id: "AB4F9D72K1PQ",
  category: "Marketing",
  difficulties: ["Easy", "Medium", "Hard"],
  topic_tags: ["Core"],
  original_question_count: 250,
  creation_date: "2026-08-26T12:00:00Z",
  blueprint_name: "State Marketing Exam",
  blueprint_version: "1.0.0",
  generation_status: "Ready",
  updated_question_count: 0,
  authentication_required_to_launch: true,
  launch_available: true,
  content_policy: "current_with_warning",
  legacy_resolution_status: null,
  replacement_test_id: null,
};

const mocks = vi.hoisted(() => ({
  authStatus: "unauthenticated",
  fetchTestIdPreview: vi.fn(),
  fetchGeneratedTestManifest: vi.fn(),
}));

vi.mock("../../lib/auth/useAuth", () => ({
  useAuth: () => ({ status: mocks.authStatus }),
}));

vi.mock("../../lib/tests/generation", () => ({
  fetchTestIdPreview: mocks.fetchTestIdPreview,
  fetchGeneratedTestManifest: mocks.fetchGeneratedTestManifest,
}));

import { TestIdPage } from "./TestIdPage";

describe("TestIdPage", () => {
  beforeEach(() => {
    mocks.authStatus = "unauthenticated";
    mocks.fetchTestIdPreview.mockReset();
    mocks.fetchGeneratedTestManifest.mockReset();
    mocks.fetchTestIdPreview.mockResolvedValue(preview);
    mocks.fetchGeneratedTestManifest.mockResolvedValue(
      Array.from({ length: 250 }, (_, index) => ({ question_position: index + 1 })),
    );
  });

  it("offers a safe public preview and requires login to launch", async () => {
    render(
      <MemoryRouter>
        <TestIdPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Test ID"), {
      target: { value: "ab4f9d72k1pq" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview Test" }));

    expect(await screen.findByText("State Marketing Exam")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log In to Launch" })).toBeInTheDocument();
    expect(mocks.fetchGeneratedTestManifest).not.toHaveBeenCalled();
  });

  it("shows content-update warnings in the preview", async () => {
    mocks.fetchTestIdPreview.mockResolvedValue({
      ...preview,
      updated_question_count: 2,
    });

    render(
      <MemoryRouter initialEntries={["/test-id?code=AB4F9D72K1PQ"]}>
        <TestIdPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/2 questions have been updated/),
    ).toBeInTheDocument();
  });

  it("lets an authenticated holder verify the persisted manifest", async () => {
    mocks.authStatus = "authenticated";
    render(
      <MemoryRouter initialEntries={["/test-id?code=AB4F9D72K1PQ"]}>
        <TestIdPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByRole("button", { name: "Verify Launch" }));
    await waitFor(() => {
      expect(mocks.fetchGeneratedTestManifest).toHaveBeenCalledWith("AB4F9D72K1PQ");
    });
    expect(
      await screen.findByText("250 persisted questions verified."),
    ).toBeInTheDocument();
  });

  it("keeps unresolved legacy IDs previewable without offering launch", async () => {
    mocks.authStatus = "authenticated";
    mocks.fetchTestIdPreview.mockResolvedValue({
      ...preview,
      test_id: "LEGACY000001",
      generation_status: "Legacy",
      launch_available: false,
    });

    render(
      <MemoryRouter initialEntries={["/test-id?code=LEGACY000001"]}>
        <TestIdPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/does not have a verified ordered/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Verify Launch" }),
    ).not.toBeInTheDocument();
    expect(mocks.fetchGeneratedTestManifest).not.toHaveBeenCalled();
  });

  it("links retired legacy IDs to their audited replacement", async () => {
    mocks.fetchTestIdPreview.mockResolvedValue({
      ...preview,
      test_id: "LEGACY000004",
      generation_status: "Retired",
      launch_available: false,
      legacy_resolution_status: "Replaced",
      replacement_test_id: "AB4F9D72K1PQ",
    });

    render(
      <MemoryRouter initialEntries={["/test-id?code=LEGACY000004"]}>
        <TestIdPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole("link", { name: "Open Replacement Test ID" }),
    ).toHaveAttribute("href", "/test-id?code=AB4F9D72K1PQ");
  });
});
