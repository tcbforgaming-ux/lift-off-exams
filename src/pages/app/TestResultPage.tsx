import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { ButtonLink } from "../../components/ui/ButtonLink";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { TestExportControls } from "../../components/ui/TestExportControls";
import { ReportQuestionDialog } from "../../components/reports/ReportQuestionDialog";
import { summarizeResult } from "../../lib/sessions/resultSummaries";
import {
  fetchTestResult,
  fetchPracticeSessionSettings,
  formatDuration,
  parseAnswerOptions,
  type SessionResultItem,
} from "../../lib/sessions/session";

export function TestResultPage() {
  const { sessionId = "" } = useParams();
  const [items, setItems] = useState<SessionResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [reporting, setReporting] = useState<SessionResultItem | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchTestResult(sessionId), fetchPracticeSessionSettings(sessionId)])
      .then(([result, settings]) => {
        if (active) setItems(result.map((item) => ({ ...item, mode: settings.mode })));
      })
      .catch((error: unknown) => {
        if (active)
          setMessage(error instanceof Error ? error.message : "Result could not load.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionId]);

  if (loading) return <p role="status">Loading your result…</p>;
  const summary = items[0];
  if (!summary)
    return (
      <Card>
        <h1>Result unavailable</h1>
        <p role="alert">{message ?? "This result could not be opened."}</p>
      </Card>
    );

  const ordered = [...items].sort((a, b) => {
    if (a.is_correct !== b.is_correct) return a.is_correct ? 1 : -1;
    return a.question_position - b.question_position;
  });

  return (
    <div className="page-stack result-page">
      <header className="page-header">
        <p className="eyebrow">
          Submitted {summary.mode === "Quiz" ? "Quiz " : ""}result · {summary.test_id}
        </p>
        <h1>{summary.percentage.toFixed(2)}%</h1>
        <p>
          Your score is calculated and stored by the server. Incorrect and unanswered
          questions appear first below.
        </p>
      </header>
      {summary.mode !== "Quiz" && (
        <TestExportControls key={sessionId} kind="result" session={sessionId} />
      )}

      <dl className="result-summary">
        <div>
          <dt>Correct</dt>
          <dd>{summary.correct_answers}</dd>
        </div>
        <div>
          <dt>Incorrect</dt>
          <dd>{summary.incorrect_answers}</dd>
        </div>
        <div>
          <dt>Unanswered</dt>
          <dd>{summary.unanswered_questions}</dd>
        </div>
        <div>
          <dt>Active time</dt>
          <dd>{formatDuration(summary.active_duration_seconds)}</dd>
        </div>
      </dl>
      {(["topic", "difficulty"] as const).map((dimension) => (
        <section key={dimension} aria-label={`${dimension} performance`}>
          <h2>
            {dimension === "topic" ? "Topic performance" : "Difficulty performance"}
          </h2>
          {dimension === "topic" && (
            <p>
              Topic groups may overlap. Each question counts once within each topic;
              group totals must not be added together. Unanswered and I Don't Know
              responses count as incorrect.
            </p>
          )}
          <table className="repository-table">
            <thead>
              <tr>
                <th>{dimension === "topic" ? "Topic" : "Difficulty"}</th>
                <th>Correct</th>
                <th>Accuracy</th>
                <th>Questions</th>
              </tr>
            </thead>
            <tbody>
              {summarizeResult(items, dimension).map((group) => (
                <tr key={group.label}>
                  <th scope="row">{group.label}</th>
                  <td>
                    {group.correct} / {group.total}
                  </td>
                  <td>{((100 * group.correct) / group.total).toFixed(2)}%</td>
                  <td>
                    <details>
                      <summary>{group.total} questions</summary>
                      {group.questionIds.map((id) => (
                        <a key={id} href={`#result-${id}`}>
                          {
                            items.find((item) => item.question_id === id)
                              ?.question_position
                          }{" "}
                        </a>
                      ))}
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {!summary.can_view_explanations && (
        <p className="form-message form-message-success" role="status">
          Correct answers are included. Explanations are available with an active
          premium subscription.
        </p>
      )}

      <div className="result-list">
        {ordered.map((item) => {
          const options = parseAnswerOptions(item.options);
          const selected = options.find(
            (option) => option.id === item.selected_option_id,
          );
          const correct = options.find(
            (option) => option.id === item.correct_option_id,
          );
          return (
            <Card
              key={item.question_id}
              id={`result-${item.question_id}`}
              className={
                item.is_correct
                  ? "result-item result-correct"
                  : "result-item result-incorrect"
              }
            >
              <div className="repository-toolbar">
                <p className="eyebrow">Question {item.question_position}</p>
                <span className="status-pill">
                  {item.is_correct
                    ? "Correct"
                    : item.selected_option_id
                      ? "Incorrect"
                      : "Unanswered"}
                </span>
              </div>
              <h2>{item.question_text}</h2>
              <dl className="review-answers">
                <div>
                  <dt>Your answer</dt>
                  <dd>
                    {item.selected_option_id === "UNKNOWN"
                      ? "I Don't Know"
                      : selected
                        ? `${selected.id}. ${selected.text}`
                        : "No answer"}
                  </dd>
                </div>
                <div>
                  <dt>Correct answer</dt>
                  <dd>
                    {correct
                      ? `${correct.id}. ${correct.text}`
                      : item.correct_option_id}
                  </dd>
                </div>
              </dl>
              {item.explanation !== undefined && (
                <div className="explanation-panel">
                  <strong>Explanation</strong>
                  <p>{item.explanation || "No explanation is available."}</p>
                </div>
              )}
              <div className="button-row">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setReporting(item)}
                >
                  Report Question
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="button-row">
        <ButtonLink to="/history">Back to History</ButtonLink>
        <ButtonLink to={`/test-id?code=${summary.test_id}`} variant="secondary">
          Retake Test ID
        </ButtonLink>
      </div>
      {reporting && (
        <ReportQuestionDialog
          sessionId={sessionId}
          questionId={reporting.question_id}
          questionLabel={`Question ${reporting.question_position}: ${reporting.question_text}`}
          onClose={() => setReporting(null)}
        />
      )}
    </div>
  );
}
