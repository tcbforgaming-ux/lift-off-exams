import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { paths } from "../../app/urlPaths";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { updatePassword } from "../../lib/auth/authActions";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";

const minimumPasswordLength = 8;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<
    "checking" | "ready" | "loading" | "done" | "invalid"
  >("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setStatus(data.session ? "ready" : "invalid");
      })
      .catch(() => setStatus("invalid"));
  }, []);

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
    const { error } = await updatePassword(getSupabaseBrowserClient(), password);
    if (error) {
      setMessage("This recovery link is invalid or has expired.");
      setStatus("invalid");
      return;
    }

    setStatus("done");
    window.setTimeout(() => {
      void navigate(paths.dashboard, { replace: true });
    }, 800);
  }

  return (
    <section className="centered-page">
      <Card className="narrow-card auth-card">
        <p className="eyebrow">Reset Password</p>
        <h1>Create a New Password</h1>
        {status === "checking" && <p className="muted">Checking your recovery link.</p>}
        {status === "invalid" && (
          <>
            <p className="form-message form-message-error" role="alert">
              This recovery link is invalid, expired, or already used.
            </p>
            <Link to={paths.forgotPassword}>Request a new recovery link</Link>
          </>
        )}
        {(status === "ready" || status === "loading" || status === "done") && (
          <form
            className="form-stack"
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
          >
            <label className="field-label" htmlFor="new-password">
              New password
            </label>
            <input
              id="new-password"
              autoComplete="new-password"
              minLength={minimumPasswordLength}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <label className="field-label" htmlFor="confirm-new-password">
              Confirm new password
            </label>
            <input
              id="confirm-new-password"
              autoComplete="new-password"
              minLength={minimumPasswordLength}
              required
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />

            {message && (
              <p className="form-message form-message-error" role="alert">
                {message}
              </p>
            )}
            {status === "done" && (
              <p className="form-message form-message-success" role="status">
                Your password has been updated.
              </p>
            )}

            <Button type="submit" disabled={status === "loading" || status === "done"}>
              {status === "loading" ? "Updating Password" : "Update Password"}
            </Button>
          </form>
        )}
      </Card>
    </section>
  );
}
