import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../lib/auth/useAuth";
import { moderationRpc, type Suspension } from "../../lib/auth/moderation";
export function SuspensionPage() {
  const { refreshProfile } = useAuth();
  const [state, setState] = useState<{
    suspended: boolean;
    record: Suspension | null;
  }>();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    void moderationRpc<typeof state>("get_my_suspension")
      .then((x) => {
        if (live) setState(x);
      })
      .catch((e: unknown) => {
        if (live)
          setError(
            e instanceof Error ? e.message : "Suspension status could not load.",
          );
      });
    return () => {
      live = false;
    };
  }, []);
  return (
    <section className="page-stack">
      <h1>Account Suspension</h1>
      {error && <p role="alert">{error}</p>}
      {!state && <p role="status">Loading suspension…</p>}
      {state && !state.suspended && (
        <>
          <p>Your account is no longer suspended.</p>
          <Button onClick={() => void refreshProfile()}>Return to account</Button>
        </>
      )}
      {state?.record && (
        <>
          <p>{state.record.reason}</p>
          <p>
            {state.record.expires_at
              ? `Expires ${new Date(state.record.expires_at).toLocaleString()}`
              : "Indefinite suspension"}
          </p>
          {state.record.appeal ? (
            <>
              <h2>Your Appeal</h2>
              <p>{state.record.appeal}</p>
              <p>{state.record.appeal_decision ?? "Awaiting staff review"}</p>
              <p>{state.record.decision_reason}</p>
            </>
          ) : (
            state.suspended && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setBusy(true);
                  setError("");
                  void moderationRpc<typeof state>("submit_suspension_appeal", {
                    p_id: state.record!.id,
                    p_text: text,
                  })
                    .then(setState)
                    .catch((e: unknown) =>
                      setError(
                        e instanceof Error ? e.message : "Appeal could not save.",
                      ),
                    )
                    .finally(() => setBusy(false));
                }}
              >
                <label className="field-label">
                  Appeal and supporting information
                  <textarea
                    required
                    minLength={5}
                    maxLength={5000}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </label>
                <Button type="submit" disabled={busy || text.trim().length < 5}>
                  Submit Appeal
                </Button>
              </form>
            )
          )}
        </>
      )}
    </section>
  );
}
