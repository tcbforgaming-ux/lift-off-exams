import { useEffect, useState } from "react";

import { Card } from "../../components/ui/Card";
import { CursorNavigation } from "../../components/ui/CursorNavigation";
import {
  fetchAuditLogs,
  type AuditLogRow,
  type ReportCursor,
} from "../../lib/reports/reports";

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [filters, setFilters] = useState({
    actorUserId: "",
    resourceId: "",
    reportId: "",
    createdFrom: "",
    createdTo: "",
  });
  const [cursors, setCursors] = useState<ReportCursor[]>([]);
  const cursor = cursors.at(-1);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setMessage("");
    fetchAuditLogs(undefined, {
      cursor,
      action,
      resourceType,
      ...filters,
      createdFrom: filters.createdFrom
        ? new Date(filters.createdFrom).toISOString()
        : undefined,
      createdTo: filters.createdTo
        ? new Date(filters.createdTo).toISOString()
        : undefined,
    })
      .then((rows) => {
        if (active) setLogs(rows);
      })
      .catch(
        (error: unknown) =>
          active &&
          setMessage(
            error instanceof Error ? error.message : "Audit history could not load.",
          ),
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cursor, action, resourceType, filters]);

  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Administration</p>
        <h1>Audit Log</h1>
        <p>Immutable staff actions recorded by trusted database functions.</p>
      </header>
      <div className="repository-filters">
        {(
          [
            ["actorUserId", "Actor user ID", "text"],
            ["resourceId", "Resource ID", "text"],
            ["reportId", "Report ID", "text"],
            ["createdFrom", "Created from", "datetime-local"],
            ["createdTo", "Created to", "datetime-local"],
          ] as const
        ).map(([key, label, type]) => (
          <label className="field-label" key={key}>
            {label}
            <input
              type={type}
              value={filters[key]}
              onChange={(event) => {
                setFilters((current) => ({ ...current, [key]: event.target.value }));
                setCursors([]);
              }}
            />
          </label>
        ))}
        <label className="field-label">
          Action
          <input
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setCursors([]);
            }}
          />
        </label>
        <label className="field-label">
          Resource type
          <input
            value={resourceType}
            onChange={(event) => {
              setResourceType(event.target.value);
              setCursors([]);
            }}
          />
        </label>
      </div>
      {loading && <p role="status">Loading audit history...</p>}
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
      <CursorNavigation
        page={cursors.length}
        loading={loading}
        hasNext={!message && Boolean(logs.at(-1)?.has_next_page)}
        onPrevious={() => setCursors((items) => items.slice(0, -1))}
        onNext={() => {
          const last = logs.at(-1);
          if (last)
            setCursors((items) => [
              ...items,
              { at: last.created_at, id: last.audit_id },
            ]);
        }}
      />
    </div>
  );
}
