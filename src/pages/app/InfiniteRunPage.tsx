import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { parseAnswerOptions } from "../../lib/sessions/session";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";

type Question = { text: string; options: unknown };
type FocusSetup = {
  eligible: boolean;
  topics: { topic: string; answered: number; correct: number }[];
};
type Run = {
  id: string;
  paid: boolean;
  question: Question | null;
  answered: number;
  correct: number;
  uncertain: number;
  streak: number;
  best: number;
  last_correct?: boolean;
  finished_at: string | null;
  created_at: string;
  mode?: "standard" | "weak";
  focus_topics?: string[];
  selection_mode?: "standard" | "weak" | null;
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

export function InfiniteRunPage() {
  const [params, setParams] = useSearchParams();
  const id = params.get("run");
  const history = params.has("history");
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Infinite Run</h1>
      </header>
      <nav className="button-row">
        <Link to="/infinite-run">Setup</Link>
        <Link to="/infinite-run?history=1">Infinite Run History</Link>
      </nav>
      <RunContent
        key={id ?? String(history)}
        id={id}
        history={history}
        open={(run) => setParams({ run })}
      />
    </div>
  );
}

function RunContent({
  id,
  history,
  open,
}: {
  id: string | null;
  history: boolean;
  open: (run: string) => void;
}) {
  const [run, setRun] = useState<Run>();
  const [entries, setEntries] = useState<Run[]>();
  const [review, setReview] = useState<Review[]>();
  const [more, setMore] = useState(false);
  const [show, setShow] = useState(false);
  const [selection, setSelection] = useState("");
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [tags, setTags] = useState("");
  const [mode, setMode] = useState<"standard" | "weak">("standard");
  const [focus, setFocus] = useState<FocusSetup>();
  const [focusError, setFocusError] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const request = useRef<string | null>(null);
  const action = useRef<{ id: string; response: string } | null>(null);

  useEffect(() => {
    let live = true;
    async function load() {
      try {
        if (id) {
          const row = await rpc<Run>("get_infinite_run", { p_run: id });
          if (live) setRun(row);
        } else if (history) {
          const rows = await rpc<Run[]>("list_infinite_runs", {});
          if (live) {
            setEntries(rows);
            setMore(rows.length === 12);
          }
        } else {
          const setup = await rpc<FocusSetup>("get_infinite_focus_setup", {});
          if (live) setFocus(setup);
        }
      } catch (cause) {
        if (live && !id && !history) setFocusError(true);
        else if (live)
          setError(
            cause instanceof Error ? cause.message : "Could not load Infinite Run.",
          );
      }
    }
    void load();
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

  function loadReview(explanations: boolean, append = false) {
    void perform(async () => {
      const rows = await rpc<Review[]>("review_infinite_run", {
        p_run: id,
        p_after: append ? (review?.at(-1)?.position ?? 0) : 0,
        p_explanations: explanations,
      });
      setShow(explanations);
      setReview(append ? [...(review ?? []), ...rows] : rows);
      setMore(rows.length === 20);
    });
  }

  return (
    <>
      {error && <p role="alert">{error}</p>}
      {!id && !history && (
        <>
          <fieldset className="form-stack" disabled={pending}>
            <legend>Question selection</legend>
            <label>
              <input
                type="radio"
                name="infinite-mode"
                checked={mode === "standard"}
                onChange={() => {
                  setMode("standard");
                  request.current = null;
                }}
              />{" "}
              Standard Infinite Run
            </label>
            <label>
              <input
                type="radio"
                name="infinite-mode"
                checked={mode === "weak"}
                disabled={!focus?.eligible || focus.topics.length === 0}
                aria-describedby="infinite-focus-detail"
                onChange={() => {
                  setMode("weak");
                  request.current = null;
                }}
              />{" "}
              Weak Area Focus
            </label>
            <div id="infinite-focus-detail">
              {focusError ? (
                <p role="status">
                  Weak Area Focus is unavailable. Standard Infinite Run is still an
                  option.
                </p>
              ) : !focus ? (
                <p role="status">Checking Weak Area Focus…</p>
              ) : !focus.eligible ? (
                <p>Premium access is required for Infinite Run.</p>
              ) : (
                <>
                  <p>
                    Uses your latest graded answer per question across activity. A topic
                    needs at least eight distinct answers and below 70% accuracy.
                  </p>
                  {focus.topics.length === 0 ? (
                    <p role="status">
                      <strong>Insufficient Data.</strong> Choose Standard Infinite Run
                      or answer more questions.
                    </p>
                  ) : mode === "weak" ? (
                    <ul aria-label="Ranked weak topics">
                      {focus.topics.map((t) => (
                        <li key={t.topic}>
                          {t.topic}: {t.correct}/{t.answered} correct
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </>
              )}
            </div>
          </fieldset>
          <label>
            Category{" "}
            <select
              value={category}
              disabled={pending}
              onChange={(e) => {
                setCategory(e.target.value);
                request.current = null;
              }}
            >
              {[
                "",
                "Marketing",
                "Finance",
                "Business Management and Administration",
                "Hospitality and Tourism",
                "Entrepreneurship",
                "Business Administration Core",
              ].map((value) => (
                <option key={value} value={value}>
                  {value || "All categories"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Difficulty preference{" "}
            <select
              value={difficulty}
              disabled={pending}
              onChange={(e) => {
                setDifficulty(e.target.value);
                request.current = null;
              }}
            >
              {["", "Easy", "Medium", "Hard"].map((value) => (
                <option key={value} value={value}>
                  {value || "Any difficulty"}
                </option>
              ))}
            </select>
          </label>
          <label>
            Preferred topics{" "}
            <input
              value={tags}
              disabled={pending}
              onChange={(e) => {
                setTags(e.target.value);
                request.current = null;
              }}
              placeholder="Business Law, Finance"
            />
          </label>
          <Button
            disabled={pending}
            onClick={() =>
              void perform(async () => {
                request.current ??= crypto.randomUUID();
                const row = await rpc<Run>(
                  mode === "weak" ? "start_infinite_run_focused" : "start_infinite_run",
                  {
                    p_request: request.current,
                    p_category: category || null,
                    p_difficulty: difficulty || null,
                    p_tags: [
                      ...new Set(
                        tags
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter(Boolean),
                      ),
                    ],
                  },
                );
                open(row.id);
              })
            }
          >
            Start Infinite Run
          </Button>
        </>
      )}
      {history && (
        <>
          <h2>Infinite Run History</h2>
          {!entries && !error && <p role="status">Loading history…</p>}
          {entries?.length === 0 && <p>No Infinite Runs yet.</p>}
          <ul>
            {entries?.map((entry) => (
              <li key={entry.id}>
                <Link to={`/infinite-run?run=${entry.id}`}>
                  {entry.finished_at
                    ? "Review Infinite Run"
                    : "Open saved Infinite Run"}
                  : {entry.correct}/{entry.answered} correct ·{" "}
                  {new Date(entry.created_at).toLocaleString()}
                </Link>
              </li>
            ))}
          </ul>
          {more && (
            <Button
              disabled={pending}
              onClick={() =>
                void perform(async () => {
                  const last = entries?.at(-1);
                  const rows = await rpc<Run[]>("list_infinite_runs", {
                    p_before: last?.created_at,
                    p_before_id: last?.id,
                  });
                  setEntries([...(entries ?? []), ...rows]);
                  setMore(rows.length === 12);
                })
              }
            >
              Load more runs
            </Button>
          )}
        </>
      )}
      {id && !run && !error && <p role="status">Loading run…</p>}
      {run && (
        <>
          {run.finished_at && <h2>Infinite Run finished</h2>}
          {run.mode === "weak" && (
            <section aria-label="Weak Area Focus">
              <strong>Weak Area Focus</strong>
              <p>{run.focus_topics?.join(", ")}</p>
              {run.paid && !run.finished_at && run.selection_mode === "standard" && (
                <p role="status">
                  No active questions match your weak topics right now. Using Standard
                  selection until focused questions become available.
                </p>
              )}
            </section>
          )}
          <p role="status">
            {run.correct}/{run.answered} correct ·{" "}
            {run.answered - run.correct - run.uncertain} wrong · {run.uncertain} unsure
            · {run.answered ? Math.round((100 * run.correct) / run.answered) : 0}%
            accuracy · Streak {run.streak} · Best {run.best}
          </p>
          {!run.finished_at && (
            <>
              {!run.paid && <p>Renew Premium to continue this run.</p>}
              {run.paid && !run.question && (
                <p>No eligible questions are currently available.</p>
              )}
              {run.question && (
                <>
                  {run.last_correct !== undefined && (
                    <p role="status">
                      Previous answer: {run.last_correct ? "Correct" : "Incorrect"}
                    </p>
                  )}
                  <p>Question {run.answered + 1}</p>
                  <fieldset key={run.answered} disabled={pending || !!action.current}>
                    <legend>{run.question.text}</legend>
                    {[
                      ...parseAnswerOptions(run.question.options),
                      { id: "UNKNOWN", text: "I Don’t Know" },
                    ].map((option) => (
                      <div key={option.id}>
                        <label>
                          <input
                            name="answer"
                            type="radio"
                            checked={selection === option.id}
                            onChange={() => setSelection(option.id)}
                          />{" "}
                          {option.text}
                        </label>
                      </div>
                    ))}
                  </fieldset>
                  <Button
                    disabled={!selection || pending}
                    onClick={() =>
                      void perform(async () => {
                        action.current ??= {
                          id: crypto.randomUUID(),
                          response: selection,
                        };
                        const row = await rpc<Run>("advance_infinite_run", {
                          p_run: run.id,
                          p_position: run.answered + 1,
                          p_request: action.current.id,
                          p_response: action.current.response,
                        });
                        action.current = null;
                        setSelection("");
                        setRun(row);
                      })
                    }
                  >
                    {action.current && error ? "Retry Next" : "Next"}
                  </Button>
                </>
              )}
              <div className="button-row">
                <Link to="/infinite-run?history=1">Exit run</Link>
                <Button
                  disabled={pending}
                  onClick={() =>
                    void perform(async () => {
                      setRun(await rpc<Run>("finish_infinite_run", { p_run: run.id }));
                    })
                  }
                >
                  Finish run
                </Button>
              </div>
            </>
          )}
          {run.finished_at && (
            <>
              <p>Run ID: {run.id}</p>
              {!review && (
                <Button
                  disabled={pending || !run.answered}
                  onClick={() => loadReview(false)}
                >
                  Review answers
                </Button>
              )}
              {review && (
                <>
                  {run.paid && (
                    <label>
                      <input
                        type="checkbox"
                        checked={show}
                        disabled={pending}
                        onChange={(e) => loadReview(e.target.checked)}
                      />{" "}
                      Show explanations
                    </label>
                  )}
                  <ol>
                    {review.map(({ position, response, question }) => (
                      <li key={position}>
                        <p>{question.text}</p>
                        <p>
                          Your answer:{" "}
                          {response === "UNKNOWN" ? "I Don’t Know" : response} ·
                          Correct: {question.answer}
                        </p>
                        {question.explanation && <p>{question.explanation}</p>}
                      </li>
                    ))}
                  </ol>
                  {more && (
                    <Button disabled={pending} onClick={() => loadReview(show, true)}>
                      Load more answers
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
