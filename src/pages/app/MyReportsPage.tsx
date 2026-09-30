import { useEffect, useState } from "react";

import { Card } from "../../components/ui/Card";
import {
  fetchOwnReports,
  reportCategoryLabels,
  type OwnQuestionReport,
} from "../../lib/reports/reports";

export function MyReportsPage() {
  const [reports, setReports] = useState<OwnQuestionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchOwnReports()
      .then(setReports)
      .catch((error: unknown) =>
        setMessage(error instanceof Error ? error.message : "Reports could not load."),
      )
      .finally(() => setLoading(false));
  }, []);

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
    </div>
  );
}
