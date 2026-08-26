import { useLocation } from "react-router-dom";

import { Card } from "../../components/ui/Card";

export function AuthPlaceholderPage() {
  const location = useLocation();
  const mode = location.pathname.includes("signup") ? "Sign Up" : "Log In";

  return (
    <section className="centered-page">
      <Card className="narrow-card">
        <p className="eyebrow">Authentication</p>
        <h1>{mode}</h1>
        <p className="muted">
          Supabase Auth screens will be implemented in the authentication milestone.
          This route exists so the production shell and navigation have stable URLs from
          day one.
        </p>
      </Card>
    </section>
  );
}
