import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import {
  GENERATION_PIPELINE_SEARCH_DELAY_MS,
  fetchGenerationPipelinePage,
  parseGenerationPipelineFilters,
  writeGenerationPipelineFilters,
  type GenerationPipelineFilters,
  type GenerationPipelineRow,
} from "../../lib/generation/pipeline";

const categoryOptions = [
  "Business Administration Core",
  "Marketing",
  "Finance",
  "Business Management and Administration",
  "Hospitality and Tourism",
  "Entrepreneurship",
];

const queueStatusOptions = ["queued", "locked", "satisfied", "failed", "retired"];

type CursorState = {
  cursorUpdatedAt: string | null;
  cursorId: string | null;
};

function formatJsonList(value: unknown) {
  if (!Array.isArray(value)) return "None";
  return value.filter((item) => typeof item === "string").join(", ") || "None";
}

function formatCount(row: GenerationPipelineRow) {
  return [
    `S ${row.scenario_needed}`,
    `D ${row.definition_needed}`,
    `F ${row.fill_needed}`,
    `A ${row.all_except_needed}`,
  ].join(" / ");
}

function statusClassName(status: string | null) {
  return status === "queued" || status === "imported" || status === "completed"
    ? "status-pill status-pill-active"
    : "status-pill";
}

export function GenerationPipelinePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(
    () => parseGenerationPipelineFilters(searchParams),
    [searchParams],
  );
  const [searchInput, setSearchInput] = useState(filters.search);
  const [rows, setRows] = useState<GenerationPipelineRow[]>([]);
  const [cursorHistory, setCursorHistory] = useState<CursorState[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  const hasNextPage = rows.some((row) => row.has_next_page);
  const hasPreviousPage = cursorHistory.length > 0;

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchInput === filters.search) return;

      const nextParams = writeGenerationPipelineFilters(searchParams, {
        search: searchInput,
        cursorUpdatedAt: null,
        cursorId: null,
      });
      setCursorHistory([]);
      setSearchParams(nextParams, { replace: true });
    }, GENERATION_PIPELINE_SEARCH_DELAY_MS);

    return () => window.clearTimeout(timeout);
  }, [filters.search, searchInput, searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setMessage("");

    fetchGenerationPipelinePage(filters)
      .then((nextRows) => {
        if (cancelled) return;
        setRows(nextRows);
        setStatus("idle");
        setMessage(
          nextRows.length === 0 ? "No pipeline records matched those filters." : "",
        );
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setRows([]);
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "The generation pipeline could not be loaded.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [filters]);

  function updateFilters(nextFilters: Partial<GenerationPipelineFilters>) {
    const nextParams = writeGenerationPipelineFilters(searchParams, {
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
      writeGenerationPipelineFilters(searchParams, {
        cursorUpdatedAt: lastRow.queue_updated_at,
        cursorId: lastRow.queue_id,
      }),
    );
  }

  function goPreviousPage() {
    const previousCursor = cursorHistory.at(-1);
    if (!previousCursor) return;

    setCursorHistory((history) => history.slice(0, -1));
    setSearchParams(writeGenerationPipelineFilters(searchParams, previousCursor));
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Administration</p>
        <h1>Generation Pipeline</h1>
        <p>
          Monitor Make Scheduler, OpenAI Batch, import offsets, and generated question
          candidate status without exposing scheduler secrets.
        </p>
      </header>

      <Card className="repository-panel">
        <form className="repository-filters" aria-label="Generation pipeline filters">
          <label className="field-label">
            Keyword
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Queue id, PI, batch id, error"
            />
          </label>

          <label className="field-label">
            Queue Status
            <select
              value={filters.status}
              onChange={(event) => updateFilters({ status: event.target.value })}
            >
              <option value="">All</option>
              {queueStatusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Category
            <select
              value={filters.category}
              onChange={(event) => updateFilters({ category: event.target.value })}
            >
              <option value="">All</option>
              {categoryOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="field-label">
            Has Errors
            <select
              value={filters.hasErrors}
              onChange={(event) =>
                updateFilters({
                  hasErrors: event.target
                    .value as GenerationPipelineFilters["hasErrors"],
                })
              }
            >
              <option value="all">All</option>
              <option value="yes">Errors only</option>
              <option value="no">No errors</option>
            </select>
          </label>

          <label className="field-label">
            Batch Job ID
            <input
              value={filters.batchJobId}
              onChange={(event) => updateFilters({ batchJobId: event.target.value })}
              placeholder="UUID"
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
              ? "Loading generation pipeline..."
              : message || `Loaded ${rows.length} pipeline records.`}
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
            <h2>No Pipeline Records</h2>
            <p className="muted">Try clearing filters or loading queue data.</p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="repository-table-wrap">
            <table className="repository-table pipeline-table">
              <caption>Administrative generation pipeline status</caption>
              <thead>
                <tr>
                  <th scope="col">Queue</th>
                  <th scope="col">Need</th>
                  <th scope="col">Partitions</th>
                  <th scope="col">Batch</th>
                  <th scope="col">Import</th>
                  <th scope="col">Errors</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.queue_id}>
                    <td>
                      <span className={statusClassName(row.queue_status)}>
                        {row.queue_status}
                      </span>
                      <strong>{row.indicator_code}</strong>
                      <span>{row.performance_indicator || "No PI label"}</span>
                      <span className="repository-id">{row.queue_id}</span>
                    </td>
                    <td>
                      <strong>{formatCount(row)}</strong>
                      <span>Priority {row.priority}</span>
                    </td>
                    <td>
                      <strong>{row.category}</strong>
                      <span>{row.partition_key}</span>
                      <span>{formatJsonList(row.partition_keys)}</span>
                    </td>
                    <td>
                      <span className={statusClassName(row.batch_status)}>
                        {row.batch_status || "No batch"}
                      </span>
                      <span>{row.openai_batch_id || "No OpenAI batch"}</span>
                      <span className="repository-id">
                        {row.locked_by_batch_id || "Not locked"}
                      </span>
                    </td>
                    <td>
                      <strong>
                        {row.imported_count ?? 0} imported / {row.failed_count ?? 0}{" "}
                        failed
                      </strong>
                      <span>
                        Offset {row.import_offset ?? 0} of {row.row_count ?? 0}
                      </span>
                      <span>
                        {row.output_file_id || row.input_file_id || "No file"}
                      </span>
                    </td>
                    <td>
                      <span>{row.queue_last_error || row.batch_error || "None"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
