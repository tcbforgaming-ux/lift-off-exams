import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
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
  history?: Score[];
  topics?: { tag: string; correct: number; total: number; uncertain: number }[];
  extremes?: { highest?: Extreme; lowest?: Extreme };
};
const initial = { range: "month", from: "", to: "" };
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
          {data.premium && data.test_count > 0 && (
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
              <section aria-label="Score history">
                <h2>Score History</h2>
                <ol className="page-stack">
                  {data.history?.map((score) => (
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
                  ))}
                </ol>
              </section>
              <section aria-label="Topic accuracy">
                <h2>Topic Accuracy</h2>
                <ul className="page-stack">
                  {data.topics?.map((topic) => (
                    <li key={topic.tag}>
                      <strong>{topic.tag}</strong> ·{" "}
                      {Math.round((100 * topic.correct) / topic.total)}% correct (
                      {topic.correct}/{topic.total}) · {topic.uncertain} I Don’t Know
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
