import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ReportQuestionDialog } from "./ReportQuestionDialog";
import type * as Reports from "../../lib/reports/reports";

const submit = vi.hoisted(() => vi.fn());
vi.mock("../../lib/reports/reports", async (original) => ({
  ...(await original<typeof Reports>()),
  submitQuestionReport: submit,
}));
beforeEach(() => {
  submit.mockReset();
});

it("retains the form and retry identity after a response is lost", async () => {
  submit
    .mockRejectedValueOnce(new Error("Response lost"))
    .mockResolvedValueOnce({ report_id: "persisted-report" });
  render(
    <ReportQuestionDialog
      sessionId="session"
      questionId="question"
      questionLabel="Question 1"
      onClose={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("What is wrong?"), {
    target: { value: "The answer appears incorrect." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Submit Report" }));
  await screen.findByRole("alert");
  expect(screen.getByLabelText("What is wrong?")).toHaveValue(
    "The answer appears incorrect.",
  );
  fireEvent.click(screen.getByRole("button", { name: "Submit Report" }));
  await screen.findByText(/Report submitted/);
  expect(submit.mock.calls[0]?.[0]).toEqual(submit.mock.calls[1]?.[0]);
});

it("does not report success for an empty persistence acknowledgement", async () => {
  submit.mockResolvedValue({});
  render(
    <ReportQuestionDialog
      sessionId="session"
      questionId="question"
      questionLabel="Question 1"
      onClose={vi.fn()}
    />,
  );
  fireEvent.change(screen.getByLabelText("What is wrong?"), {
    target: { value: "The answer appears incorrect." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Submit Report" }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("did not confirm persistence"),
  );
  expect(screen.getByRole("button", { name: "Submit Report" })).toBeEnabled();
});
