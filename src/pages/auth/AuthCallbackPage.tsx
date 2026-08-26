import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { paths } from "../../app/urlPaths";
import { Card } from "../../components/ui/Card";
import { sanitizeRedirectPath } from "../../lib/auth/redirects";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("Completing sign-in.");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const error = searchParams.get("error") || searchParams.get("error_code");
    if (error) {
      setFailed(true);
      setMessage("The sign-in link could not be completed.");
      return;
    }

    const code = searchParams.get("code");
    const next = sanitizeRedirectPath(searchParams.get("next"));
    const supabase = getSupabaseBrowserClient();

    async function completeCallback() {
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setFailed(true);
          setMessage("The sign-in link is invalid or has expired.");
          return;
        }
      } else {
        const { data } = await supabase.auth.getSession();
        if (!data.session && !window.location.hash.includes("access_token")) {
          setFailed(true);
          setMessage("The sign-in link is missing required session details.");
          return;
        }
      }

      void navigate(next, { replace: true });
    }

    void completeCallback();
  }, [navigate, searchParams]);

  return (
    <section className="centered-page">
      <Card className="narrow-card auth-card">
        <p className="eyebrow">Authentication</p>
        <h1>{failed ? "Sign-In Failed" : "Signing You In"}</h1>
        <p className={failed ? "form-message form-message-error" : "muted"}>
          {message}
        </p>
        {failed && <Link to={paths.login}>Return to log in</Link>}
      </Card>
    </section>
  );
}
