import { paths } from "../../app/urlPaths";
import { useEffect, useState } from "react";
import { fetchTestHistory, type HistoryEntry } from "../../lib/sessions/session";
import { ButtonLink } from "../../components/ui/ButtonLink";
import { Card } from "../../components/ui/Card";
import {
  fetchWeeklyAllowance,
  type WeeklyAllowance,
} from "../../lib/sessions/weeklyAllowance";

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
  {
    title: "Analytics",
    detail: "Review your test scores.",
    to: paths.analytics,
    action: "Open Analytics",
  },
] as const;

export function DashboardPage() {
  const [resume, setResume] = useState<HistoryEntry | null>(null);
  const [resumeError, setResumeError] = useState("");
  const [allowance, setAllowance] = useState<WeeklyAllowance>();
  const [allowanceError, setAllowanceError] = useState(false);
  useEffect(() => {
    let revision = 0;
    function refresh() {
      const request = ++revision;
      void fetchWeeklyAllowance().then(
        (balance) => {
          if (request !== revision) return;
          setAllowance(balance);
          setAllowanceError(false);
        },
        () => {
          if (request === revision) setAllowanceError(true);
        },
      );
    }
    refresh();
    window.addEventListener("focus", refresh);
    return () => {
      revision++;
      window.removeEventListener("focus", refresh);
    };
  }, []);
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
      {allowanceError && (
        <p role="alert">
          Weekly allowances could not load. Reload the dashboard to retry.
        </p>
      )}
      {!allowanceError && allowance && !allowance.paid && (
        <section aria-labelledby="weekly-allowances">
          <h2 id="weekly-allowances">Weekly allowances</h2>
          <dl className="session-metrics">
            <div>
              <dt>Generated Tests remaining</dt>
              <dd>{allowance.generated_remaining}</dd>
            </div>
            <div>
              <dt>Test ID uses remaining</dt>
              <dd>{allowance.test_id_remaining}</dd>
            </div>
            <div>
              <dt>Shared Test, Quiz and Hardcore slots remaining</dt>
              <dd>{allowance.shared_remaining}</dd>
            </div>
          </dl>
          <p>
            Resets{" "}
            <time dateTime={allowance.resets_at}>
              {new Intl.DateTimeFormat("en", {
                weekday: "long",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
                timeZone: "UTC",
              }).format(new Date(allowance.resets_at))}{" "}
              UTC
            </time>
          </p>
        </section>
      )}
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
