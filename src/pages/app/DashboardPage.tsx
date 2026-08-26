import { Card } from "../../components/ui/Card";

const dashboardAreas = [
  "Practice setup",
  "Test ID entry",
  "Teams and assignments",
  "History and analytics",
];

export function DashboardPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Application</p>
        <h1>Dashboard</h1>
        <p>
          The production dashboard route is ready for feature milestones. No test, quiz,
          subscription, analytics, or admin functionality is wired in Milestone 0.
        </p>
      </header>

      <section className="grid two-column">
        {dashboardAreas.map((area) => (
          <Card key={area}>
            <h2>{area}</h2>
            <p className="muted">Reserved for a later milestone.</p>
          </Card>
        ))}
      </section>
    </div>
  );
}
