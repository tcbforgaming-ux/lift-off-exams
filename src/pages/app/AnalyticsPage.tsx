import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { CursorNavigation } from "../../components/ui/CursorNavigation";
import { useAuth } from "../../lib/auth/useAuth";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";

type Score = { session_id: string; submitted_at: string; percentage: number };
type Extreme = {
  session_id: string;
  score: number;
  category: string;
  difficulties: string[];
  tags: string[];
};
type Analytics = {
  premium: boolean;
  test_count: number;
  average_score: number | null;
  as_of?: string;
  extremes?: { highest?: Extreme; lowest?: Extreme };
};
const initial = { range: "month", from: "", to: "" };
type Query = typeof initial;
type Topic = {
  tag: string;
  correct: number;
  total: number;
  answered: number;
  uncertain: number;
  required: number | null;
  eligible: boolean;
};
type UncertainItem = {
  session_id: string;
  position: number;
  question_text: string;
  category: string;
  difficulty: string;
  tags: string[];
};
type Breakdown = { label: string; uncertain: number; answered: number };
type Confidence = {
  answered: number;
  uncertain: number;
  skipped: number;
  wrong_choices: number;
  percentage: number | null;
  categories: Breakdown[];
  difficulties: Breakdown[];
};

function useDetail<T>(
  section: string,
  query: Query,
  anchor: string,
  page: number,
  retry: number,
) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const { data, error } = await getSupabaseBrowserClient().rpc(
          "get_my_test_analytics_detail",
          {
            p_section: section,
            p_range: query.range,
            p_page: page,
            p_as_of: anchor,
            ...(query.range === "custom" ? { p_from: query.from, p_to: query.to } : {}),
          },
        );
        if (error) throw new Error(error.message);
        if (current) setData(data as T);
      } catch (e) {
        if (current)
          setError(e instanceof Error ? e.message : "Analytics could not load.");
      } finally {
        if (current) setLoading(false);
      }
    })();
    return () => {
      current = false;
    };
  }, [section, query, anchor, page, retry]);
  return { data, loading, error };
}

function DetailPage<T>({
  section,
  title,
  query,
  anchor,
  render,
}: {
  section: string;
  title: string;
  query: Query;
  anchor: string;
  render: (row: T) => React.ReactNode;
}) {
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const { data, loading, error } = useDetail<{ items: T[]; has_more: boolean }>(
    section,
    query,
    anchor,
    page,
    retry,
  );
  return (
    <section aria-label={title}>
      <h2>{title}</h2>
      {loading && <p role="status">Loading {title.toLowerCase()}.</p>}
      {error && (
        <>
          <p role="alert">{error}</p>
          <Button type="button" onClick={() => setRetry((n) => n + 1)}>
            Retry
          </Button>
        </>
      )}
      {!loading && !error && data && (
        <>
          {data.items.length ? (
            <ul className="page-stack">{data.items.map(render)}</ul>
          ) : (
            <p>No records in this range.</p>
          )}
          {(data.has_more || page > 0) && (
            <CursorNavigation
              page={page}
              loading={loading}
              hasNext={data.has_more}
              onPrevious={() => setPage((n) => n - 1)}
              onNext={() => setPage((n) => n + 1)}
            />
          )}
        </>
      )}
    </section>
  );
}

function ConfidencePanel({ query, anchor }: { query: Query; anchor: string }) {
  const [retry, setRetry] = useState(0);
  const { data, loading, error } = useDetail<Confidence>(
    "confidence",
    query,
    anchor,
    0,
    retry,
  );
  return (
    <section aria-label="Confidence analysis">
      <h2>Confidence Analysis</h2>
      {loading && <p role="status">Loading confidence analysis.</p>}
      {error && (
        <>
          <p role="alert">{error}</p>
          <Button type="button" onClick={() => setRetry((n) => n + 1)}>
            Retry
          </Button>
        </>
      )}
      {data && !loading && !error && (
        <>
          <p>
            {data.uncertain} of {data.answered} submitted answers were “I Don’t Know”
            {data.percentage === null ? "." : ` (${data.percentage}%).`} Skipped
            questions are excluded.
          </p>
          <p>
            {data.wrong_choices} wrong choices · {data.skipped} skipped
          </p>
          <div className="grid two-column">
            {(
              [
                ["By category", data.categories],
                ["By difficulty", data.difficulties],
              ] as const
            ).map(([label, rows]) => (
              <div key={label}>
                <h3>{label}</h3>
                <ul>
                  {rows.map((row) => (
                    <li key={row.label}>
                      {row.label}: {row.uncertain}/{row.answered}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
const ranges = [
  ["day", "Past 24 hours"],
  ["week", "Past week"],
  ["month", "Past 30 days"],
  ["year", "Past year"],
  ["lifetime", "Lifetime"],
  ["custom", "Custom dates (UTC)"],
];

export function AnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Analytics>();
  const [input, setInput] = useState(initial);
  const [query, setQuery] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    setError("");
    setLoading(true);
    void (async () => {
      try {
        const api = getSupabaseBrowserClient();
        const { data: response, error } = await api.rpc("get_my_test_analytics", {
          p_range: query.range,
          ...(query.range === "custom" ? { p_from: query.from, p_to: query.to } : {}),
        });
        if (error) throw new Error(error.message);
        if (current) setData(response as Analytics);
      } catch (error) {
        if (current)
          setError(
            error instanceof Error ? error.message : "Analytics could not load.",
          );
      } finally {
        if (current) setLoading(false);
      }
    })();
    return () => {
      current = false;
    };
  }, [user?.id, query]);

  return (
    <div className="page-stack" style={{ overflowWrap: "anywhere" }}>
      <header className="page-header">
        <h1>Analytics</h1>
      </header>
      {data?.premium && (
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery({ ...input });
          }}
        >
          <label className="field-label">
            Time range
            <select
              value={input.range}
              onChange={(event) => setInput({ ...input, range: event.target.value })}
            >
              {ranges.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {input.range === "custom" && (
            <div className="grid two-column">
              <label className="field-label">
                From
                <input
                  type="date"
                  required
                  value={input.from}
                  onChange={(event) => setInput({ ...input, from: event.target.value })}
                />
              </label>
              <label className="field-label">
                Through
                <input
                  type="date"
                  min={input.from || undefined}
                  required
                  value={input.to}
                  onChange={(event) => setInput({ ...input, to: event.target.value })}
                />
              </label>
            </div>
          )}
          <Button type="submit">Apply Range</Button>
        </form>
      )}
      {loading && <p role="status">Loading analytics.</p>}
      {error && (
        <div>
          <p role="alert">{error}</p>
          <Button
            type="button"
            onClick={() => {
              setInput(initial);
              setQuery({ ...initial });
            }}
          >
            Reload Past 30 Days
          </Button>
        </div>
      )}
      {data && !loading && !error && (
        <>
          <dl className="grid two-column">
            <div>
              <dt>Tests taken</dt>
              <dd>{data.test_count}</dd>
            </div>
            <div>
              <dt>{data.premium ? "Average score" : "Average score (past 30 days)"}</dt>
              <dd>
                {data.average_score === null ? "No scores" : `${data.average_score}%`}
              </dd>
            </div>
          </dl>
          {data.premium && data.test_count > 0 && data.as_of && (
            <>
              <section className="grid two-column" aria-label="Score extremes">
                {(
                  [
                    ["Highest score", data.extremes?.highest],
                    ["Lowest score", data.extremes?.lowest],
                  ] as const
                ).map(
                  ([label, value]) =>
                    value && (
                      <div key={label}>
                        <h2>{label}</h2>
                        <Link to={`/results/${value.session_id}`}>{value.score}%</Link>
                        <p>
                          {[value.category, ...value.difficulties, ...value.tags].join(
                            " · ",
                          )}
                        </p>
                      </div>
                    ),
                )}
              </section>
              <DetailPage<Score>
                section="history"
                title="Score History"
                query={query}
                anchor={data.as_of}
                render={(score) => (
                  <li key={score.session_id}>
                    <Link to={`/results/${score.session_id}`}>
                      {new Date(score.submitted_at).toLocaleDateString()} ·{" "}
                      {score.percentage}%
                    </Link>
                    <div
                      aria-hidden="true"
                      style={{
                        height: 5,
                        width: `${score.percentage}%`,
                        background: "currentColor",
                      }}
                    />
                  </li>
                )}
              />
              <DetailPage<Topic>
                section="topics"
                title="Topic Accuracy"
                query={query}
                anchor={data.as_of}
                render={(topic) => (
                  <li key={topic.tag}>
                    <strong>{topic.tag}</strong> ·{" "}
                    {Math.round((100 * topic.correct) / topic.total)}% correct (
                    {topic.correct}/{topic.total}) · {topic.uncertain} I Don’t Know
                    {!topic.eligible && (
                      <span>
                        {" "}
                        · Insufficient Data
                        {topic.required === null
                          ? ""
                          : ` (${topic.answered}/${topic.required} answers)`}
                      </span>
                    )}
                  </li>
                )}
              />
              <ConfidencePanel query={query} anchor={data.as_of} />
              <DetailPage<string>
                section="recommendations"
                title="Recommended Topics"
                query={query}
                anchor={data.as_of}
                render={(tag) => <li key={tag}>{tag}</li>}
              />
              <DetailPage<UncertainItem>
                section="uncertainty"
                title="I Don’t Know Responses"
                query={query}
                anchor={data.as_of}
                render={(item) => (
                  <li key={`${item.session_id}:${item.position}`}>
                    <Link to={`/results/${item.session_id}`}>{item.question_text}</Link>
                    <p>
                      {[item.category, item.difficulty, ...new Set(item.tags)].join(
                        " · ",
                      )}
                    </p>
                  </li>
                )}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
