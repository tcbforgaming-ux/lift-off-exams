import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ReportQuestionDialog } from "../../components/reports/ReportQuestionDialog";
import {
  fetchTestSession,
  fetchPracticeSessionSettings,
  fetchPracticeFeedback,
  type PracticeSessionSettings,
  formatDuration,
  parseAnswerOptions,
  pauseSession,
  resumeSession,
  saveSessionAnswer,
  saveSessionPosition,
  submitSession,
  type SessionQuestion,
} from "../../lib/sessions/session";

export function TestSessionPage() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [position, setPosition] = useState(1);
  const [version, setVersion] = useState(0);
  const [status, setStatus] =
    useState<SessionQuestion["session_status"]>("in_progress");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [settings, setSettings] = useState<PracticeSessionSettings | null>(null);
  const [clock, setClock] = useState({ seconds: 0, syncedAt: Date.now() });
  const [now, setNow] = useState(Date.now());
  const [feedback, setFeedback] = useState<{
    correct_option_id: string | null;
    explanation: string | null;
  } | null>(null);

  useEffect(() => {
    let active = true;
    const synchronize = async () => {
      try {
        const next = await fetchPracticeSessionSettings(sessionId);
        if (!active) return;
        setSettings(next);
        setClock({ seconds: next.active_duration_seconds, syncedAt: Date.now() });
        if (next.status === "submitted")
          void navigate(`/results/${sessionId}`, { replace: true });
      } catch (error) {
        if (active)
          setMessage(
            error instanceof Error ? error.message : "Timer could not synchronize.",
          );
      }
    };
    void synchronize();
    const polling = setInterval(() => void synchronize(), 10000);
    const ticking = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      active = false;
      clearInterval(polling);
      clearInterval(ticking);
    };
  }, [sessionId, status, navigate]);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const rows = await fetchTestSession(sessionId);
      setQuestions(rows);
      setPosition(rows[0]?.current_position ?? 1);
      setVersion(rows[0]?.session_version ?? 0);
      setStatus(rows[0]?.session_status ?? "in_progress");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Session could not load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // sessionId is the stable route identity for this lifecycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const current = useMemo(
    () => questions.find((question) => question.question_position === position),
    [position, questions],
  );
  const answered = questions.filter((question) => question.selected_option_id).length;
  const elapsed = settings
    ? clock.seconds +
      (status === "in_progress"
        ? Math.max(0, Math.floor((now - clock.syncedAt) / 1000))
        : 0)
    : (current?.active_duration_seconds ?? 0);
  const expired = settings?.timer_seconds != null && elapsed >= settings.timer_seconds;

  useEffect(() => {
    let active = true;
    setFeedback(null);
    if (
      current?.selected_option_id &&
      (settings?.show_answers || settings?.show_explanations)
    ) {
      void fetchPracticeFeedback(sessionId, current.question_id)
        .then((value) => {
          if (active) setFeedback(value);
        })
        .catch((error: unknown) => {
          if (active)
            setMessage(
              error instanceof Error ? error.message : "Feedback could not load.",
            );
        });
    }
    return () => {
      active = false;
    };
  }, [
    sessionId,
    current?.question_id,
    current?.selected_option_id,
    settings?.show_answers,
    settings?.show_explanations,
  ]);

  const goTo = async (nextPosition: number) => {
    if (nextPosition === position || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const nextVersion = await saveSessionPosition(sessionId, nextPosition, version);
      setVersion(nextVersion);
      setPosition(nextPosition);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Position could not save.");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const selectAnswer = async (optionId: string) => {
    if (!current || status !== "in_progress" || saving) return;
    setSaving(true);
    setMessage("Saving answer…");
    try {
      const acknowledgement = await saveSessionAnswer({
        sessionId,
        questionId: current.question_id,
        selectedOptionId: optionId,
        expectedVersion: version,
      });
      setVersion(acknowledgement.session_version);
      setQuestions((existing) =>
        existing.map((question) =>
          question.question_id === current.question_id
            ? { ...question, selected_option_id: optionId }
            : question,
        ),
      );
      setMessage("Answer saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Answer could not save.");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const pause = async () => {
    setSaving(true);
    try {
      const nextVersion = await pauseSession(sessionId, version);
      setVersion(nextVersion);
      setStatus("paused");
      setMessage("Session paused. Your answers are saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Session could not pause.");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const resume = async () => {
    setSaving(true);
    try {
      const nextVersion = await resumeSession(sessionId, version);
      setVersion(nextVersion);
      setStatus("in_progress");
      setMessage("Session resumed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Session could not resume.");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    setSaving(true);
    setMessage("Submitting and calculating your result…");
    try {
      await submitSession(sessionId, version);
      void navigate(`/results/${sessionId}`, { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Session could not submit.");
      setConfirmingSubmit(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p role="status">Loading your saved session…</p>;

  if (!current) {
    return (
      <Card>
        <h1>Session unavailable</h1>
        <p role="alert">{message ?? "This session could not be opened."}</p>
      </Card>
    );
  }

  const options = parseAnswerOptions(current.options);

  return (
    <div className="page-stack test-session-page">
      <header className="session-toolbar">
        <div>
          <p className="eyebrow">Test ID {current.test_id}</p>
          <h1>
            Question {position} of {questions.length}
          </h1>
        </div>
        <dl className="session-metrics">
          <div>
            <dt>Progress</dt>
            <dd>
              {answered}/{questions.length}
            </dd>
          </div>
          <div>
            <dt>
              {settings?.timer_seconds != null ? "Time remaining" : "Active time"}
            </dt>
            <dd>
              {formatDuration(
                settings?.timer_seconds != null
                  ? settings.timer_seconds - elapsed
                  : elapsed,
              )}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{status.replace("_", " ")}</dd>
          </div>
        </dl>
      </header>

      {message && (
        <p
          className="form-message form-message-success"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      )}

      {status === "paused" && (
        <div className="paused-banner" role="status">
          <div>
            <strong>This session is paused.</strong>
            <span> Resume it before changing answers.</span>
          </div>
          <Button type="button" onClick={() => void resume()} disabled={saving}>
            Resume Session
          </Button>
        </div>
      )}

      <div className="test-workspace">
        <main className="question-panel" aria-labelledby="question-heading">
          <div className="question-meta">
            <span>{current.difficulty}</span>
            <span>{current.question_type}</span>
          </div>
          <h2 id="question-heading">{current.question_text}</h2>
          <fieldset
            className="answer-list"
            disabled={status !== "in_progress" || saving || expired}
          >
            <legend>Select one answer</legend>
            {options.map((option) => (
              <label
                key={option.id}
                className={
                  current.selected_option_id === option.id
                    ? "answer-option answer-option-selected"
                    : "answer-option"
                }
              >
                <input
                  type="radio"
                  name={`answer-${current.question_id}`}
                  value={option.id}
                  checked={current.selected_option_id === option.id}
                  onChange={() => void selectAnswer(option.id)}
                />
                <strong>{option.id}</strong>
                <span>{option.text}</span>
              </label>
            ))}
          </fieldset>
          {feedback && (
            <section className="practice-feedback" aria-label="Study feedback">
              {feedback.correct_option_id && (
                <p>
                  <strong>Correct answer: {feedback.correct_option_id}</strong>
                </p>
              )}
              {feedback.explanation && <p>{feedback.explanation}</p>}
            </section>
          )}

          <div className="session-navigation">
            <Button
              type="button"
              variant="secondary"
              disabled={position === 1 || saving}
              onClick={() => void goTo(position - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={position === questions.length || saving}
              onClick={() => void goTo(position + 1)}
            >
              Next
            </Button>
            <Button type="button" variant="ghost" onClick={() => setReporting(true)}>
              Report Question
            </Button>
          </div>
        </main>

        <aside className="question-map" aria-label="Question navigation">
          <div className="question-map-grid">
            {questions.map((question) => (
              <button
                type="button"
                key={question.question_id}
                className={`${question.question_position === position ? "current" : ""} ${question.selected_option_id ? "answered" : ""}`}
                aria-label={`Question ${question.question_position}${question.selected_option_id ? ", answered" : ", unanswered"}`}
                aria-current={
                  question.question_position === position ? "step" : undefined
                }
                onClick={() => void goTo(question.question_position)}
                disabled={saving}
              >
                {question.question_position}
              </button>
            ))}
          </div>
          <div className="session-actions">
            {status === "in_progress" && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void pause()}
                disabled={saving}
              >
                Pause
              </Button>
            )}
            <Button
              type="button"
              onClick={() => setConfirmingSubmit(true)}
              disabled={saving || status !== "in_progress"}
            >
              Submit Test
            </Button>
          </div>
        </aside>
      </div>

      {confirmingSubmit && (
        <div className="modal-backdrop" role="presentation">
          <Card
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-title"
          >
            <h2 id="submit-title">Submit this test?</h2>
            <p>
              {questions.length - answered} unanswered question
              {questions.length - answered === 1 ? " remains" : "s remain"}. Unanswered
              questions score as incorrect.
            </p>
            <div className="button-row">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmingSubmit(false)}
                disabled={saving}
              >
                Keep Working
              </Button>
              <Button type="button" onClick={() => void submit()} disabled={saving}>
                {saving ? "Submitting…" : "Submit Test"}
              </Button>
            </div>
          </Card>
        </div>
      )}
      {reporting && (
        <ReportQuestionDialog
          sessionId={sessionId}
          questionId={current.question_id}
          questionLabel={`Question ${current.question_position}: ${current.question_text}`}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  );
}
