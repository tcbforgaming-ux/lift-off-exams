import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";

const LIMIT = 262144;
const letters = ["A", "B", "C", "D"];
const partitions = [
  "Business Administration Core",
  "Marketing",
  "Finance",
  "Business Management and Administration",
  "Hospitality and Tourism",
  "Entrepreneurship",
];
const example = [
  {
    partitionKey: "Finance",
    questionType: "S",
    performanceIndicator: "FI:001",
    questionText: "Which document lists assets and liabilities?",
    options: letters.map((id, i) => ({
      id,
      text: ["Balance sheet", "Income statement", "Sales invoice", "Purchase order"][i],
    })),
    correctOptionId: "A",
    explanation: "A balance sheet lists assets, liabilities and equity.",
    difficulty: "Easy",
    tags: ["Financial Analysis"],
  },
];
type Row = {
  row: number;
  status: "ready" | "duplicate" | "invalid" | "pending_review";
  issue: string | null;
  candidate_id?: string;
  content?: {
    question_text: string;
    options: { id: string; text: string }[];
    correct_option_id: string;
    explanation: string;
    difficulty: string;
    question_type: string;
    performance_indicator: string;
    partition_keys: string[];
    tags: string[];
  };
};
type Preview = {
  rows: Row[];
  token: string;
  near_matches?: {
    prompt: string;
    evidence: { matches: { id: string; question_text: string; score: number }[] };
  }[];
};
type Outcome = {
  import_id: string;
  rows: Row[];
  pending_review: number;
  published: number;
};
type Reviewed = {
  rows: unknown[];
  preview: Preview;
  key: string;
  reason: string;
  source: "manual" | "json";
};
async function rpc<T>(name: string, args: Record<string, unknown>) {
  const client = getSupabaseBrowserClient() as unknown as {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No confirmation received. Retry the same request.");
  return data as T;
}
function failure(e: unknown) {
  return e instanceof Error ? e.message : "Request failed.";
}
function parseFile(text: string): unknown[] {
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    throw new Error("The file does not contain valid JSON.");
  }
  if (!Array.isArray(data) || data.length < 1 || data.length > 100)
    throw new Error("Upload a JSON array of 1–100 question objects.");
  return data;
}
export function QuestionAuthoringPage() {
  const [mode, setMode] = useState<"manual" | "json">("manual");
  const [draft, setDraft] = useState({
    questionText: "",
    explanation: "",
    performanceIndicator: "",
    partitionKey: "Finance",
    questionType: "S",
    difficulty: "Easy",
    tags: "",
    correctAnswerIndex: "0",
  });
  const [options, setOptions] = useState(["", "", "", ""]);
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [reviewed, setReviewed] = useState<Reviewed | null>(null);
  const [result, setResult] = useState<Outcome | null>(null);
  const [commitAttempted, setCommitAttempted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  function invalidate() {
    setReviewed(null);
    setResult(null);
    setCommitAttempted(false);
    setError("");
  }
  function field(key: keyof typeof draft, value: string) {
    invalidate();
    setDraft({ ...draft, [key]: value });
  }
  async function preview() {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    invalidate();
    try {
      let rows: unknown[];
      if (mode === "manual") {
        rows = [
          {
            ...draft,
            correctAnswerIndex: Number(draft.correctAnswerIndex),
            tags: draft.tags
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean),
            options: letters.map((id, i) => ({ id, text: options[i] })),
          },
        ];
      } else {
        if (!file) throw new Error("Choose a JSON file.");
        if (file.size > LIMIT) throw new Error("Choose a file no larger than 256 KiB.");
        rows = parseFile(await file.text()).map((row) =>
          row && typeof row === "object" && !Array.isArray(row)
            ? {
                questionType: draft.questionType,
                performanceIndicator: draft.performanceIndicator,
                ...row,
              }
            : row,
        );
      }
      const preview = await rpc<Preview>("preview_staff_questions", { p_rows: rows });
      setReviewed({
        rows,
        preview,
        key: crypto.randomUUID(),
        reason: reason.trim(),
        source: mode,
      });
    } catch (e) {
      setError(failure(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function commit() {
    if (!reviewed || locked.current) return;
    setCommitAttempted(true);
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const outcome = await rpc<Outcome>("commit_staff_questions", {
        p_rows: reviewed.rows,
        p_token: reviewed.preview.token,
        p_key: reviewed.key,
        p_source: reviewed.source,
        p_reason: reviewed.reason,
      });
      setResult(outcome);
    } catch (e) {
      setError(failure(e));
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  const rows = result?.rows ?? reviewed?.preview.rows ?? [];
  const statusLabels = {
    ready: "Ready for import",
    duplicate: "Duplicate",
    invalid: "Rejected",
    pending_review: "Pending Review",
  };
  return (
    <div className="page-stack">
      <header className="page-header">
        <h1>Question Authoring</h1>
        <Link to="/admin/questions">Back to Questions</Link>
      </header>
      <div className="button-row" aria-label="Authoring mode">
        <Button
          type="button"
          aria-pressed={mode === "manual"}
          disabled={busy}
          onClick={() => {
            setMode("manual");
            invalidate();
          }}
        >
          Manual Question
        </Button>
        <Button
          type="button"
          aria-pressed={mode === "json"}
          disabled={busy}
          onClick={() => {
            setMode("json");
            invalidate();
          }}
        >
          JSON Import
        </Button>
      </div>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          void preview();
        }}
      >
        <fieldset className="form-stack" disabled={busy}>
          <legend>{mode === "manual" ? "Question content" : "Upload file"}</legend>
          {mode === "manual" ? (
            <>
              <label className="field-label">
                Question
                <textarea
                  required
                  maxLength={5000}
                  value={draft.questionText}
                  onChange={(e) => field("questionText", e.target.value)}
                />
              </label>
              {letters.map((letter, index) => (
                <label className="field-label" key={letter}>
                  Option {letter}
                  <input
                    required
                    maxLength={1000}
                    value={options[index]}
                    onChange={(e) => {
                      invalidate();
                      setOptions(
                        options.map((x, i) => (i === index ? e.target.value : x)),
                      );
                    }}
                  />
                </label>
              ))}
              <label className="field-label">
                Correct answer
                <select
                  value={draft.correctAnswerIndex}
                  onChange={(e) => field("correctAnswerIndex", e.target.value)}
                >
                  {letters.map((letter, index) => (
                    <option key={letter} value={index}>
                      {letter}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                Explanation
                <textarea
                  required
                  maxLength={5000}
                  value={draft.explanation}
                  onChange={(e) => field("explanation", e.target.value)}
                />
              </label>
              <label className="field-label">
                Indicator
                <input
                  required
                  maxLength={200}
                  value={draft.performanceIndicator}
                  onChange={(e) => field("performanceIndicator", e.target.value)}
                />
              </label>
              {(
                [
                  ["partitionKey", "Partition", partitions],
                  ["questionType", "Question type", ["S", "D", "F", "A"]],
                  ["difficulty", "Difficulty", ["Easy", "Medium", "Hard"]],
                ] as const
              ).map(([key, label, values]) => (
                <label className="field-label" key={key}>
                  {label}
                  <select
                    value={draft[key]}
                    onChange={(e) => field(key, e.target.value)}
                  >
                    {values.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="field-label">
                Tags (comma-separated)
                <input
                  required
                  maxLength={2020}
                  value={draft.tags}
                  onChange={(e) => field("tags", e.target.value)}
                />
              </label>
            </>
          ) : (
            <>
              <label className="field-label">
                JSON file
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    invalidate();
                    setFile(e.target.files?.[0] ?? null);
                  }}
                />
              </label>
              {file && <p>{file.name}</p>}
              <label className="field-label">
                Default indicator for rows without one
                <input
                  maxLength={200}
                  value={draft.performanceIndicator}
                  onChange={(e) => field("performanceIndicator", e.target.value)}
                />
              </label>
              <label className="field-label">
                Default question type
                <select
                  value={draft.questionType}
                  onChange={(e) => field("questionType", e.target.value)}
                >
                  {["S", "D", "F", "A"].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <p>1–100 questions, up to 256 KiB. Valid rows enter Pending Review.</p>
              <a
                download="question-import-sample.json"
                href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(example, null, 2))}`}
              >
                Download JSON sample
              </a>
            </>
          )}
          <label className="field-label">
            Reason
            <textarea
              required
              minLength={5}
              maxLength={1000}
              value={reason}
              onChange={(e) => {
                invalidate();
                setReason(e.target.value);
              }}
            />
          </label>
          <Button type="submit">
            Preview {mode === "manual" ? "Question" : "Import"}
          </Button>
        </fieldset>
      </form>
      {busy && !reviewed && <p role="status">Preparing preview...</p>}
      {error && <p role="alert">{error}</p>}
      {reviewed?.preview.near_matches
        ?.filter((row) => row.evidence.matches.length > 0)
        .map((row) => (
          <section
            key={row.prompt}
            className="page-stack"
            aria-label="Advisory near matches"
          >
            <h2>Possible duplicate</h2>
            <p>{row.prompt}</p>
            <ul>
              {row.evidence.matches.slice(0, 10).map((match) => (
                <li key={match.id}>
                  <Link to={`/admin/questions?question=${match.id}`}>
                    {match.question_text}
                  </Link>
                  <span> · {(match.score * 100).toFixed(1)}% similarity</span>
                </li>
              ))}
            </ul>
            <p>This candidate requires duplicate review before publication.</p>
          </section>
        ))}
      {reviewed && (
        <section className="page-stack" aria-label="Import results">
          <h2>{result ? "Import Results" : "Import Preview"}</h2>
          <p role="status">
            {result
              ? `${result.pending_review} pending review, 0 published.`
              : commitAttempted
                ? busy
                  ? "Submitting import..."
                  : "Import not yet confirmed."
                : `${rows.filter((r) => r.status === "ready").length} ready; nothing saved yet.`}{" "}
            {rows.filter((r) => r.status === "duplicate").length} duplicate,{" "}
            {rows.filter((r) => r.status === "invalid").length} rejected.
          </p>
          <ol>
            {rows.map((row) => (
              <li key={row.row}>
                <strong>{statusLabels[row.status]}</strong>
                {row.issue && <p>{row.issue}</p>}
                {row.content && (
                  <details>
                    <summary>{row.content.question_text}</summary>
                    <p>
                      {row.content.partition_keys.join(", ")} ·{" "}
                      {row.content.performance_indicator} · {row.content.question_type}{" "}
                      · {row.content.difficulty}
                    </p>
                    <ul>
                      {row.content.options.map((option) => (
                        <li key={option.id}>
                          {option.id}. {option.text}
                          {option.id === row.content?.correct_option_id
                            ? " (correct)"
                            : ""}
                        </li>
                      ))}
                    </ul>
                    <p>{row.content.explanation}</p>
                    <p>{row.content.tags.join(", ")}</p>
                  </details>
                )}
                {row.candidate_id && (
                  <Link to={`/admin/candidates?candidate=${row.candidate_id}`}>
                    Review candidate {row.row}
                  </Link>
                )}
              </li>
            ))}
          </ol>
          {!result && (
            <Button
              type="button"
              disabled={busy || !rows.some((r) => r.status === "ready")}
              onClick={() => void commit()}
            >
              {mode === "manual" ? "Create Pending Candidate" : "Import Valid Rows"}
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
