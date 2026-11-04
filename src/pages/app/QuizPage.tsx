import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { startQuiz } from "../../lib/sessions/session";

export function QuizPage() {
  const navigate = useNavigate();
  const request = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function launch() {
    setPending(true);
    setError("");
    try {
      request.current ??= crypto.randomUUID();
      const result = await startQuiz(request.current);
      void navigate(
        result.status === "submitted"
          ? `/results/${result.session_id}`
          : `/sessions/${result.session_id}`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Quiz could not start.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Quiz</h1>
      </header>
      <dl className="grid two-column">
        <div>
          <dt>Questions</dt>
          <dd>20</dd>
        </div>
        <div>
          <dt>Time limit</dt>
          <dd>None</dd>
        </div>
      </dl>
      <div className="button-row">
        <Button type="button" disabled={pending} onClick={() => void launch()}>
          {pending ? "Starting Quiz…" : "Start Quiz"}
        </Button>
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
