import { paths } from "../../app/urlPaths";
import { ButtonLink } from "../../components/ui/ButtonLink";

export function LandingPage() {
  return (
    <div className="page-stack">
      <section className="hero-section">
        <div className="hero-copy">
          <h1>Lift Off Exams</h1>
          <p>Learn Smarter, Not Harder</p>
          <p>Practice for DECA, share tests by ID, and review your results.</p>
          <div className="button-row">
            <ButtonLink to={paths.signup}>Create Account</ButtonLink>
            <ButtonLink to={paths.login} variant="secondary">
              Log In
            </ButtonLink>
            <ButtonLink to={paths.testId} variant="secondary">
              Open Test ID
            </ButtonLink>
          </div>
        </div>
      </section>
    </div>
  );
}
