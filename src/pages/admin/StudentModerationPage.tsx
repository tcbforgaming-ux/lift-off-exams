import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { CursorNavigation } from "../../components/ui/CursorNavigation";
import { moderationRpc, type Suspension } from "../../lib/auth/moderation";
export function StudentModerationPage() {
  const [user, setUser] = useState("");
  const [days, setDays] = useState("7");
  const [reason, setReason] = useState("");
  const [rows, setRows] = useState<Suspension[]>([]);
  const [pages, setPages] = useState<Suspension[]>([]);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cursor = pages.at(-1);
  const retry = useRef<{ payload: string; key: string } | null>(null);
  useEffect(() => {
    let live = true;
    setBusy(true);
    void moderationRpc<Suspension[]>(
      "list_student_moderation",
      cursor ? { p_before: cursor.created_at, p_id: cursor.id } : {},
    )
      .then((x) => {
        if (live) setRows(x);
      })
      .catch((e: unknown) => {
        if (live)
          setError(e instanceof Error ? e.message : "Moderation could not load.");
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [cursor, revision]);
  async function act(action: string, row?: Suspension) {
    setBusy(true);
    setError("");
    const payload = {
      p_user: row?.user_id ?? user,
      p_action: action,
      p_reason: reason,
      p_days: days ? Number(days) : null,
      p_id: row?.id ?? null,
      p_version: row?.version ?? null,
    };
    const signature = JSON.stringify(payload);
    if (retry.current?.payload !== signature)
      retry.current = { payload: signature, key: crypto.randomUUID() };
    try {
      await moderationRpc("moderate_student", { ...payload, p_key: retry.current.key });
      setRevision((x) => x + 1);
      setReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Moderation failed.");
    } finally {
      setBusy(false);
    }
  }
  const shown = rows.slice(0, 25);
  return (
    <section className="page-stack">
      <h1>Student Moderation</h1>
      <form
        className="repository-filters"
        onSubmit={(e) => {
          e.preventDefault();
          void act("suspend");
        }}
      >
        <label className="field-label">
          Student User ID
          <input value={user} onChange={(e) => setUser(e.target.value)} />
        </label>
        <label className="field-label">
          Suspension duration
          <select value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="1">24 hours</option>
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="">Indefinite</option>
          </select>
        </label>
        <label className="field-label">
          Moderation reason
          <textarea
            required
            minLength={5}
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <Button type="submit" disabled={busy || !user || reason.trim().length < 5}>
          Suspend Student
        </Button>
      </form>
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Loading or saving moderation…</p>}
      {!busy && !shown.length && <p>No suspensions.</p>}
      {shown.map((row) => (
        <article key={row.id}>
          <h2>{row.display_name ?? row.user_id}</h2>
          <p>{row.reason}</p>
          <p>
            {row.active ? "Active suspension" : "Ended"} ·{" "}
            {row.expires_at ?? "Indefinite"}
          </p>
          {row.appeal && (
            <>
              <h3>Appeal</h3>
              <p>{row.appeal}</p>
              <p>{row.appeal_decision ?? "Awaiting review"}</p>
            </>
          )}
          {row.active && (
            <div className="button-row">
              {[
                "restore",
                "modify",
                ...(row.appeal && !row.appeal_decision ? ["approve", "deny"] : []),
              ].map((action) => (
                <Button
                  key={action}
                  disabled={busy || reason.trim().length < 5}
                  onClick={() => void act(action, row)}
                >
                  {
                    (
                      {
                        restore: "Restore Access",
                        modify: "Update Suspension",
                        approve: "Approve Appeal",
                        deny: "Deny Appeal",
                      } as Record<string, string>
                    )[action]
                  }
                </Button>
              ))}
            </div>
          )}
        </article>
      ))}
      <CursorNavigation
        page={pages.length}
        loading={busy}
        hasNext={rows.length > 25}
        onPrevious={() => setPages((x) => x.slice(0, -1))}
        onNext={() => {
          const last = shown.at(-1);
          if (last) setPages((x) => [...x, last]);
        }}
      />
    </section>
  );
}
