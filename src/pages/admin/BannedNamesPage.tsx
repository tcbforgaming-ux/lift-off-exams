import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { CursorNavigation } from "../../components/ui/CursorNavigation";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";

type Rule = { id: string; term: string; active: boolean };
const size = 30;

export function BannedNamesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [pages, setPages] = useState<string[]>([]);
  const [term, setTerm] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const cursor = pages.at(-1);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    const request = getSupabaseBrowserClient()
      .from("banned_terms")
      .select("id,term,active")
      .order("term")
      .limit(size + 1);
    void (async () => {
      try {
        const result = await (cursor ? request.gt("term", cursor) : request);
        if (result.error) throw new Error(result.error.message);
        if (current) setRules(result.data);
      } catch (cause) {
        if (current)
          setError(
            cause instanceof Error ? cause.message : "Name rules could not load.",
          );
      } finally {
        if (current) setLoading(false);
      }
    })();
    return () => {
      current = false;
    };
  }, [cursor, revision]);

  async function save(value: string, active: boolean) {
    if (saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await getSupabaseBrowserClient().rpc("set_staff_banned_term", {
        p_term: value,
        p_active: active,
        p_reason: reason,
      });
      if (result.error) throw new Error(result.error.message);
      setReason("");
      setTerm("");
      setMessage(active ? "Rule activated." : "Rule retired.");
      setRevision((current) => current + 1);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Name rule could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }
  const shown = rules.slice(0, size);
  return (
    <section className="page-stack">
      <header className="page-header">
        <h1>Display Name Rules</h1>
      </header>
      <form
        className="repository-filters"
        onSubmit={(event) => {
          event.preventDefault();
          void save(term, true);
        }}
      >
        <label className="field-label">
          Word or phrase
          <input
            value={term}
            maxLength={120}
            onChange={(event) => setTerm(event.target.value)}
          />
        </label>
        <label className="field-label">
          Moderation reason
          <input
            value={reason}
            maxLength={1000}
            required
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <Button
          type="submit"
          disabled={saving || !term.trim() || reason.trim().length < 5}
        >
          Activate rule
        </Button>
      </form>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {loading && <p role="status">Loading name rules…</p>}
      {!error && !loading && !shown.length && <p>No display name rules.</p>}
      {shown.length > 0 && (
        <div className="repository-table-wrap">
          <table className="repository-table">
            <caption>Restricted display-name words and phrases</caption>
            <thead>
              <tr>
                <th scope="col">Word or phrase</th>
                <th scope="col">State</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((rule) => (
                <tr key={rule.id}>
                  <th scope="row">{rule.term}</th>
                  <td>{rule.active ? "Active" : "Retired"}</td>
                  <td>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={saving || reason.trim().length < 5}
                      onClick={() => void save(rule.term, !rule.active)}
                    >
                      {rule.active ? "Retire" : "Restore"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <CursorNavigation
        page={pages.length}
        loading={loading}
        hasNext={rules.length > size && !error}
        onPrevious={() => setPages((current) => current.slice(0, -1))}
        onNext={() => {
          const last = shown.at(-1);
          if (last) setPages((current) => [...current, last.term]);
        }}
      />
    </section>
  );
}
