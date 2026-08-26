import { Link } from "react-router-dom";

import { paths } from "../../app/urlPaths";
import { Card } from "../../components/ui/Card";

export function UnauthorizedPage() {
  return (
    <section className="centered-page">
      <Card className="narrow-card">
        <p className="eyebrow">Access Denied</p>
        <h1>Unauthorized</h1>
        <p className="muted">
          Your account does not have access to that area. Access decisions are enforced
          by trusted profile roles and database policies.
        </p>
        <Link to={paths.dashboard}>Return to dashboard</Link>
      </Card>
    </section>
  );
}
