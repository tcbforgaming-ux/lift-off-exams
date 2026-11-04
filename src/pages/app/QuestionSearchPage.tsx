import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { CursorNavigation } from "../../components/ui/CursorNavigation";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";

type Row = {
  id: string;
  category: string;
  difficulty: string;
  tags: string[];
  status: string;
  seen_count: number;
};
type Review = {
  id: string;
  question_text: string;
  options: { id: string; text: string }[];
  tags: string[];
  correct_option_id?: string | null;
  correct?: boolean | null;
  explanation?: string | null;
};
const empty = { keyword: "", category: "", tag: "", difficulty: "", status: "" };
const statuses = ["Seen", "Unseen", "Answered correctly", "Answered incorrectly"];

export function QuestionSearchPage() {
  const [filters, setFilters] = useState(empty);
  const [query, setQuery] = useState(empty);
  const [cursor, setCursor] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Row>();
  const [review, setReview] = useState<Review>();
  const [option, setOption] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const after = cursor.at(-1);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const { data, error } = await getSupabaseBrowserClient().rpc(
          "search_my_question_bank",
          {
            p_keyword: query.keyword,
            p_category: query.category,
            p_tag: query.tag,
            p_difficulty: query.difficulty,
            p_status: query.status,
            ...(after ? { p_after: after } : {}),
          },
        );
        if (error) throw new Error(error.message);
        if (current) setRows(data as Row[]);
      } catch (e) {
        if (current) {
          setRows([]);
          setError(e instanceof Error ? e.message : "Search could not load.");
        }
      } finally {
        if (current) setLoading(false);
      }
    })();
    return () => {
      current = false;
    };
  }, [query, after, revision]);

  useEffect(() => {
    if (selected) reviewHeading.current?.focus();
  }, [selected]);

  async function run(action: "attempt" | "view" | "grade") {
    if (!selected || busy) return;
    setBusy(true);
    setReviewError("");
    try {
      const { data, error } = await getSupabaseBrowserClient().rpc(
        "review_my_bank_question",
        {
          p_id: selected.id,
          p_action: action,
          p_acknowledge: action !== "grade",
          ...(action === "grade" ? { p_option: option } : {}),
        },
      );
      if (error) throw new Error(error.message);
      setReview(data as Review);
      setRevision((n) => n + 1);
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : "Question could not load.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-stack" style={{ overflowWrap: "anywhere" }}>
      <header className="page-header">
        <h1>Question Search</h1>
      </header>
      <form
        className="form-stack"
        onSubmit={(event) => {
          event.preventDefault();
          setCursor([]);
          setQuery({ ...filters });
          setSelected(undefined);
        }}
      >
        <div className="grid two-column">
          <label className="field-label">
            Keyword
            <input
              maxLength={120}
              value={filters.keyword}
              onChange={(event) =>
                setFilters({ ...filters, keyword: event.target.value })
              }
            />
          </label>
          <label className="field-label">
            Category
            <input
              maxLength={100}
              value={filters.category}
              onChange={(event) =>
                setFilters({ ...filters, category: event.target.value })
              }
            />
          </label>
          <label className="field-label">
            Topic tag
            <input
              maxLength={100}
              value={filters.tag}
              onChange={(event) => setFilters({ ...filters, tag: event.target.value })}
            />
          </label>
          <label className="field-label">
            Difficulty
            <select
              value={filters.difficulty}
              onChange={(event) =>
                setFilters({ ...filters, difficulty: event.target.value })
              }
            >
              <option value="">All</option>
              {["Easy", "Medium", "Hard"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Status
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters({ ...filters, status: event.target.value })
              }
            >
              <option value="">All</option>
              {statuses.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <Button type="submit" disabled={busy}>
          Search Questions
        </Button>
      </form>
      {selected && (
        <section className="page-stack" aria-label="Question review">
          <h2 ref={reviewHeading} tabIndex={-1}>
            {review
              ? "Review Question"
              : selected.status === "Unseen"
                ? "Unseen Question"
                : "Open Question"}
          </h2>
          {!review && (
            <>
              {selected.status === "Unseen" && (
                <p>Opening this question can reduce its value in future practice.</p>
              )}
              <div className="button-row">
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void run("attempt")}
                >
                  Attempt Question
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void run("view")}
                >
                  View Answer
                </Button>
              </div>
            </>
          )}
          {review && (
            <>
              <p>{review.question_text}</p>
              {review.correct_option_id ? (
                <>
                  <ul>
                    {review.options.map((item) => (
                      <li key={item.id}>
                        {item.id}. {item.text}
                      </li>
                    ))}
                  </ul>
                  <p role="status">
                    {review.correct == null
                      ? ""
                      : review.correct
                        ? "Correct. "
                        : "Incorrect. "}
                    Answer: {review.correct_option_id}
                  </p>
                  {review.explanation && <p>{review.explanation}</p>}
                </>
              ) : (
                <fieldset className="form-stack">
                  <legend>Answer</legend>
                  {[...review.options, { id: "UNKNOWN", text: "I Don't Know" }].map(
                    (item) => (
                      <label key={item.id}>
                        <input
                          type="radio"
                          name="bank-review-answer"
                          checked={option === item.id}
                          onChange={() => setOption(item.id)}
                        />{" "}
                        {item.text}
                      </label>
                    ),
                  )}
                  <Button
                    type="button"
                    disabled={!option || busy}
                    onClick={() => void run("grade")}
                  >
                    Check Answer
                  </Button>
                </fieldset>
              )}
            </>
          )}
          {reviewError && <p role="alert">{reviewError}</p>}
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setSelected(undefined);
              trigger.current?.focus();
            }}
          >
            Close Question
          </Button>
        </section>
      )}
      {loading && <p role="status">Searching questions.</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && rows.length === 0 && <p>No matching questions.</p>}
      <ul className="page-stack">
        {rows.slice(0, 25).map((row) => (
          <li key={row.id}>
            <p>
              {row.category} · {row.difficulty} · {row.tags.join(", ")}
            </p>
            <p>
              {row.status} · Viewed {row.seen_count} times
            </p>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={(event) => {
                trigger.current = event.currentTarget;
                setSelected(row);
                setReview(undefined);
                setOption("");
                setReviewError("");
              }}
            >
              Open Question
            </Button>
          </li>
        ))}
      </ul>
      <CursorNavigation
        page={cursor.length}
        loading={loading}
        hasNext={rows.length > 25}
        onPrevious={() => setCursor((items) => items.slice(0, -1))}
        onNext={() => {
          const last = rows[24];
          if (last) setCursor((items) => [...items, last.id]);
        }}
      />
    </div>
  );
}
