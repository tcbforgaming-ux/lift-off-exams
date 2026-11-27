import { useEffect, useState } from "react";

import { Card } from "../../components/ui/Card";
import { CursorNavigation } from "../../components/ui/CursorNavigation";
import {
  fetchOwnReports,
  reportCategoryLabels,
  type OwnQuestionReport,
  type ReportCursor,
} from "../../lib/reports/reports";

export function MyReportsPage() {
  const [reports, setReports] = useState<OwnQuestionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [cursors, setCursors] = useState<ReportCursor[]>([]);
  const cursor = cursors.at(-1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessage("");
    fetchOwnReports(cursor)
      .then((rows) => {
        if (active) setReports(rows);
      })
      .catch(
        (error: unknown) =>
          active &&
          setMessage(
            error instanceof Error ? error.message : "Reports could not load.",
          ),
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cursor]);

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Support</p>
        <h1>My Reports</h1>
        <p>Track questions you have reported and read the final review response.</p>
      </header>
      {loading && <p role="status">Loading reports…</p>}
      {message && (
        <p className="form-message form-message-error" role="alert">
          {message}
        </p>
      )}
      {!loading && !message && reports.length === 0 && (
        <Card className="empty-state">
          <h2>No reports yet</h2>
          <p>Reports submitted from tests appear here.</p>
        </Card>
      )}
      <div className="report-card-grid">
        {reports.map((report) => (
          <Card key={report.report_id} className="report-card">
            <div className="repository-toolbar">
              <strong>{reportCategoryLabels[report.category]}</strong>
              <span className={`status-pill status-${report.report_status}`}>
                {report.report_status.replace("_", " ")}
              </span>
            </div>
            <p className="muted">Test ID {report.test_id}</p>
            <p>Submitted {new Date(report.created_at).toLocaleString()}</p>
            {report.resolution_message && (
              <div className="explanation-panel">
                <strong>Review response</strong>
                <p>{report.resolution_message}</p>
              </div>
            )}
          </Card>
        ))}
      </div>
      <CursorNavigation
        page={cursors.length}
        loading={loading}
        hasNext={!message && Boolean(reports.at(-1)?.has_next_page)}
        onPrevious={() => setCursors((items) => items.slice(0, -1))}
        onNext={() => {
          const last = reports.at(-1);
          if (last)
            setCursors((items) => [
              ...items,
              { at: last.created_at, id: last.report_id },
            ]);
        }}
      />
    </div>
  );
}
