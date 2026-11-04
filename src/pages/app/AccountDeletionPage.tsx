import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { signInWithGoogle } from "../../lib/auth/authActions";
import { useAuth } from "../../lib/auth/useAuth";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";

type Lifecycle = {
  state: "active" | "pending" | "cancelled" | "finalizing";
  deadline?: string;
  warning_sent_at?: string | null;
  recoverable?: boolean;
};

const reauthKey = "lift-off-deletion-reauth";

export function AccountDeletionPage() {
  const { user, refreshProfile } = useAuth();
  const [params, setParams] = useSearchParams();
  const [lifecycle, setLifecycle] = useState<Lifecycle>();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const pending = useRef(false);
  const providerReturn = params.get("reauth") === "google";
  const recovering = lifecycle?.state === "pending";

  useEffect(() => {
    let current = true;
    void (async () => {
      try {
        const { data, error } = await getSupabaseBrowserClient().rpc(
          "get_account_deletion_status",
        );
        if (error) throw new Error(error.message);
        if (current) setLifecycle(data as Lifecycle);
      } catch (e) {
        if (current)
          setError(e instanceof Error ? e.message : "Could not load account status.");
      }
    })();
    return () => {
      current = false;
    };
  }, [user?.id, loadVersion]);

  async function submit() {
    if (!user || !lifecycle || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const api = getSupabaseBrowserClient();
      if (providerReturn) {
        if (window.sessionStorage.getItem(reauthKey) !== user.id)
          throw new Error("Reauthenticate with the same account.");
      } else {
        if (!user.email) throw new Error("This account has no email address.");
        const { data, error } = await api.auth.signInWithPassword({
          email: user.email,
          password,
        });
        if (error || data.user?.id !== user.id)
          throw new Error("Reauthentication failed. Check your password.");
      }
      const { data, error: actionError } = recovering
        ? await api.rpc("recover_account_from_deletion")
        : await api.rpc("request_account_deletion", { p_confirmation: confirmation });
      if (actionError) throw new Error(actionError.message);
      setLifecycle(data as Lifecycle);
      setConfirmation("");
      window.sessionStorage.removeItem(reauthKey);
      if (providerReturn) setParams({}, { replace: true });
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The account action failed.");
    } finally {
      setPassword("");
      pending.current = false;
      setBusy(false);
    }
  }

  async function google() {
    if (!user || pending.current) return;
    setError("");
    setBusy(true);
    try {
      window.sessionStorage.setItem(reauthKey, user.id);
      const { error } = await signInWithGoogle(
        getSupabaseBrowserClient(),
        "/account/deletion?reauth=google",
      );
      if (error) throw error;
    } catch {
      window.sessionStorage.removeItem(reauthKey);
      setError("Google reauthentication could not start.");
      setBusy(false);
    }
  }

  return (
    <section className="page-stack">
      <h1>Account Deletion</h1>
      {!lifecycle && !error && <p role="status">Loading account status.</p>}
      {!lifecycle && error && (
        <Button
          type="button"
          onClick={() => {
            setError("");
            setLoadVersion((n) => n + 1);
          }}
        >
          Retry
        </Button>
      )}
      {lifecycle?.state === "cancelled" && (
        <p role="status">Account recovered. Your data and access have been restored.</p>
      )}
      {lifecycle?.state === "finalizing" && (
        <p role="status">
          Deletion is being finalized. Account recovery is no longer available.
        </p>
      )}
      {recovering && (
        <>
          <h2>Deletion Pending</h2>
          <p>
            {lifecycle.warning_sent_at ? "Recovery deadline" : "Earliest deletion date"}
            : {new Date(lifecycle.deadline ?? "").toLocaleString()}.
          </p>
          {!lifecycle.warning_sent_at && (
            <p>
              You can recover until at least seven days after the final warning is
              delivered.
            </p>
          )}
          {!lifecycle.recoverable && <p>The recovery window has closed.</p>}
        </>
      )}
      {(lifecycle?.state === "active" || lifecycle?.state === "cancelled") && (
        <>
          <p>
            Requesting deletion restricts your account to recovery for three calendar
            months. We will send a final warning at least seven days before permanent
            deletion.
          </p>
          <p>
            Permanent deletion removes your account, saved results, personal analytics,
            and reports, and cancels any active subscription. Anonymized administrative
            history may be retained.
          </p>
          <Link to="/profile">Back to Profile</Link>
        </>
      )}
      {lifecycle &&
        (lifecycle.state === "active" ||
          lifecycle.state === "cancelled" ||
          lifecycle.recoverable) && (
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            {!recovering && (
              <label className="field-label">
                Type DELETE to confirm
                <input
                  required
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </label>
            )}
            {!providerReturn && (
              <label className="field-label">
                Current password
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
            )}
            <div className="button-row">
              <Button
                type="submit"
                disabled={busy || (!recovering && confirmation !== "DELETE")}
              >
                {recovering ? "Recover Account" : "Request Deletion"}
              </Button>
              {!providerReturn && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => void google()}
                >
                  Reauthenticate with Google
                </Button>
              )}
            </div>
          </form>
        )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
