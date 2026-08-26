import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { paths } from "../../app/urlPaths";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { signInWithEmail, signInWithGoogle } from "../../lib/auth/authActions";
import { sanitizeRedirectPath } from "../../lib/auth/redirects";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "google">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const redirectTo = sanitizeRedirectPath(
    (location.state as { from?: string } | null)?.from,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);

    const { error } = await signInWithEmail(getSupabaseBrowserClient(), {
      email,
      password,
    });

    if (error) {
      setMessage("We could not sign you in with those credentials.");
      setStatus("idle");
      return;
    }

    void navigate(redirectTo, { replace: true });
  }

  async function handleGoogleSignIn() {
    setStatus("google");
    setMessage(null);
    const { error } = await signInWithGoogle(getSupabaseBrowserClient());
    if (error) {
      setMessage("Google sign-in could not be started. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <section className="centered-page">
      <Card className="narrow-card auth-card">
        <p className="eyebrow">Welcome Back</p>
        <h1>Log In</h1>
        <form
          className="form-stack"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <label className="field-label" htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            autoComplete="email"
            inputMode="email"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label className="field-label" htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            autoComplete="current-password"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          {message && (
            <p className="form-message form-message-error" role="alert">
              {message}
            </p>
          )}

          <Button type="submit" disabled={status !== "idle"}>
            {status === "loading" ? "Signing In" : "Log In"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={status !== "idle"}
            onClick={() => {
              void handleGoogleSignIn();
            }}
          >
            {status === "google" ? "Opening Google" : "Continue with Google"}
          </Button>
        </form>
        <div className="auth-links">
          <Link to={paths.forgotPassword}>Forgot Password?</Link>
          <Link to={paths.signup}>Create an account</Link>
        </div>
      </Card>
    </section>
  );
}
