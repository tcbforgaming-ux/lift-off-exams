import { paths } from "../../app/urlPaths";
import { ButtonLink } from "../../components/ui/ButtonLink";
import { Card } from "../../components/ui/Card";

const areas = [
  {
    title: "Questions",
    description: "Search and maintain the published question repository.",
    to: paths.adminQuestions,
    action: "Open Questions",
  },
  {
    title: "Generation Pipeline",
    description: "Review generated candidates and monitor imports.",
    to: paths.adminGeneration,
    action: "Review Candidates",
  },
  {
    title: "Report Queue",
    description: "Investigate reported questions and record resolutions.",
    to: paths.adminReports,
    action: "Review Reports",
  },
  {
    title: "Audit Log",
    description: "Review the history of administrative actions.",
    to: paths.adminAudit,
    action: "View Audit Log",
  },
];

export function AdminDashboardPage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <p className="eyebrow">Administration</p>
        <h1>Admin Dashboard</h1>
      </header>
      <section className="grid two-column" aria-label="Administrative tools">
        {areas.map((area) => (
          <Card key={area.to} className="admin-tool">
            <h2>{area.title}</h2>
            <p className="muted">{area.description}</p>
            <ButtonLink to={area.to} variant="secondary">
              {area.action}
            </ButtonLink>
          </Card>
        ))}
      </section>
    </div>
  );
}
