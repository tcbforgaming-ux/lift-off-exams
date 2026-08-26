import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { paths } from "../../app/urlPaths";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { requestPasswordRecovery } from "../../lib/auth/authActions";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    await requestPasswordRecovery(getSupabaseBrowserClient(), email);
    setStatus("sent");
  }

  return (
    <section className="centered-page">
      <Card className="narrow-card auth-card">
        <p className="eyebrow">Account Recovery</p>
        <h1>Forgot Password?</h1>
        <form
          className="form-stack"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <label className="field-label" htmlFor="recovery-email">
            Email
          </label>
          <input
            id="recovery-email"
            autoComplete="email"
            inputMode="email"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          {status === "sent" && (
            <p className="form-message form-message-success" role="status">
              If an account exists for that email, a recovery link has been sent.
            </p>
          )}

          <Button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Sending Link" : "Send Recovery Link"}
          </Button>
        </form>
        <div className="auth-links">
          <Link to={paths.login}>Back to log in</Link>
        </div>
      </Card>
    </section>
  );
}
