import { useState, type FormEvent } from "react";

import {
  reportCategories,
  reportCategoryLabels,
  submitQuestionReport,
  type ReportCategory,
} from "../../lib/reports/reports";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

type ReportQuestionDialogProps = {
  sessionId: string;
  questionId: string;
  questionLabel: string;
  onClose: () => void;
};

export function ReportQuestionDialog({
  sessionId,
  questionId,
  questionLabel,
  onClose,
}: ReportQuestionDialogProps) {
  const [category, setCategory] = useState<ReportCategory>("incorrect_answer");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      await submitQuestionReport({
        sessionId,
        questionId,
        category,
        description,
        idempotencyKey: crypto.randomUUID(),
      });
      setMessage("Report submitted. You can follow its status from My Reports.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The report could not be submitted.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <Card
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
      >
        <h2 id="report-title">Report question</h2>
        <p className="muted">{questionLabel}</p>
        {message ? (
          <>
            <p className="form-message" role="status">
              {message}
            </p>
            <Button type="button" onClick={onClose}>
              Close
            </Button>
          </>
        ) : (
          <form className="page-stack" onSubmit={(event) => void submit(event)}>
            <label className="field-label">
              Problem type
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as ReportCategory)}
              >
                {reportCategories.map((value) => (
                  <option key={value} value={value}>
                    {reportCategoryLabels[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              What is wrong?
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                minLength={10}
                maxLength={2000}
                required
              />
            </label>
            <div className="button-row">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit Report"}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
