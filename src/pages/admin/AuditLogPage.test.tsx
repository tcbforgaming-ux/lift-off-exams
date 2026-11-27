import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AuditLogPage } from "./AuditLogPage";

const fetchLogs = vi.hoisted(() => vi.fn());
vi.mock("../../lib/reports/reports", () => ({ fetchAuditLogs: fetchLogs }));

it("resets audit pagination for every filter and ignores an older response", async () => {
  const row = {
    audit_id: "one",
    action: "first",
    created_at: "2026-11-02T00:00:00Z",
    has_next_page: true,
  };
  fetchLogs.mockResolvedValue([row]);
  render(<AuditLogPage />);
  await screen.findByText("first");
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
  await screen.findByText("Page 2");
  let resolveOld!: (rows: unknown[]) => void;
  fetchLogs.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveOld = resolve;
      }),
  );
  fireEvent.change(screen.getByLabelText("Action"), { target: { value: "old" } });
  fetchLogs.mockResolvedValue([]);
  fireEvent.change(screen.getByLabelText("Action"), { target: { value: "new" } });
  await act(async () => {
    resolveOld([{ ...row, action: "stale" }]);
    await Promise.resolve();
  });
  expect(screen.queryByText("stale")).not.toBeInTheDocument();
  expect(screen.getByText("Page 1")).toBeInTheDocument();
  for (const [label, value] of [
    ["Actor user ID", "actor"],
    ["Resource type", "question"],
    ["Resource ID", "resource"],
    ["Report ID", "report"],
    ["Created from", "2026-11-01T12:00"],
    ["Created to", "2026-11-02T12:00"],
  ]) {
    await act(async () => {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
      await Promise.resolve();
    });
    expect(screen.getByText("Page 1")).toBeInTheDocument();
  }
  expect(fetchLogs).toHaveBeenLastCalledWith(
    undefined,
    expect.objectContaining({
      cursor: undefined,
      action: "new",
      actorUserId: "actor",
      resourceType: "question",
      resourceId: "resource",
      reportId: "report",
      createdFrom: new Date("2026-11-01T12:00").toISOString(),
      createdTo: new Date("2026-11-02T12:00").toISOString(),
    }),
  );
});
