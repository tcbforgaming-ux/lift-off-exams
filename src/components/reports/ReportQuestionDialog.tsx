import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  reportCategories,
  reportCategoryLabels,
  submitQuestionReport,
  type ReportCategory,
} from "../../lib/reports/reports";
import { Button } from "../ui/Button";

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
  const [succeeded, setSucceeded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef(document.activeElement);
  const submission = useRef<{ payload: string; key: string } | null>(null);

  useEffect(() => {
    const modal = dialog.current;
    const originalTrigger = trigger.current;
    modal?.showModal();
    return () => {
      modal?.close();
      if (originalTrigger instanceof HTMLElement && originalTrigger.isConnected)
        originalTrigger.focus();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const payload = JSON.stringify([sessionId, questionId, category, description]);
      if (submission.current?.payload !== payload)
        submission.current = { payload, key: crypto.randomUUID() };
      const acknowledgement = await submitQuestionReport({
        sessionId,
        questionId,
        category,
        description,
        idempotencyKey: submission.current.key,
      });
      if (!acknowledgement.report_id)
        throw new Error(
          "The report service did not confirm persistence. Retry safely.",
        );
      setSucceeded(true);
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
    <dialog
      ref={dialog}
      className="modal-card"
      aria-labelledby="report-title"
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]",
          ),
        ];
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        if (!submitting) onClose();
      }}
    >
      <h2 id="report-title">Report question</h2>
      <p className="muted">{questionLabel}</p>
      {succeeded ? (
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
          {message && (
            <p className="form-message form-message-error" role="alert">
              {message}
            </p>
          )}
          <label className="field-label">
            Problem type
            <select
              value={category}
              disabled={submitting}
              autoFocus
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
              disabled={submitting}
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
    </dialog>
  );
}
