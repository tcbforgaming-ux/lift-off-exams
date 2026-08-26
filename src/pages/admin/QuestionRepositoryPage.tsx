import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import {
  QUESTION_REPOSITORY_SEARCH_DELAY_MS,
  fetchQuestionRepositoryPage,
  parseQuestionRepositoryFilters,
  setQuestionLifecycleState,
  writeQuestionRepositoryFilters,
  type QuestionLifecycleState,
  type QuestionRepositoryFilters,
  type QuestionRepositoryRow,
} from "../../lib/questions/repository";

const partitionOptions = [
  "Business Administration Core",
  "Marketing",
  "Finance",
  "Business Management and Administration",
  "Hospitality and Tourism",
  "Entrepreneurship",
];

const difficultyOptions = [
  { value: "E", label: "Easy" },
  { value: "M", label: "Medium" },
  { value: "H", label: "Hard" },
];

const questionTypeOptions = [
  { value: "S", label: "Scenario" },
  { value: "D", label: "Definition" },
  { value: "F", label: "Fill in the Blank" },
  { value: "A", label: "All Except" },
];

type CursorState = {
  cursorUpdatedAt: string | null;
  cursorId: string | null;
};

type PendingLifecycleAction = {
  question: QuestionRepositoryRow;
  newState: QuestionLifecycleState;
} | null;

function nextLifecycleState(state: QuestionLifecycleState): QuestionLifecycleState {
  return state === "Active" ? "Retired" : "Active";
}

function actionLabel(state: QuestionLifecycleState) {
  return state === "Active" ? "Restore" : "Retire";
}

function statusClassName(state: QuestionLifecycleState) {
  return state === "Active" ? "status-pill status-pill-active" : "status-pill";
}

export function QuestionRepositoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(
    () => parseQuestionRepositoryFilters(searchParams),
    [searchParams],
  );
  const [searchInput, setSearchInput] = useState(filters.search);
  const [rows, setRows] = useState<QuestionRepositoryRow[]>([]);
  const [cursorHistory, setCursorHistory] = useState<CursorState[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingLifecycleAction>(null);
  const [reason, setReason] = useState("");
  const [submittingQuestionId, setSubmittingQuestionId] = useState<string | null>(null);

  const hasNextPage = rows.some((row) => row.has_next_page);
  const hasPreviousPage = cursorHistory.length > 0;

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchInput === filters.search) return;

      const nextParams = writeQuestionRepositoryFilters(searchParams, {
        search: searchInput,
        cursorUpdatedAt: null,
        cursorId: null,
      });
      setCursorHistory([]);
      setSearchParams(nextParams, { replace: true });
    }, QUESTION_REPOSITORY_SEARCH_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [filters.search, searchInput, searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setMessage("");

    fetchQuestionRepositoryPage(filters)
      .then((nextRows) => {
        if (cancelled) return;
        setRows(nextRows);
        setStatus("idle");
        setMessage(nextRows.length === 0 ? "No questions matched those filters." : "");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setRows([]);
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "The question repository could not be loaded.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [filters]);

  function updateFilters(nextFilters: Partial<QuestionRepositoryFilters>) {
    const nextParams = writeQuestionRepositoryFilters(searchParams, {
      ...nextFilters,
      cursorUpdatedAt: null,
      cursorId: null,
    });
    setCursorHistory([]);
    setSearchParams(nextParams);
  }

  function clearFilters() {
    setCursorHistory([]);
    setSearchParams(new URLSearchParams());
  }

  function goNextPage() {
    const lastRow = rows.at(-1);
    if (!lastRow || !hasNextPage) return;

    setCursorHistory((history) => [
      ...history,
      {
        cursorUpdatedAt: filters.cursorUpdatedAt,
        cursorId: filters.cursorId,
      },
    ]);

    setSearchParams(
      writeQuestionRepositoryFilters(searchParams, {
        cursorUpdatedAt: lastRow.updated_at,
        cursorId: lastRow.question_id,
      }),
    );
  }

  function goPreviousPage() {
    const previousCursor = cursorHistory.at(-1);
    if (!previousCursor) return;

    setCursorHistory((history) => history.slice(0, -1));
    setSearchParams(writeQuestionRepositoryFilters(searchParams, previousCursor));
  }

  function openLifecycleAction(question: QuestionRepositoryRow) {
    const newState = nextLifecycleState(question.lifecycle_state);
    setPendingAction({ question, newState });
    setReason(`${actionLabel(newState)} after repository review`);
    setMessage("");
  }

  async function submitLifecycleAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingAction || submittingQuestionId) return;

    setSubmittingQuestionId(pendingAction.question.question_id);
    setMessage("");

    try {
      const result = await setQuestionLifecycleState(
        pendingAction.question.question_id,
        pendingAction.newState,
        reason,
      );
      const nextState = result?.lifecycle_state ?? pendingAction.newState;

      setRows((currentRows) =>
        currentRows.map((row) =>
          row.question_id === pendingAction.question.question_id
            ? {
                ...row,
                lifecycle_state: nextState,
                updated_at: result?.updated_at ?? row.updated_at,
              }
            : row,
        ),
      );
      setMessage(`Question ${actionLabel(nextState).toLowerCase()}d.`);
      setPendingAction(null);
      setReason("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The lifecycle action could not be completed.",
      );
    } finally {
      setSubmittingQuestionId(null);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Administration</p>
        <h1>Question Repository</h1>
        <p>
          Search, filter, retire, and restore questions through bounded staff-only
          Supabase queries.
        </p>
      </header>

      <Card className="repository-panel">
        <form className="repository-filters" aria-label="Question repository filters">
          <label className="field-label">
            Keyword
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Question, explanation, PI, tag, id"
            />
          </label>

          <label className="field-label">
            Status
            <select
              value={filters.lifecycleState}
              onChange={(event) =>
                updateFilters({
                  lifecycleState: event.target
                    .value as QuestionRepositoryFilters["lifecycleState"],
                })
              }
            >
              <option value="Active">Active</option>
              <option value="Retired">Retired</option>
              <option value="All">All</option>
            </select>
          </label>

          <label className="field-label">
            Category
            <select
              value={filters.partitionKey}
              onChange={(event) => updateFilters({ partitionKey: event.target.value })}
            >
              <option value="">All</option>
              {partitionOptions.map((partition) => (
                <option key={partition} value={partition}>
                  {partition}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Difficulty
            <select
              value={filters.difficulty}
              onChange={(event) => updateFilters({ difficulty: event.target.value })}
            >
              <option value="">All</option>
              {difficultyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Type
            <select
              value={filters.questionType}
              onChange={(event) => updateFilters({ questionType: event.target.value })}
            >
              <option value="">All</option>
              {questionTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Performance Indicator
            <input
              value={filters.performanceIndicator}
              onChange={(event) =>
                updateFilters({ performanceIndicator: event.target.value })
              }
              placeholder="PI code"
            />
          </label>

          <label className="field-label">
            Topic Tag
            <input
              value={filters.tag}
              onChange={(event) => updateFilters({ tag: event.target.value })}
              placeholder="One tag"
            />
          </label>

          <label className="field-label">
            Page Size
            <select
              value={filters.pageSize}
              onChange={(event) =>
                updateFilters({ pageSize: Number(event.target.value) })
              }
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          <div className="repository-filter-actions">
            <Button type="button" variant="secondary" onClick={clearFilters}>
              Clear
            </Button>
          </div>
        </form>
      </Card>

      <Card className="repository-panel">
        <div className="repository-toolbar">
          <p className="muted" role="status" aria-live="polite">
            {status === "loading"
              ? "Loading questions..."
              : message || `Loaded ${rows.length} question records.`}
          </p>
          <div className="button-row">
            <Button
              type="button"
              variant="secondary"
              onClick={goPreviousPage}
              disabled={!hasPreviousPage || status === "loading"}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={goNextPage}
              disabled={!hasNextPage || status === "loading"}
            >
              Next
            </Button>
          </div>
        </div>

        {status === "error" && (
          <p className="form-message form-message-error">{message}</p>
        )}

        {status !== "error" && rows.length === 0 && status !== "loading" && (
          <div className="empty-state">
            <h2>No Results</h2>
            <p className="muted">
              Try clearing filters or broadening the keyword search.
            </p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="repository-table-wrap">
            <table className="repository-table">
              <caption>Administrative question repository results</caption>
              <thead>
                <tr>
                  <th scope="col">Status</th>
                  <th scope="col">Question</th>
                  <th scope="col">Metadata</th>
                  <th scope="col">Tags</th>
                  <th scope="col">Updated</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.question_id}>
                    <td>
                      <span className={statusClassName(row.lifecycle_state)}>
                        {row.lifecycle_state}
                      </span>
                    </td>
                    <td>
                      <strong>{row.question_text}</strong>
                      <span className="repository-id">{row.question_id}</span>
                    </td>
                    <td>
                      <span>{row.partition_key}</span>
                      <span>{row.performance_indicator || "No PI"}</span>
                      <span>
                        {row.difficulty} - {row.question_type}
                      </span>
                    </td>
                    <td>
                      <div className="tag-stack">
                        {row.tags.length > 0 ? (
                          row.tags.map((tag) => <span key={tag}>{tag}</span>)
                        ) : (
                          <span>No tags</span>
                        )}
                      </div>
                    </td>
                    <td>{new Date(row.updated_at).toLocaleDateString()}</td>
                    <td>
                      <Button
                        type="button"
                        variant={
                          row.lifecycle_state === "Active" ? "secondary" : "primary"
                        }
                        onClick={() => openLifecycleAction(row)}
                        disabled={submittingQuestionId === row.question_id}
                      >
                        {actionLabel(nextLifecycleState(row.lifecycle_state))}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {pendingAction && (
        <div className="modal-backdrop" role="presentation">
          <form
            className="modal-card surface-card"
            onSubmit={(event) => {
              void submitLifecycleAction(event);
            }}
            aria-labelledby="lifecycle-action-title"
          >
            <h2 id="lifecycle-action-title">
              {actionLabel(pendingAction.newState)} Question
            </h2>
            <p className="muted">{pendingAction.question.question_text}</p>
            <label className="field-label">
              Reason
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                minLength={5}
                required
              />
            </label>
            <div className="button-row">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPendingAction(null);
                  setReason("");
                }}
                disabled={submittingQuestionId !== null}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submittingQuestionId !== null}>
                Confirm
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
