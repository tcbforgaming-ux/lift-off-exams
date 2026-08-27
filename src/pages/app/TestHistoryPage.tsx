import { useEffect, useState } from "react";

import { Button } from "../../components/ui/Button";
import { ButtonLink } from "../../components/ui/ButtonLink";
import { Card } from "../../components/ui/Card";
import { fetchTestHistory, type HistoryEntry } from "../../lib/sessions/session";

export function TestHistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ activity: string; sessionId: string } | null>(
    null,
  );
  const [hasNext, setHasNext] = useState(false);

  const load = async (append = false) => {
    setLoading(true);
    setMessage(null);
    try {
      const page = await fetchTestHistory({
        pageSize: 12,
        cursorActivityAt: append ? cursor?.activity : null,
        cursorSessionId: append ? cursor?.sessionId : null,
        status: status || null,
      });
      setEntries((existing) => (append ? [...existing, ...page] : page));
      const last = page.at(-1);
      setCursor(
        last ? { activity: last.last_activity_at, sessionId: last.session_id } : null,
      );
      setHasNext(page[0]?.has_next_page ?? false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "History could not load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCursor(null);
    void load(false);
    // Status changes reset pagination.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Saved activity</p>
        <h1>Test History</h1>
        <p>Resume unfinished sessions or reopen server-calculated results.</p>
      </header>

      <div className="history-toolbar">
        <label className="field-label" htmlFor="history-status">
          Status
        </label>
        <select
          id="history-status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="">All sessions</option>
          <option value="in_progress">In progress</option>
          <option value="paused">Paused</option>
          <option value="submitted">Submitted</option>
        </select>
      </div>

      {message && (
        <p className="form-message form-message-error" role="alert">
          {message}
        </p>
      )}
      {loading && entries.length === 0 && <p role="status">Loading history…</p>}
      {!loading && entries.length === 0 && (
        <div className="empty-state">
          <h2>No test sessions yet</h2>
          <p>Generate or open a Test ID to begin.</p>
          <ButtonLink to="/practice/setup">Open Practice Setup</ButtonLink>
        </div>
      )}

      <div className="history-grid">
        {entries.map((entry) => (
          <Card key={entry.session_id} className="history-item">
            <div className="repository-toolbar">
              <p className="eyebrow">{entry.test_id}</p>
              <span className="status-pill">
                {entry.session_status.replace("_", " ")}
              </span>
            </div>
            <h2>{entry.category}</h2>
            <p className="muted">
              {entry.answered_questions} of {entry.question_count} answered
            </p>
            {entry.percentage !== null && (
              <p className="history-score">{entry.percentage.toFixed(2)}%</p>
            )}
            <p className="muted">
              Updated {new Date(entry.last_activity_at).toLocaleString()}
            </p>
            <ButtonLink
              to={
                entry.session_status === "submitted"
                  ? `/results/${entry.session_id}`
                  : `/sessions/${entry.session_id}`
              }
            >
              {entry.session_status === "submitted" ? "View Result" : "Resume Session"}
            </ButtonLink>
          </Card>
        ))}
      </div>

      {hasNext && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => void load(true)}
          disabled={loading}
        >
          {loading ? "Loading…" : "Load More"}
        </Button>
      )}
    </div>
  );
}
