import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { parseAnswerOptions } from "../../lib/sessions/session";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";

type Question = { text: string; options: unknown; difficulty: string };
type Run = {
  id: string;
  cap: number;
  allow_unknown: boolean;
  strikes: number;
  committed: number;
  correct: number | null;
  finished_at: string | null;
  created_at: string;
  question: Question | null;
};
type Review = {
  position: number;
  response: string;
  question: Question & { answer: string; explanation?: string };
};

async function rpc<T>(name: string, args: Record<string, unknown>) {
  const client = getSupabaseBrowserClient() as unknown as {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{
      data: unknown;
      error: { message: string } | null;
    }>;
  };
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export function HardcorePage() {
  const [params, setParams] = useSearchParams();
  const id = params.get("run");
  const history = params.has("history");
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Hardcore</h1>
      </header>
      <nav className="button-row">
        <Link to="/hardcore">Setup</Link>
        <Link to="/hardcore?history=1">Hardcore History</Link>
      </nav>
      <HardcoreContent
        key={id ?? String(history)}
        id={id}
        history={history}
        open={(run) => setParams({ run })}
      />
    </div>
  );
}

function HardcoreContent({
  id,
  history,
  open,
}: {
  id: string | null;
  history: boolean;
  open: (id: string) => void;
}) {
  const [cap, setCap] = useState(1);
  const [unknown, setUnknown] = useState(true);
  const [run, setRun] = useState<Run>();
  const [entries, setEntries] = useState<Run[]>([]);
  const [moreHistory, setMoreHistory] = useState(false);
  const [review, setReview] = useState<Review[]>();
  const [moreReview, setMoreReview] = useState(false);
  const [explanations, setExplanations] = useState(false);
  const [selection, setSelection] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const launchId = useRef<string | null>(null);
  const action = useRef<{ id: string; response: string } | null>(null);

  useEffect(() => {
    let live = true;
    if (id)
      void rpc<Run>("get_hardcore", { p_run: id })
        .then((result) => {
          if (live) setRun(result);
        })
        .catch((cause: Error) => {
          if (live) setError(cause.message);
        });
    else if (history)
      void rpc<Run[]>("list_hardcore", {})
        .then((result) => {
          if (live) {
            setEntries(result);
            setMoreHistory(result.length === 12);
          }
        })
        .catch((cause: Error) => {
          if (live) setError(cause.message);
        });
    return () => {
      live = false;
    };
  }, [id, history]);

  async function perform(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError("");
    try {
      await work();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed.");
    } finally {
      lock.current = false;
      setPending(false);
    }
  }

  function loadReview(show: boolean, append = false) {
    void perform(async () => {
      const rows = await rpc<Review[]>("review_hardcore", {
        p_run: id,
        p_after: append ? (review?.at(-1)?.position ?? 0) : 0,
        p_explanations: show,
      });
      setExplanations(show);
      setReview(append ? [...(review ?? []), ...rows] : rows);
      setMoreReview(rows.length === 20);
    });
  }

  return (
    <>
      {error && <p role="alert">{error}</p>}
      {!id && !history && (
        <>
          <label>
            Strike cap{" "}
            <select
              value={cap}
              disabled={pending}
              onChange={(e) => {
                setCap(Number(e.target.value));
                launchId.current = null;
              }}
            >
              <option value={1}>1</option>
              <option value={2}>2 (Premium)</option>
              <option value={3}>3 (Premium)</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={unknown}
              disabled={pending}
              onChange={(e) => {
                setUnknown(e.target.checked);
                launchId.current = null;
              }}
            />{" "}
            Allow I Don’t Know
          </label>
          <p>Untimed · Medium and Hard · Misses count when you press Next.</p>
          <Button
            disabled={pending}
            onClick={() =>
              void perform(async () => {
                launchId.current ??= crypto.randomUUID();
                const result = await rpc<Run>("start_hardcore", {
                  p_request: launchId.current,
                  p_cap: cap,
                  p_allow_unknown: unknown,
                });
                open(result.id);
              })
            }
          >
            Start Hardcore
          </Button>
        </>
      )}
      {history && (
        <>
          <h2>Hardcore History</h2>
          <ul>
            {entries.map((entry) => (
              <li key={entry.id}>
                <Link to={`/hardcore?run=${entry.id}`}>
                  {entry.finished_at
                    ? `Finished: ${entry.correct}/${entry.committed} correct`
                    : `Resume: ${entry.strikes}/${entry.cap} strikes`}
                </Link>
              </li>
            ))}
          </ul>
          {moreHistory && (
            <Button
              disabled={pending}
              onClick={() =>
                void perform(async () => {
                  const last = entries.at(-1);
                  const rows = await rpc<Run[]>("list_hardcore", {
                    p_before: last?.created_at,
                    p_before_id: last?.id,
                  });
                  setEntries([...entries, ...rows]);
                  setMoreHistory(rows.length === 12);
                })
              }
            >
              Load more runs
            </Button>
          )}
        </>
      )}
      {id && !run && !error && <p role="status">Loading run…</p>}
      {run?.question && !run.finished_at && (
        <>
          <p role="status">
            Strikes: {run.strikes}/{run.cap} · Question {run.committed + 1}
          </p>
          <fieldset key={run.committed} disabled={pending || !!action.current}>
            <legend>{run.question.text}</legend>
            {parseAnswerOptions(run.question.options).map((option) => (
              <div key={option.id}>
                <label>
                  <input
                    type="radio"
                    name="answer"
                    checked={selection === option.id}
                    onChange={() => setSelection(option.id)}
                  />{" "}
                  {option.text}
                </label>
              </div>
            ))}
            {run.allow_unknown && (
              <label>
                <input
                  type="radio"
                  name="answer"
                  checked={selection === "UNKNOWN"}
                  onChange={() => setSelection("UNKNOWN")}
                />{" "}
                I Don’t Know
              </label>
            )}
          </fieldset>
          <div className="button-row">
            <Button
              disabled={!selection || pending}
              onClick={() =>
                void perform(async () => {
                  action.current ??= { id: crypto.randomUUID(), response: selection };
                  const result = await rpc<Run>("advance_hardcore", {
                    p_run: run.id,
                    p_position: run.committed + 1,
                    p_request: action.current.id,
                    p_response: action.current.response,
                  });
                  action.current = null;
                  setRun(result);
                  setSelection("");
                })
              }
            >
              {action.current && error ? "Retry Next" : "Next"}
            </Button>
            <Link to="/hardcore?history=1">Exit run</Link>
          </div>
        </>
      )}
      {run?.finished_at && (
        <>
          <h2>Run ended</h2>
          <p>
            Strike limit reached: {run.strikes}/{run.cap}
          </p>
          <p>
            {run.correct} of {run.committed} correct
          </p>
          {!review && (
            <Button disabled={pending} onClick={() => loadReview(false)}>
              Review answers
            </Button>
          )}
          {review && (
            <>
              <label>
                <input
                  type="checkbox"
                  checked={explanations}
                  disabled={pending}
                  onChange={(e) => loadReview(e.target.checked)}
                />{" "}
                Show Premium explanations
              </label>
              <ol>
                {review.map(({ position, question, response }) => (
                  <li key={position}>
                    <p>{question.text}</p>
                    <p>
                      Your answer: {response === "UNKNOWN" ? "I Don’t Know" : response}{" "}
                      · Correct: {question.answer}
                    </p>
                    {question.explanation && <p>{question.explanation}</p>}
                  </li>
                ))}
              </ol>
              {moreReview && (
                <Button
                  disabled={pending}
                  onClick={() => loadReview(explanations, true)}
                >
                  Load more answers
                </Button>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
