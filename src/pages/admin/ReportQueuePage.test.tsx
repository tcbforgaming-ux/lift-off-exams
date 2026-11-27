import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { expect, it, vi } from "vitest";
import { ReportQueuePage } from "./ReportQueuePage";
import type * as Reports from "../../lib/reports/reports";
const fetchQueue = vi.hoisted(() => vi.fn());
vi.mock("../../lib/reports/reports", async (original) => ({
  ...(await original<typeof Reports>()),
  fetchReportQueue: fetchQueue,
}));

it("an older filter response cannot overwrite newer results", async () => {
  let resolveOld!: (rows: unknown[]) => void;
  fetchQueue
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        }),
    )
    .mockResolvedValueOnce([]);
  render(
    <MemoryRouter>
      <ReportQueuePage />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Status"), { target: { value: "resolved" } });
  await screen.findByText("Queue is clear");
  await act(async () => {
    resolveOld([
      {
        report_id: "old-result",
        category: "other",
        report_status: "open",
        updated_at: "2026-11-02",
        reporter_email: "stale@example.test",
      },
    ]);
    await Promise.resolve();
  });
  expect(screen.queryByText("stale@example.test")).not.toBeInTheDocument();
  expect(screen.getByText("Queue is clear")).toBeInTheDocument();
});

it("URL navigation resets the cursor and forwards question filters", async () => {
  fetchQueue.mockReset();
  fetchQueue
    .mockResolvedValueOnce([
      {
        report_id: "page-one",
        category: "other",
        report_status: "open",
        updated_at: "2026-11-02",
        has_next_page: true,
      },
    ])
    .mockResolvedValue([]);
  function ChangeLocation() {
    const navigate = useNavigate();
    return (
      <button
        onClick={() =>
          void navigate("/admin/reports?questionState=Retired&difficulty=Hard")
        }
      >
        Open filtered queue
      </button>
    );
  }
  render(
    <MemoryRouter initialEntries={["/admin/reports"]}>
      <ChangeLocation />
      <ReportQueuePage />
    </MemoryRouter>,
  );
  await screen.findByRole("link", { name: "Review" });
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await screen.findByText("Queue is clear");
  expect(fetchQueue).toHaveBeenLastCalledWith(
    expect.objectContaining({ cursor: { id: "page-one", at: "2026-11-02" } }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Open filtered queue" }));
  await screen.findByText("Queue is clear");
  expect(fetchQueue).toHaveBeenLastCalledWith(
    expect.objectContaining({
      lifecycleState: "Retired",
      difficulty: "Hard",
      cursor: undefined,
    }),
  );
  expect(screen.getByText("Page 1")).toBeVisible();
});
