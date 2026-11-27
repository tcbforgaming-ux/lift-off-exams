import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isAuthError } from "@supabase/supabase-js";

import { paths } from "../../app/urlPaths";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { updatePassword } from "../../lib/auth/authActions";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";

const minimumPasswordLength = 8;

function passwordUpdateFailure(error: unknown) {
  const code = isAuthError(error) ? error.code : undefined;
  switch (code) {
    case "same_password":
      return {
        status: "ready",
        message: "Choose a password different from your current password.",
      } as const;
    case "weak_password":
    case "validation_failed":
      return {
        status: "ready",
        message:
          "That password does not meet the account's requirements. Try a longer, unique password.",
      } as const;
    case "session_expired":
    case "session_not_found":
    case "otp_expired":
    case "bad_jwt":
    case "no_authorization":
      return {
        status: "invalid",
        message:
          "Your recovery session is no longer valid. Request a new recovery link.",
      } as const;
    case "reauthentication_needed":
      return {
        status: "invalid",
        message:
          "This account needs a fresh recovery session. Request a new link and open it in a signed-out window.",
      } as const;
    default:
      if (isAuthError(error) && error.name === "AuthSessionMissingError") {
        return {
          status: "invalid",
          message: "Your recovery session is missing. Request a new recovery link.",
        } as const;
      }
      return {
        status: "ready",
        message:
          "We couldn't update your password. Try again or contact support if the problem continues.",
      } as const;
  }
}

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
    try {
      const { error } = await updatePassword(getSupabaseBrowserClient(), password);
      if (error) throw error;
    } catch (error) {
      const failure = passwordUpdateFailure(error);
      setMessage(failure.message);
      setStatus(failure.status);
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
              {message ?? "This recovery link is invalid, expired, or already used."}
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
