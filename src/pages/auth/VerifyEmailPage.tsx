import { Link } from "react-router-dom";

import { paths } from "../../app/urlPaths";
import { Card } from "../../components/ui/Card";

export function VerifyEmailPage() {
  return (
    <section className="centered-page">
      <Card className="narrow-card auth-card">
        <p className="eyebrow">Email Verification</p>
        <h1>Check Your Email</h1>
        <p className="muted">
          Use the verification link sent by Supabase to finish creating your account.
        </p>
        <Link to={paths.login}>Back to log in</Link>
      </Card>
    </section>
  );
}
