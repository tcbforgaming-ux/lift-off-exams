import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
