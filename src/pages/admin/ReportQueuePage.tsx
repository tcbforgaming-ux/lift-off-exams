import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { Card } from "../../components/ui/Card";
import {
  fetchReportQueue,
  reportCategories,
  reportCategoryLabels,
  type ReportQueueRow,
} from "../../lib/reports/reports";

export function ReportQueuePage() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const category = params.get("category") ?? "";
  const [reports, setReports] = useState<ReportQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setLoading(true);
    setMessage("");
    fetchReportQueue({ status, category })
      .then(setReports)
      .catch((error: unknown) =>
        setMessage(error instanceof Error ? error.message : "Queue could not load."),
      )
      .finally(() => setLoading(false));
  }, [category, status]);

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Administration</p>
        <h1>Question Report Queue</h1>
        <p>
          Review user-submitted question concerns without exposing reports to other
          users.
        </p>
      </header>
      <Card>
        <div className="repository-filters">
          <label className="field-label">
            Status
            <select
              value={status}
              onChange={(event) => setFilter("status", event.target.value)}
            >
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="in_review">In review</option>
              <option value="resolved">Resolved</option>
              <option value="rejected">Rejected</option>
              <option value="duplicate">Duplicate</option>
            </select>
          </label>
          <label className="field-label">
            Category
            <select
              value={category}
              onChange={(event) => setFilter("category", event.target.value)}
            >
              <option value="">All</option>
              {reportCategories.map((value) => (
                <option key={value} value={value}>
                  {reportCategoryLabels[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>
      {loading && <p role="status">Loading report queue…</p>}
      {message && (
        <p className="form-message form-message-error" role="alert">
          {message}
        </p>
      )}
      {!loading && !message && reports.length === 0 && (
        <Card className="empty-state">
          <h2>Queue is clear</h2>
        </Card>
      )}
      {reports.length > 0 && (
        <Card className="repository-panel">
          <div className="repository-table-wrap">
            <table className="repository-table">
              <caption>Question reports awaiting or completing review</caption>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Category</th>
                  <th>Question metadata</th>
                  <th>Reporter</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => (
                  <tr key={report.report_id}>
                    <td>
                      <span className={`status-pill status-${report.report_status}`}>
                        {report.report_status.replace("_", " ")}
                      </span>
                    </td>
                    <td>{reportCategoryLabels[report.category]}</td>
                    <td>
                      <span>{report.performance_indicator}</span>
                      <span>
                        {report.difficulty} · {report.question_type}
                      </span>
                      <span>{report.lifecycle_state}</span>
                    </td>
                    <td>{report.reporter_email ?? "Unavailable"}</td>
                    <td>{new Date(report.updated_at).toLocaleString()}</td>
                    <td>
                      <Link
                        className="button button-secondary"
                        to={`/admin/reports/${report.report_id}`}
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
