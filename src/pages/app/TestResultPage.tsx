import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { ButtonLink } from "../../components/ui/ButtonLink";
import { Card } from "../../components/ui/Card";
import {
  fetchTestResult,
  formatDuration,
  parseAnswerOptions,
  type SessionResultItem,
} from "../../lib/sessions/session";

export function TestResultPage() {
  const { sessionId = "" } = useParams();
  const [items, setItems] = useState<SessionResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchTestResult(sessionId)
      .then((result) => {
        if (active) setItems(result);
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
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Submitted result · {summary.test_id}</p>
        <h1>{summary.percentage.toFixed(2)}%</h1>
        <p>
          Your score is calculated and stored by the server. Incorrect and unanswered
          questions appear first below.
        </p>
      </header>

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
                  <dd>{selected ? `${selected.id}. ${selected.text}` : "No answer"}</dd>
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
    </div>
  );
}
