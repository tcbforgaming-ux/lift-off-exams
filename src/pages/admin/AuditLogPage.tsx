import { useEffect, useState } from "react";

import { Card } from "../../components/ui/Card";
import { fetchAuditLogs, type AuditLogRow } from "../../lib/reports/reports";

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    fetchAuditLogs()
      .then(setLogs)
      .catch((error: unknown) =>
        setMessage(
          error instanceof Error ? error.message : "Audit history could not load.",
        ),
      );
  }, []);

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Administration</p>
        <h1>Audit Log</h1>
        <p>Immutable staff actions recorded by trusted database functions.</p>
      </header>
      {message && (
        <p className="form-message form-message-error" role="alert">
          {message}
        </p>
      )}
      <div className="report-card-grid">
        {logs.map((log) => (
          <Card key={log.audit_id} className="report-card">
            <div className="repository-toolbar">
              <strong>{log.action}</strong>
              <span className="status-pill">{log.actor_role}</span>
            </div>
            <p>{log.reason || "No reason recorded."}</p>
            <p className="muted">
              {log.actor_email ?? log.actor_user_id} ·{" "}
              {new Date(log.created_at).toLocaleString()}
            </p>
            <p className="repository-id">
              {log.resource_type}: {log.resource_id}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
