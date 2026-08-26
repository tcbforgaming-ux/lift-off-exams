import { paths } from "../../app/urlPaths";
import { ButtonLink } from "../../components/ui/ButtonLink";
import { Card } from "../../components/ui/Card";

const foundationItems = [
  "Supabase-backed application boundary",
  "Route-first product structure",
  "Responsive shell and design tokens",
  "CI-ready lint, type, test, and build checks",
];

export function LandingPage() {
  return (
    <div className="page-stack">
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Production Rebuild</p>
          <h1>Lift Off Exams</h1>
          <p>
            A production foundation for DECA practice, seeded exams, team assignments,
            and question quality workflows.
          </p>
          <div className="button-row">
            <ButtonLink to={paths.signup}>Create Account</ButtonLink>
            <ButtonLink to={paths.login} variant="secondary">
              Log In
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="grid two-column">
        {foundationItems.map((item) => (
          <Card key={item}>
            <p className="eyebrow">Foundation</p>
            <h2>{item}</h2>
            <p className="muted">
              Milestone 0 establishes structure only. Product workflows are
              intentionally deferred to later milestones.
            </p>
          </Card>
        ))}
      </section>
    </div>
  );
}
