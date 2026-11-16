import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { paths } from "../../app/urlPaths";
import { Card } from "../../components/ui/Card";
import { CursorNavigation } from "../../components/ui/CursorNavigation";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";
import type { Database } from "../../lib/supabase/database.types";

type Range = { from: string; to: string };
type Summary = {
  total_users: number;
  new_users: number;
  active_users: number;
  premium_users: number;
  free_users: number;
  generated: number;
  completed: number;
  average_score: number | null;
  top_categories: { label: string; total: number }[];
  top_tags: { label: string; total: number }[];
};
type Quality =
  Database["public"]["Functions"]["list_staff_question_quality"]["Returns"][number];
const today = (offset = 0) =>
  new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
const flags: Record<string, string> = {
  report_volume: "High report volume",
  low_correct: "Low correct rate",
  high_correct: "High correct rate",
  high_unknown: "High I Don't Know rate",
};

export function StaffReporting() {
  const [editing, setEditing] = useState(() => ({ from: today(-29), to: today() }));
  const [range, setRange] = useState(editing);
  return (
    <section className="page-stack" aria-labelledby="staff-reporting-title">
      <header>
        <h2 id="staff-reporting-title">Platform Reporting</h2>
      </header>
      <form
        className="repository-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setRange(editing);
        }}
      >
        <label className="field-label">
          From (UTC)
          <input
            type="date"
            required
            value={editing.from}
            max={editing.to}
            onChange={(event) => setEditing({ ...editing, from: event.target.value })}
          />
        </label>
        <label className="field-label">
          Through (UTC)
          <input
            type="date"
            required
            value={editing.to}
            min={editing.from}
            max={today()}
            onChange={(event) => setEditing({ ...editing, to: event.target.value })}
          />
        </label>
        <button className="button button-secondary" type="submit">
          Apply date range
        </button>
      </form>
      <SummaryPanel key={`summary:${range.from}:${range.to}`} range={range} />
      <QualityPanel key={`quality:${range.from}:${range.to}`} range={range} />
    </section>
  );
}

function SummaryPanel({ range }: { range: Range }) {
  const [summary, setSummary] = useState<Summary>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await getSupabaseBrowserClient().rpc(
          "get_staff_reporting_summary",
          {
            p_from: range.from,
            p_to: range.to,
          },
        );
        if (response.error) throw new Error(response.error.message);
        if (active) setSummary(response.data as unknown as Summary);
      } catch (cause) {
        if (active)
          setError(cause instanceof Error ? cause.message : "Metrics could not load.");
      }
    })();
    return () => {
      active = false;
    };
  }, [range]);
  if (error) return <p role="alert">{error}</p>;
  if (!summary) return <p role="status">Loading platform metrics…</p>;
  const metrics = [
    ["Total accounts", summary.total_users],
    ["Premium accounts", summary.premium_users],
    ["Free accounts", summary.free_users],
    ["New accounts", summary.new_users],
    ["Active users", summary.active_users],
    ["Tests generated", summary.generated],
    ["Tests completed", summary.completed],
    [
      "Average Test score",
      summary.average_score === null ? "No scores" : `${summary.average_score}%`,
    ],
  ];
  return (
    <Card>
      <dl className="grid two-column">
        {metrics.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="muted">
        Account totals are current. Activity and new accounts use the selected dates.
        Scores average submitted Tests.
      </p>
      <div className="grid two-column">
        {(
          [
            ["Top Test categories", summary.top_categories],
            ["Top Test tags", summary.top_tags],
          ] as const
        ).map(([title, items]) => (
          <div key={title}>
            <h3>{title}</h3>
            {items.length ? (
              <ol>
                {items.map((item) => (
                  <li key={item.label}>
                    {item.label}: {item.total}
                  </li>
                ))}
              </ol>
            ) : (
              <p>No generated Tests in this range.</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function QualityPanel({ range }: { range: Range }) {
  const [sort, setSort] = useState("reported");
  const [flagged, setFlagged] = useState(false);
  return (
    <Card className="page-stack">
      <h3>Question Quality</h3>
      <div className="repository-filters">
        <label className="field-label">
          Sort by
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="reported">Most reported</option>
            <option value="answered">Most answered</option>
            <option value="missed">Most missed</option>
            <option value="unknown">Most I Don't Know</option>
          </select>
        </label>
        <label className="field-label">
          <input
            type="checkbox"
            checked={flagged}
            onChange={(event) => setFlagged(event.target.checked)}
          />
          Flagged only
        </label>
      </div>
      <QualityTable
        key={`${sort}:${flagged}`}
        range={range}
        sort={sort}
        flagged={flagged}
      />
    </Card>
  );
}

function QualityTable({
  range,
  sort,
  flagged,
}: {
  range: Range;
  sort: string;
  flagged: boolean;
}) {
  const [cursors, setCursors] = useState<{ rank: number; id: string }[]>([]);
  const [rows, setRows] = useState<Quality[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const cursor = cursors.at(-1);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const response = await getSupabaseBrowserClient().rpc(
          "list_staff_question_quality",
          {
            p_from: range.from,
            p_to: range.to,
            p_order: sort,
            p_flagged_only: flagged,
            ...(cursor ? { p_after_rank: cursor.rank, p_after_id: cursor.id } : {}),
          },
        );
        if (response.error) throw new Error(response.error.message);
        if (active) setRows(response.data);
      } catch (cause) {
        if (active) {
          setRows([]);
          setError(
            cause instanceof Error ? cause.message : "Question metrics could not load.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [range, sort, flagged, cursor]);
  const last = rows.at(-1);
  const percentage = (value: number, total: number) =>
    total ? `${((100 * value) / total).toFixed(1)}%` : "—";
  return (
    <>
      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">Loading question metrics…</p>}
      {!error && !loading && !rows.length && (
        <p>No questions match this range and filter.</p>
      )}
      {rows.length > 0 && (
        <div className="repository-table-wrap">
          <table className="repository-table">
            <caption>
              Known graded attempts and submitted reports in this UTC range. Incorrect
              includes I Don't Know.
            </caption>
            <thead>
              <tr>
                <th scope="col">Question</th>
                <th scope="col">Answered</th>
                <th scope="col">Correct</th>
                <th scope="col">Incorrect</th>
                <th scope="col">I Don't Know</th>
                <th scope="col">Reports</th>
                <th scope="col">Flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.question_id}>
                  <th scope="row">
                    <Link to={`${paths.adminQuestions}?question=${row.question_id}`}>
                      {row.prompt}
                    </Link>
                    <span>{row.lifecycle_state}</span>
                  </th>
                  <td>{row.answered}</td>
                  <td>{percentage(row.correct, row.answered)}</td>
                  <td>{percentage(row.incorrect, row.answered)}</td>
                  <td>{percentage(row.unknown, row.answered)}</td>
                  <td>
                    {row.reports} ({row.open_reports} open or in review)
                  </td>
                  <td>
                    {row.flags.map((flag) => flags[flag] ?? flag).join(", ") || "None"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CursorNavigation
        page={cursors.length}
        loading={loading}
        hasNext={Boolean(last?.has_next_page) && !error}
        onPrevious={() => setCursors((items) => items.slice(0, -1))}
        onNext={() => {
          if (last)
            setCursors((items) => [
              ...items,
              { rank: last.rank, id: last.question_id },
            ]);
        }}
      />
    </>
  );
}
