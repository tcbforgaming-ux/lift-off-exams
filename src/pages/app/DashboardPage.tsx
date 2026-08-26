import { paths } from "../../app/urlPaths";
import { ButtonLink } from "../../components/ui/ButtonLink";
import { Card } from "../../components/ui/Card";

const dashboardAreas = [
  {
    title: "Practice setup",
    detail: "Generate a deterministic test from an approved blueprint.",
    to: paths.practiceSetup,
    action: "Set Up Practice",
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
          Start an approved blueprint test or open a permanent Test ID. Test-taking and
          results remain separate future milestones.
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
