import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CursorNavigation } from "../../components/ui/CursorNavigation";
import { moderationRpc } from "../../lib/auth/moderation";
type Row = {
  id: string;
  created_at: string;
  question_text: string;
  review_status: string;
  details: {
    decision: string | null;
    matches: { id: string; score: number; question_text: string; created_at: string }[];
  };
};
export function NearDuplicateQueuePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [pages, setPages] = useState<Row[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const cursor = pages.at(-1);
  useEffect(() => {
    let live = true;
    setBusy(true);
    void moderationRpc<Row[]>(
      "list_candidate_near_matches",
      cursor ? { p_before: cursor.created_at, p_id: cursor.id } : {},
    )
      .then((x) => {
        if (live) setRows(x);
      })
      .catch((e: unknown) => {
        if (live) setError(e instanceof Error ? e.message : "Queue could not load.");
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [cursor]);
  const shown = rows.slice(0, 25);
  return (
    <section className="page-stack">
      <h1>Near-Duplicate Queue</h1>
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Loading matches…</p>}
      {!busy && !error && !shown.length && <p>No near matches awaiting publication.</p>}
      {shown.map((r) => (
        <article key={r.id}>
          <h2>
            <Link to={`/admin/candidates?candidate=${r.id}`}>{r.question_text}</Link>
          </h2>
          <p>
            {r.review_status} · {r.details.decision ?? "Review needed"} ·{" "}
            {new Date(r.created_at).toLocaleString()}
          </p>
          <ul>
            {r.details.matches.slice(0, 10).map((m) => (
              <li key={m.id}>
                <Link to={`/admin/questions?question=${m.id}`}>{m.question_text}</Link>
                <p>
                  {(m.score * 100).toFixed(1)}% similarity ·{" "}
                  {new Date(m.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </article>
      ))}
      <CursorNavigation
        page={pages.length}
        loading={busy}
        hasNext={rows.length > 25 && !error}
        onPrevious={() => setPages((x) => x.slice(0, -1))}
        onNext={() => {
          const last = shown.at(-1);
          if (last) setPages((x) => [...x, last]);
        }}
      />
    </section>
  );
}
