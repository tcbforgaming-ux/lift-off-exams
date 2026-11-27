import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { moderationRpc } from "../../lib/auth/moderation";
import { useParams } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { parseAnswerOptions } from "../../lib/sessions/session";
import {
  correctReportedQuestion,
  fetchReportDetail,
  reportCategoryLabels,
  resolveReportLifecycle,
  transitionQuestionReport,
  type ReportDetail,
} from "../../lib/reports/reports";

const partitions = [
  "Business Administration Core",
  "Marketing",
  "Finance",
  "Business Management and Administration",
  "Hospitality and Tourism",
  "Entrepreneurship",
];

function questionTypeCode(value: string) {
  if (["S", "D", "F", "A"].includes(value)) return value;
  if (value === "Scenario") return "S";
  if (value === "Definition") return "D";
  if (value === "Fill In The Blank") return "F";
  return "A";
}

function difficultyCode(value: string) {
  if (["E", "M", "H"].includes(value)) return value;
  return value === "Easy" ? "E" : value === "Medium" ? "M" : "H";
}

export function ReportDetailPage() {
  const { reportId = "" } = useParams();
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("Administrative review of reported question");
  const [resolution, setResolution] = useState(
    "The report was reviewed by the content team.",
  );
  const [duplicateOf, setDuplicateOf] = useState("");
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState("A");
  const [explanation, setExplanation] = useState("");
  const [indicator, setIndicator] = useState("");
  const [partition, setPartition] = useState(partitions[0]);
  const [questionType, setQuestionType] = useState("S");
  const [difficulty, setDifficulty] = useState("E");
  const [tags, setTags] = useState("");
  const actionKey = useRef<{ signature: string; key: string } | null>(null);
  function disposition(value: string) {
    if (!detail) return;
    const args = {
      p_id: detail.report_id,
      p_version: detail.report_version,
      p_disposition: value,
      p_reason: reason,
      p_message: resolution,
    };
    const signature = JSON.stringify(args);
    if (actionKey.current?.signature !== signature)
      actionKey.current = { signature, key: crypto.randomUUID() };
    const key = actionKey.current.key;
    void run(
      () => moderationRpc("act_on_question_report", { ...args, p_key: key }),
      "Report disposition saved.",
    );
  }

  const terminal = detail
    ? ["resolved", "rejected", "duplicate"].includes(detail.report_status)
    : false;

  const load = async () => {
    setMessage("");
    try {
      const next = await fetchReportDetail(reportId);
      setDetail(next);
      setQuestionText(next.question_text);
      setOptions(parseAnswerOptions(next.options).map((option) => option.text));
      setCorrectOption(next.correct_option_id);
      setExplanation(next.explanation);
      setIndicator(next.performance_indicator);
      setPartition(next.partition_key);
      setQuestionType(questionTypeCode(next.question_type));
      setDifficulty(difficultyCode(next.difficulty));
      setTags(next.tags.join(", "));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Report could not load.");
    }
  };

  useEffect(() => {
    void load();
    // reportId is the stable route identity for this lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  const encountered = useMemo(() => detail?.encountered_snapshot ?? {}, [detail]);

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      await load();
      setMessage(success);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The action could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  function transition(
    newStatus: "in_review" | "resolved" | "rejected" | "duplicate",
    category?: string,
  ) {
    if (!detail) return;
    void run(
      () =>
        transitionQuestionReport({
          reportId: detail.report_id,
          expectedVersion: detail.report_version,
          newStatus,
          resolutionCategory: category,
          resolutionMessage: newStatus === "in_review" ? null : resolution,
          duplicateOf: newStatus === "duplicate" ? duplicateOf : null,
          reason,
          idempotencyKey: crypto.randomUUID(),
        }),
      "Report status updated.",
    );
  }

  function submitCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    void run(
      () =>
        correctReportedQuestion({
          detail,
          questionText,
          options,
          correctOptionId: correctOption,
          explanation,
          performanceIndicator: indicator,
          partitionKey: partition,
          questionType,
          difficulty,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          reason,
          resolutionMessage: resolution,
          idempotencyKey: crypto.randomUUID(),
        }),
      "Question corrected and report resolved.",
    );
  }

  if (!detail)
    return (
      <Card>
        <h1>Report review</h1>
        <p role={message ? "alert" : "status"}>{message || "Loading report…"}</p>
      </Card>
    );

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Question report · {detail.report_id}</p>
        <h1>{reportCategoryLabels[detail.category]}</h1>
        <p>{detail.description}</p>
      </header>
      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}
      <div className="report-review-grid">
        <Card>
          <div className="repository-toolbar">
            <h2>Review context</h2>
            <span className={`status-pill status-${detail.report_status}`}>
              {detail.report_status.replace("_", " ")}
            </span>
          </div>
          <dl className="review-answers">
            <div>
              <dt>Reporter</dt>
              <dd>{detail.reporter_email ?? "Unavailable"}</dd>
            </div>
            <div>
              <dt>Test ID</dt>
              <dd>{detail.test_id}</dd>
            </div>
            <div>
              <dt>Question status</dt>
              <dd>{detail.lifecycle_state}</dd>
            </div>
          </dl>
          <h3>Encountered question snapshot</h3>
          <p>
            {typeof encountered.question_text === "string"
              ? encountered.question_text
              : "Snapshot unavailable"}
          </p>
          {detail.resolution_message && (
            <div className="explanation-panel">
              <strong>Resolution</strong>
              <p>{detail.resolution_message}</p>
            </div>
          )}
        </Card>
        <Card>
          <h2>Review action</h2>
          <label className="field-label">
            Internal reason
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              minLength={5}
            />
          </label>
          <label className="field-label">
            Message to reporter
            <textarea
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              minLength={5}
            />
          </label>
          {!terminal && (
            <div className="button-row report-action-row">
              {["valid", "work_in_progress", "fixed", "invalid", "spam"].map(
                (value) => (
                  <Button
                    key={value}
                    variant="secondary"
                    disabled={
                      busy || reason.trim().length < 5 || resolution.trim().length < 5
                    }
                    onClick={() => disposition(value)}
                  >
                    {
                      (
                        {
                          valid: "Valid",
                          work_in_progress: "Work In Progress",
                          fixed: "Fixed",
                          invalid: "Invalid",
                          spam: "Spam",
                        } as Record<string, string>
                      )[value]
                    }
                  </Button>
                ),
              )}
              {detail.report_status === "open" && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => transition("in_review")}
                >
                  Begin Review
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => transition("resolved", "no_change")}
              >
                Resolve: No Change
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => transition("rejected", "not_an_issue")}
              >
                Reject
              </Button>
            </div>
          )}
          {!terminal && (
            <div className="duplicate-action">
              <label className="field-label">
                Primary report ID
                <input
                  value={duplicateOf}
                  onChange={(event) => setDuplicateOf(event.target.value)}
                />
              </label>
              <Button
                type="button"
                variant="secondary"
                disabled={busy || !duplicateOf}
                onClick={() => transition("duplicate", "duplicate")}
              >
                Mark Duplicate
              </Button>
            </div>
          )}
          {!terminal && (
            <div className="button-row report-action-row">
              <Button
                type="button"
                variant="secondary"
                disabled={busy || detail.lifecycle_state === "Retired"}
                onClick={() =>
                  void run(
                    () =>
                      resolveReportLifecycle({
                        detail,
                        lifecycleState: "Retired",
                        reason,
                        resolutionMessage: resolution,
                        idempotencyKey: crypto.randomUUID(),
                      }),
                    "Question retired and report resolved.",
                  )
                }
              >
                Retire Question
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={busy || detail.lifecycle_state === "Active"}
                onClick={() =>
                  void run(
                    () =>
                      resolveReportLifecycle({
                        detail,
                        lifecycleState: "Active",
                        reason,
                        resolutionMessage: resolution,
                        idempotencyKey: crypto.randomUUID(),
                      }),
                    "Question restored and report resolved.",
                  )
                }
              >
                Restore Question
              </Button>
            </div>
          )}
        </Card>
      </div>
      <Card>
        <h2>Correct question</h2>
        <form
          className="question-correction-form"
          onSubmit={(event) => submitCorrection(event)}
        >
          <label className="field-label field-wide">
            Question text
            <textarea
              value={questionText}
              onChange={(event) => setQuestionText(event.target.value)}
              required
            />
          </label>
          {options.map((option, index) => (
            <label key={index} className="field-label">
              Option {String.fromCharCode(65 + index)}
              <textarea
                value={option}
                onChange={(event) =>
                  setOptions((current) =>
                    current.map((value, optionIndex) =>
                      optionIndex === index ? event.target.value : value,
                    ),
                  )
                }
                required
              />
            </label>
          ))}
          <label className="field-label">
            Correct option
            <select
              value={correctOption}
              onChange={(event) => setCorrectOption(event.target.value)}
            >
              {["A", "B", "C", "D"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Question type
            <select
              value={questionType}
              onChange={(event) => setQuestionType(event.target.value)}
            >
              <option value="S">Scenario</option>
              <option value="D">Definition</option>
              <option value="F">Fill in the Blank</option>
              <option value="A">All Except</option>
            </select>
          </label>
          <label className="field-label">
            Difficulty
            <select
              value={difficulty}
              onChange={(event) => setDifficulty(event.target.value)}
            >
              <option value="E">Easy</option>
              <option value="M">Medium</option>
              <option value="H">Hard</option>
            </select>
          </label>
          <label className="field-label">
            Category
            <select
              value={partition}
              onChange={(event) => setPartition(event.target.value)}
            >
              {partitions.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Performance indicator
            <input
              value={indicator}
              onChange={(event) => setIndicator(event.target.value)}
              required
            />
          </label>
          <label className="field-label">
            Topic tags, comma-separated
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              required
            />
          </label>
          <label className="field-label field-wide">
            Explanation
            <textarea
              value={explanation}
              onChange={(event) => setExplanation(event.target.value)}
              required
            />
          </label>
          <div className="field-wide">
            <Button type="submit" disabled={busy || terminal}>
              {terminal
                ? "Report finalized"
                : busy
                  ? "Saving…"
                  : "Save Correction and Resolve"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
