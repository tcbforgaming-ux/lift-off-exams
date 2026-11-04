import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { CursorNavigation } from "../../components/ui/CursorNavigation";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";
import { parseAnswerOptions } from "../../lib/sessions/session";

type Candidate = {
  id: string;
  created_at: string;
  updated_at: string;
  review_status: string;
  validation_status: string;
  performance_indicator: string | null;
  category: string | null;
  question_type: string;
  difficulty: string;
  partition_keys: string[];
  source_custom_id: string | null;
  batch_job_id: string | null;
  reviewed_by: string | null;
};
type Content = {
  question_text: string;
  explanation: string;
  performance_indicator: string;
  partition_keys: string[];
  tags: string[];
  question_type: string;
  difficulty: string;
  correct_option_id: string;
  options: { id: string; text: string }[];
};
type Detail = Candidate &
  Content & {
    review_revision: number;
    validation_errors: string[];
    published_question_id: string | null;
  };
type History = {
  id: string;
  action: string;
  reason: string;
  actor_user_id: string;
  created_at: string;
};
type Cursor = { at: string; id: string };
async function rpc<T>(name: string, args: Record<string, unknown>) {
  const client = getSupabaseBrowserClient() as unknown as {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Candidate request failed.";
}
const statuses = ["Pending Review", "Needs Edit", "Approved", "Rejected", "Published"];
const types = ["S", "D", "F", "A"];
const difficulties = ["Easy", "Medium", "Hard"];

export function CandidateReviewPage() {
  const [params, setParams] = useSearchParams();
  const id = params.get("candidate");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [validation, setValidation] = useState("");
  const [cursors, setCursors] = useState<Cursor[]>([]);
  const [rows, setRows] = useState<Candidate[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const returnTarget = useRef<string | null>(null);
  const cursor = cursors.at(-1);
  useEffect(() => {
    if (id) return;
    let active = true;
    setBusy(true);
    setError("");
    setRows([]);
    void rpc<Candidate[]>("list_review_candidates", {
      p_search: search,
      p_status: status || null,
      p_validation: validation || null,
      p_before: cursor?.at ?? null,
      p_before_id: cursor?.id ?? null,
    })
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((failure: unknown) => {
        if (active) setError(errorMessage(failure));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [id, search, status, validation, cursor]);
  useEffect(() => {
    if (id || busy || !returnTarget.current) return;
    const target =
      document.getElementById(`review-${returnTarget.current}`) ??
      document.getElementById("candidate-list-heading");
    target?.focus();
    returnTarget.current = null;
  }, [id, busy]);
  if (id)
    return (
      <CandidateDetail
        key={id}
        id={id}
        back={() => {
          returnTarget.current = id;
          setBusy(true);
          setParams({});
        }}
      />
    );
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1 id="candidate-list-heading" tabIndex={-1}>
          Candidate Review
        </h1>
      </header>
      <div className="repository-filters">
        <label className="field-label">
          Search candidates
          <input
            maxLength={200}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCursors([]);
            }}
          />
        </label>
        <label className="field-label">
          Review status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setCursors([]);
            }}
          >
            <option value="">All</option>
            {statuses.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="field-label">
          Validation
          <select
            value={validation}
            onChange={(e) => {
              setValidation(e.target.value);
              setCursors([]);
            }}
          >
            <option value="">All</option>
            {["Valid", "Invalid", "Needs Review", "Unchecked"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      {busy && <p role="status">Loading candidates...</p>}
      {error && <p role="alert">{error}</p>}
      {!busy && !error && !rows.length && <p>No matching candidates.</p>}
      {rows.length > 0 && (
        <div className="repository-table-wrap">
          <table className="repository-table">
            <thead>
              <tr>
                {[
                  "Candidate",
                  "Classification",
                  "Review",
                  "Source",
                  "Updated",
                  "Action",
                ].map((label) => (
                  <th key={label} scope="col">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 25).map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.id}
                    <br />
                    {row.performance_indicator}
                  </td>
                  <td>
                    {row.category}
                    <br />
                    {row.partition_keys.join(", ")}
                    <br />
                    {row.question_type} / {row.difficulty}
                  </td>
                  <td>
                    {row.review_status}
                    <br />
                    {row.validation_status}
                    <br />
                    {row.reviewed_by}
                  </td>
                  <td>
                    {row.batch_job_id}
                    <br />
                    {row.source_custom_id}
                  </td>
                  <td>{new Date(row.updated_at).toLocaleString()}</td>
                  <td>
                    <Button
                      type="button"
                      onClick={() => setParams({ candidate: row.id })}
                      id={`review-${row.id}`}
                    >
                      Review
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CursorNavigation
        page={cursors.length}
        loading={busy}
        hasNext={rows.length > 25}
        onPrevious={() => setCursors(cursors.slice(0, -1))}
        onNext={() => {
          const last = rows[24];
          if (last) setCursors([...cursors, { at: last.created_at, id: last.id }]);
        }}
      />
    </div>
  );
}

function CandidateDetail({ id, back }: { id: string; back: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const [row, setRow] = useState<Detail | null>(null);
  const [draft, setDraft] = useState<Content | null>(null);
  const [history, setHistory] = useState<History[]>([]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const retry = useRef<{ payload: string; key: string } | null>(null);
  const savedDraft = useRef("");
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    void Promise.all([
      rpc<Detail>("get_review_candidate", { p_id: id }),
      rpc<History[]>("get_candidate_review_history", { p_id: id }),
    ])
      .then(([detail, events]) => {
        if (!active) return;
        setRow(detail);
        setHistory(events);
        const content = {
          question_text: detail.question_text,
          explanation: detail.explanation ?? "",
          performance_indicator: detail.performance_indicator ?? "",
          partition_keys: detail.partition_keys,
          tags: detail.tags,
          question_type: detail.question_type,
          difficulty: detail.difficulty,
          correct_option_id: detail.correct_option_id,
          options: parseAnswerOptions(detail.options),
        };
        savedDraft.current = JSON.stringify(content);
        setDraft(content);
      })
      .catch((failure: unknown) => {
        if (active) setError(errorMessage(failure));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [id, reload]);
  async function act(action: string) {
    if (!row || !draft || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (action === "publish")
        await rpc("publish_review_candidate", {
          p_id: id,
          p_revision: row.review_revision,
          p_reason: reason,
        });
      else {
        const args = {
          p_id: id,
          p_revision: row.review_revision,
          p_action: action,
          p_reason: reason,
          p_content: action === "edit" ? draft : null,
        };
        const payload = JSON.stringify(args);
        if (retry.current?.payload !== payload)
          retry.current = { payload, key: crypto.randomUUID() };
        await rpc("review_candidate", { ...args, p_key: retry.current.key });
      }
      setReason("");
      setMessage("Candidate updated.");
      setReload((value) => value + 1);
    } catch (failure) {
      setError(errorMessage(failure));
      setBusy(false);
    }
  }
  const editable = row?.review_status !== "Published";
  const pending =
    row?.review_status === "Pending Review" || row?.review_status === "Needs Edit";
  return (
    <div className="page-stack">
      <h1 ref={heading} tabIndex={-1}>
        Candidate Detail
      </h1>
      <div className="button-row">
        <Button type="button" variant="secondary" onClick={back}>
          Back to Candidates
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => setReload((value) => value + 1)}
        >
          Reload Candidate
        </Button>
      </div>
      {busy && <p role="status">Loading or saving candidate...</p>}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {row && draft && (
        <>
          <p>
            {row.review_status} / {row.validation_status} · Revision{" "}
            {row.review_revision}
          </p>
          <dl className="detail-list">
            <div>
              <dt>ID</dt>
              <dd>{row.id}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>
                {row.batch_job_id ?? "No batch reference"} /{" "}
                {row.source_custom_id ?? "No source reference"}
              </dd>
            </div>
            <div>
              <dt>Created</dt>
              <dd>{new Date(row.created_at).toLocaleString()}</dd>
            </div>
            {row.published_question_id && (
              <div>
                <dt>Published question</dt>
                <dd>{row.published_question_id}</dd>
              </div>
            )}
          </dl>
          {row.validation_errors.length > 0 && (
            <ul>
              {row.validation_errors.map((value, index) => (
                <li key={index}>{value}</li>
              ))}
            </ul>
          )}
          <fieldset className="form-stack" disabled={busy || !editable}>
            <legend>Question content</legend>
            <label className="field-label">
              Question
              <textarea
                maxLength={5000}
                value={draft.question_text}
                onChange={(e) => setDraft({ ...draft, question_text: e.target.value })}
              />
            </label>
            {["A", "B", "C", "D"].map((letter, index) => (
              <label key={letter} className="field-label">
                Option {letter}
                <input
                  maxLength={1000}
                  value={draft.options[index]?.text ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      options: ["A", "B", "C", "D"].map((option, i) => ({
                        id: option,
                        text:
                          i === index ? e.target.value : (draft.options[i]?.text ?? ""),
                      })),
                    })
                  }
                />
              </label>
            ))}
            <label className="field-label">
              Correct option
              <select
                value={draft.correct_option_id}
                onChange={(e) =>
                  setDraft({ ...draft, correct_option_id: e.target.value })
                }
              >
                {["A", "B", "C", "D"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Explanation
              <textarea
                maxLength={5000}
                value={draft.explanation}
                onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
              />
            </label>
            <label className="field-label">
              Type
              <select
                value={draft.question_type}
                onChange={(e) => setDraft({ ...draft, question_type: e.target.value })}
              >
                {[...new Set([draft.question_type, ...types])].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Difficulty
              <select
                value={draft.difficulty}
                onChange={(e) => setDraft({ ...draft, difficulty: e.target.value })}
              >
                {difficulties.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Indicator
              <input
                maxLength={200}
                value={draft.performance_indicator}
                onChange={(e) =>
                  setDraft({ ...draft, performance_indicator: e.target.value })
                }
              />
            </label>
            <label className="field-label">
              Partitions (comma-separated)
              <input
                value={draft.partition_keys.join(",")}
                onChange={(e) =>
                  setDraft({ ...draft, partition_keys: e.target.value.split(",") })
                }
              />
            </label>
            <label className="field-label">
              Tags (comma-separated)
              <input
                value={draft.tags.join(",")}
                onChange={(e) =>
                  setDraft({ ...draft, tags: e.target.value.split(",") })
                }
              />
            </label>
            <label className="field-label">
              Reason
              <textarea
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <div className="button-row">
              {[
                "edit",
                ...(pending ? ["approve", "reject"] : []),
                ...(row.review_status === "Approved" ? ["publish"] : []),
              ].map((action) => (
                <Button
                  key={action}
                  type="button"
                  disabled={
                    busy ||
                    reason.trim().length < 5 ||
                    (action !== "edit" && JSON.stringify(draft) !== savedDraft.current)
                  }
                  onClick={() => void act(action)}
                >
                  {
                    {
                      edit: "Save Edit",
                      approve: "Approve",
                      reject: "Reject",
                      publish: "Publish",
                    }[action]
                  }
                </Button>
              ))}
            </div>
          </fieldset>
          <section>
            <h2>Review History</h2>
            {history.length === 0 ? (
              <p>No review history.</p>
            ) : (
              <ul>
                {history.map((event) => (
                  <li key={event.id}>
                    {event.action} · {new Date(event.created_at).toLocaleString()} ·{" "}
                    {event.actor_user_id}: {event.reason}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
