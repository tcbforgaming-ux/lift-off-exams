import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../lib/auth/useAuth";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";

const reauthAccountKey = "lift-off-owner-reauth-account";

export function OwnerAccessPage() {
  const { profile, user, role, refreshProfile } = useAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const providerReturn = new URLSearchParams(window.location.search).has("reauth");
  const expected = providerReturn
    ? window.sessionStorage.getItem(reauthAccountKey)
    : null;
  const suspend = role === "owner" && profile?.owner_state === "active";
  const restore =
    profile?.owner_state === "self_suspended" ||
    profile?.owner_state === "inactive_suspended";

  async function change(reauthenticated: boolean) {
    if (busy || !user || (!suspend && !restore)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const api = getSupabaseBrowserClient();
      if (reauthenticated) {
        if (expected !== user.id)
          throw new Error("Sign in again with the same owner account.");
      } else {
        if (!user.email)
          throw new Error("This account does not have an email address.");
        const { data, error: signInError } = await api.auth.signInWithPassword({
          email: user.email,
          password,
        });
        if (signInError || data.user?.id !== user.id)
          throw new Error("Reauthentication failed. Check your password.");
      }
      const { error: actionError } = await api.rpc(
        "set_own_owner_privileges_suspended",
        { suspend_value: suspend },
      );
      if (actionError) throw new Error(actionError.message);
      window.sessionStorage.removeItem(reauthAccountKey);
      if (providerReturn) window.history.replaceState(null, "", "/owner-access");
      setMessage(
        suspend ? "Owner privileges suspended." : "Owner privileges restored.",
      );
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to change owner privileges.");
    } finally {
      setPassword("");
      setBusy(false);
    }
  }

  async function google() {
    if (!user || busy) return;
    setBusy(true);
    setError("");
    try {
      window.sessionStorage.setItem(reauthAccountKey, user.id);
      const callback = new URL("/auth/callback", window.location.origin);
      callback.searchParams.set("next", "/owner-access?reauth=google");
      const { error: signInError } =
        await getSupabaseBrowserClient().auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: callback.href,
            queryParams: { prompt: "select_account" },
          },
        });
      if (signInError) throw signInError;
    } catch {
      window.sessionStorage.removeItem(reauthAccountKey);
      setError("Google reauthentication could not start.");
      setBusy(false);
    }
  }

  const action = suspend ? "Suspend Owner Privileges" : "Restore Owner Privileges";
  return (
    <section className="page-stack">
      <h1>Owner Access</h1>
      <p>
        State:{" "}
        {profile?.owner_state === "active" && role !== "owner"
          ? "Not an owner"
          : profile?.owner_state?.replaceAll("_", " ")}
      </p>
      {profile?.owner_state === "governance_suspended" && (
        <p>Restoration requires approval from the other eligible owners.</p>
      )}
      {(suspend || restore) &&
        (providerReturn ? (
          <Button
            type="button"
            disabled={busy || expected !== user?.id}
            onClick={() => void change(true)}
          >
            {action}
          </Button>
        ) : (
          <>
            <form
              className="form-stack"
              onSubmit={(event) => {
                event.preventDefault();
                void change(false);
              }}
            >
              <label className="field-label">
                Current password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <Button type="submit" disabled={busy}>
                {action}
              </Button>
            </form>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => void google()}
            >
              Reauthenticate with Google
            </Button>
          </>
        ))}
      {providerReturn && expected !== user?.id && (
        <p role="alert">Sign in again with the same owner account.</p>
      )}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
