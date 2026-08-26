import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { paths } from "../../app/urlPaths";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { signInWithGoogle, signUpWithEmail } from "../../lib/auth/authActions";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";

const minimumPasswordLength = 8;

export function SignupPage() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "google" | "sent">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (password.length < minimumPasswordLength) {
      setMessage("Use at least 8 characters for your password.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }

    setStatus("loading");
    const { error } = await signUpWithEmail(getSupabaseBrowserClient(), {
      displayName,
      email,
      password,
    });

    if (error) {
      setMessage("We could not create that account. Please review your details.");
      setStatus("idle");
      return;
    }

    setStatus("sent");
    setMessage("Check your email to verify your account.");
  }

  async function handleGoogleSignIn() {
    setStatus("google");
    setMessage(null);
    const { error } = await signInWithGoogle(getSupabaseBrowserClient());
    if (error) {
      setMessage("Google sign-up could not be started. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <section className="centered-page">
      <Card className="narrow-card auth-card">
        <p className="eyebrow">Create Account</p>
        <h1>Sign Up</h1>
        <form
          className="form-stack"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <label className="field-label" htmlFor="signup-display-name">
            Display name
          </label>
          <input
            id="signup-display-name"
            autoComplete="name"
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />

          <label className="field-label" htmlFor="signup-email">
            Email
          </label>
          <input
            id="signup-email"
            autoComplete="email"
            inputMode="email"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <label className="field-label" htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            autoComplete="new-password"
            minLength={minimumPasswordLength}
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <label className="field-label" htmlFor="signup-confirm-password">
            Confirm password
          </label>
          <input
            id="signup-confirm-password"
            autoComplete="new-password"
            minLength={minimumPasswordLength}
            required
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />

          {message && (
            <p
              className={`form-message ${
                status === "sent" ? "form-message-success" : "form-message-error"
              }`}
              role={status === "sent" ? "status" : "alert"}
            >
              {message}
            </p>
          )}

          <Button type="submit" disabled={status === "loading" || status === "google"}>
            {status === "loading" ? "Creating Account" : "Sign Up"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={status === "loading" || status === "google"}
            onClick={() => {
              void handleGoogleSignIn();
            }}
          >
            {status === "google" ? "Opening Google" : "Continue with Google"}
          </Button>
        </form>
        <div className="auth-links">
          <Link to={paths.login}>Already have an account?</Link>
        </div>
      </Card>
    </section>
  );
}
