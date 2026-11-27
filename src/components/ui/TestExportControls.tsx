import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";
import {
  exportRows,
  makeCsv,
  type ExportFormat,
  type ExportKind,
} from "../../lib/exports/testExport";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";

type Props = {
  kind: ExportKind;
  session?: string;
  range?: string;
  from?: string;
  through?: string;
  dateFilter?: boolean;
  disabled?: boolean;
};

export function TestExportControls({
  kind,
  session,
  range,
  from,
  through,
  dateFilter,
  disabled,
}: Props) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [pending, setPending] = useState<ExportFormat>();
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const active = useRef(true);
  const inFlight = useRef(false);
  const retry = useRef<Partial<Record<ExportFormat, { scope: string; id: string }>>>(
    {},
  );
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  async function download(format: ExportFormat) {
    if (inFlight.current || disabled) return;
    const custom = dateFilter && Boolean(start || end);
    if (custom && (!start || !end || start > end)) {
      setFailed(true);
      setMessage("Enter both dates in chronological order.");
      return;
    }
    inFlight.current = true;
    setPending(format);
    setFailed(false);
    setMessage("");
    try {
      const options = {
        p_kind: kind,
        p_format: format,
        p_session: session,
        p_range: custom ? "custom" : (range ?? "lifetime"),
        p_from: custom ? start : from || undefined,
        p_to: custom ? end : through || undefined,
      };
      const scope = JSON.stringify(options);
      const previous = retry.current[format];
      const id = previous?.scope === scope ? previous.id : crypto.randomUUID();
      retry.current[format] = { scope, id };
      const { data, error } = await getSupabaseBrowserClient().rpc(
        "prepare_my_test_export",
        { ...options, p_request: id },
      );
      if (!active.current) return;
      if (error) {
        if (error.message === "Subscription changed. Start a new export.")
          delete retry.current[format];
        throw new Error(error.message || "Export could not be prepared. Try again.");
      }
      if (
        data &&
        typeof data === "object" &&
        !Array.isArray(data) &&
        data.empty === true
      ) {
        delete retry.current[format];
        setMessage("No completed Test Mode results match this scope.");
        return;
      }
      const rows = exportRows(kind, data);
      const blob =
        format === "csv"
          ? makeCsv(rows)
          : (await import("../../lib/exports/testExportPdf")).makePdf(kind, rows);
      if (!active.current) return;
      if (
        !blob.size ||
        !blob.type.startsWith(format === "pdf" ? "application/pdf" : "text/csv")
      )
        throw new Error("The export file could not be created. Try again.");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `lift-off-test-${kind}${session ? "-" + session : ""}.${format}`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      delete retry.current[format];
      setMessage(`${format.toUpperCase()} download started.`);
    } catch (error) {
      if (!active.current) return;
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Export failed. Try again.");
    } finally {
      inFlight.current = false;
      if (active.current) setPending(undefined);
    }
  }

  return (
    <section className="form-stack" aria-label="Export Test Mode data">
      <h2>Export</h2>
      <p>
        {kind === "result"
          ? "This completed Test Mode result."
          : kind === "analytics"
            ? dateFilter
              ? "Past 30 days of Test Mode analytics unless you choose dates below."
              : "Tests only for the applied date range. Quizzes are excluded."
            : "Completed Test Mode results only."}
      </p>
      {dateFilter && (
        <div className="grid two-column">
          <label className="field-label">
            Export from (UTC)
            <input
              type="date"
              value={start}
              disabled={Boolean(pending)}
              onChange={(event) => setStart(event.target.value)}
            />
          </label>
          <label className="field-label">
            Export through (UTC)
            <input
              type="date"
              value={end}
              min={start || undefined}
              disabled={Boolean(pending)}
              onChange={(event) => setEnd(event.target.value)}
            />
          </label>
        </div>
      )}
      <div className="repository-toolbar">
        {(["pdf", "csv"] as const).map((format) => (
          <Button
            key={format}
            type="button"
            variant="secondary"
            disabled={disabled || Boolean(pending)}
            onClick={() => void download(format)}
          >
            Download {format.toUpperCase()}
          </Button>
        ))}
      </div>
      {pending && <p role="status">Preparing {pending.toUpperCase()}…</p>}
      {message && <p role={failed ? "alert" : "status"}>{message}</p>}
    </section>
  );
}
