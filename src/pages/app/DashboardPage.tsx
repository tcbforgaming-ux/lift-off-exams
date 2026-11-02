import { paths } from "../../app/urlPaths";
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
