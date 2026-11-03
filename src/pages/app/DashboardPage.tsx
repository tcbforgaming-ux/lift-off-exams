import { paths } from "../../app/urlPaths";
import { useEffect, useState } from "react";
import { fetchTestHistory, type HistoryEntry } from "../../lib/sessions/session";
import { ButtonLink } from "../../components/ui/ButtonLink";
import { Card } from "../../components/ui/Card";

const dashboardAreas = [
  {
    title: "Generate a test",
    detail: "Choose your exam topics and practice settings.",
    to: paths.generate,
    action: "Generate Test",
  },
  {
    title: "Test ID entry",
    detail: "Preview and launch a permanent shared Test ID.",
    to: paths.testId,
    action: "Open Test ID",
  },
] as const;

export function DashboardPage() {
  const [resume, setResume] = useState<HistoryEntry | null>(null);
  const [resumeError, setResumeError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([
      fetchTestHistory({ pageSize: 1, status: "paused" }),
      fetchTestHistory({ pageSize: 1, status: "in_progress" }),
    ])
      .then((pages) => {
        if (!active) return;
        const latest = pages
          .flat()
          .sort((a, b) => b.last_activity_at.localeCompare(a.last_activity_at))[0];
        setResume(latest ?? null);
      })
      .catch(() => {
        if (active)
          setResumeError("Unfinished sessions could not load. Open History to retry.");
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Application</p>
        <h1>Dashboard</h1>
        <p>
          Start a new practice test, open a shared Test ID, or review your results in
          History.
        </p>
      </header>

      {resumeError && <p role="alert">{resumeError}</p>}
      {resume && (
        <section className="paused-banner" aria-label="Resume unfinished test">
          <div>
            <strong>Continue your unfinished test?</strong>
            <p>
              {resume.category} · {resume.test_id}
            </p>
          </div>
          <ButtonLink to={`/sessions/${resume.session_id}`}>Resume Session</ButtonLink>
        </section>
      )}

      <section className="grid two-column">
        {dashboardAreas.map((area) => (
          <Card key={area.title}>
            <h2>{area.title}</h2>
            <p className="muted">{area.detail}</p>
            <ButtonLink to={area.to} variant="secondary">
              {area.action}
            </ButtonLink>
          </Card>
        ))}
      </section>
    </div>
  );
}
