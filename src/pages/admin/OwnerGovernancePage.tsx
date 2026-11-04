import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { CursorNavigation } from "../../components/ui/CursorNavigation";
import { useAuth } from "../../lib/auth/useAuth";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";

type View = "roles" | "proposals" | "history";
type Cursor = { id: string; created_at: string };
type Row = Cursor & {
  display_name?: string;
  role?: string;
  owner_state?: string;
  suspended_until?: string;
  eligible?: boolean;
  action?: string;
  vote_kind?: string;
  status?: string;
  reason?: string;
  target_user_id?: string;
  target_email?: string;
  created_by?: string;
  actor_user_id?: string;
  required_approvals?: number;
  approvals?: number;
  own_ballot?: string;
  expires_at?: string;
  invitation_status?: string;
};

async function governanceRpc<T>(name: string, args: Record<string, unknown>) {
  const api = getSupabaseBrowserClient() as unknown as {
    rpc: (
      method: string,
      input: Record<string, unknown>,
    ) => Promise<{
      data: unknown;
      error: { message: string } | null;
    }>;
  };
  const { data, error } = await api.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export function OwnerGovernancePage() {
  const { user } = useAuth();
  const [view, setView] = useState<View>("roles");
  const [cursors, setCursors] = useState<Cursor[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [kind, setKind] = useState("admin_create");
  const [target, setTarget] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const cursor = cursors.at(-1);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setListError("");
    setRows([]);
    void governanceRpc<Row[]>("list_owner_governance", {
      p_view: view,
      p_before: cursor?.created_at ?? null,
      p_before_id: cursor?.id ?? null,
    })
      .then((items) => {
        if (current) setRows(items);
      })
      .catch((e: unknown) => {
        if (current)
          setListError(e instanceof Error ? e.message : "Unable to load governance.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [view, cursor, version]);

  function switchView(next: View) {
    setCursors([]);
    setView(next);
  }

  async function run(action: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The governance action failed.");
    } finally {
      setVersion((value) => value + 1);
      pending.current = false;
      setBusy(false);
    }
  }

  async function request() {
    if (kind === "owner_removal") {
      await governanceRpc("initiate_owner_removal_vote", {
        p_target_user_id: target,
        p_reason: reason,
      });
    } else {
      await governanceRpc("request_owner_action", {
        p_kind: kind,
        p_target: kind === "owner_invite" ? null : target,
        p_email: kind === "owner_invite" ? email : null,
        p_reason: reason,
      });
    }
    setReason("");
    setStatus("Proposal opened.");
    switchView("proposals");
  }

  async function act(row: Row, action: string) {
    if (row.vote_kind === "owner_removal") {
      const result =
        action === "withdraw"
          ? await governanceRpc<string>("withdraw_owner_removal_vote", {
              p_vote_id: row.id,
            })
          : await governanceRpc<string>("cast_owner_removal_vote", {
              p_vote_id: row.id,
              p_decision: action === "reject" ? "Reject" : "Approve",
            });
      setStatus(
        result === "Rejected"
          ? "Proposal rejected."
          : result === "Executed"
            ? "Owner removed."
            : action === "withdraw"
              ? "Ballot withdrawn."
              : "Ballot recorded.",
      );
    } else {
      const result = await governanceRpc<{ status: string; token?: string }>(
        "act_on_owner_proposal",
        { p_id: row.id, p_action: action },
      );
      if (result.token) {
        setInviteLink(
          new URL(`/owner-invitation#${result.token}`, window.location.origin).href,
        );
        setStatus("Invitation issued. Share the link with the intended recipient.");
      } else {
        if (action === "revoke") setInviteLink("");
        setStatus(
          result.status === "Rejected"
            ? "Proposal rejected."
            : action === "execute"
              ? "Proposal executed."
              : action === "revoke"
                ? "Invitation revoked."
                : `Ballot ${result.status.toLowerCase()}.`,
        );
      }
    }
  }

  return (
    <div className="page-stack" style={{ overflowWrap: "anywhere" }}>
      <header className="page-header">
        <h1>Owner Governance</h1>
        <Link to="/owner-access">Owner Access</Link>
      </header>
      <div className="button-row" aria-label="Governance views">
        {(["roles", "proposals", "history"] as const).map((tab) => (
          <Button
            key={tab}
            type="button"
            aria-pressed={view === tab}
            onClick={() => switchView(tab)}
          >
            {tab[0].toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>
      {view === "roles" && (
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void run(request);
          }}
        >
          <h2>Open Proposal</h2>
          <label className="field-label">
            Action
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setTarget("");
              }}
            >
              <option value="admin_create">Grant administrator access</option>
              <option value="admin_suspend">Suspend administrator</option>
              <option value="admin_restore">Restore administrator</option>
              <option value="owner_invite">Invite owner</option>
              <option value="owner_removal">Remove owner</option>
              <option value="owner_suspend">Suspend owner by governance</option>
              <option value="owner_restore">Restore owner by governance</option>
            </select>
          </label>
          {kind === "owner_invite" ? (
            <label className="field-label">
              Recipient email
              <input
                type="email"
                maxLength={254}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          ) : (
            <label className="field-label">
              Target account ID
              <input
                required
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
            </label>
          )}
          <label className="field-label">
            Reason
            <textarea
              required
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <Button type="submit" disabled={busy}>
            Open Proposal
          </Button>
        </form>
      )}
      {status && <p role="status">{status}</p>}
      {error && <p role="alert">{error}</p>}
      {inviteLink && (
        <label className="field-label">
          Owner invitation link
          <input
            value={inviteLink}
            readOnly
            onFocus={(e) => e.currentTarget.select()}
          />
        </label>
      )}
      {loading && <p role="status">Loading governance…</p>}
      {listError && <p role="alert">{listError}</p>}
      {!loading && !listError && rows.length === 0 && <p>No records.</p>}
      <ul className="page-stack">
        {rows.slice(0, 25).map((row) => (
          <li key={row.id}>
            {view === "roles" ? (
              <>
                <strong>{row.display_name || row.id}</strong>
                <p>
                  {row.role}
                  {row.suspended_until === "infinity" && " · Suspended"}
                  {row.role === "owner" || row.owner_state !== "active"
                    ? ` · ${row.owner_state}`
                    : ""}
                </p>
                {row.id !== user?.id && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setTarget(row.id)}
                  >
                    Select account
                  </Button>
                )}
              </>
            ) : (
              <>
                <strong>{row.action}</strong>
                <p>
                  {row.reason} · {new Date(row.created_at).toLocaleString()}
                </p>
                <p>
                  {row.actor_user_id || row.created_by || "System"}
                  {(row.target_email || row.target_user_id) &&
                    ` → ${row.target_email || row.target_user_id}`}
                </p>
                {view === "proposals" && (
                  <>
                    <p>
                      {row.status} · {row.approvals}/{row.required_approvals} eligible
                      approvals
                      {row.expires_at &&
                        ` · Expires ${new Date(row.expires_at).toLocaleString()}`}
                    </p>
                    <div className="button-row">
                      {row.status === "Open" && row.target_user_id !== user?.id && (
                        <>
                          <Button
                            type="button"
                            disabled={busy || row.own_ballot === "Approve"}
                            onClick={() => void run(() => act(row, "approve"))}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={busy || row.own_ballot === "Reject"}
                            onClick={() => void run(() => act(row, "reject"))}
                          >
                            Reject
                          </Button>
                          {row.own_ballot && (
                            <Button
                              type="button"
                              disabled={busy}
                              onClick={() => void run(() => act(row, "withdraw"))}
                            >
                              Withdraw
                            </Button>
                          )}
                          {row.vote_kind !== "owner_removal" && (
                            <Button
                              type="button"
                              disabled={
                                busy ||
                                (row.approvals ?? 0) < (row.required_approvals ?? 1)
                              }
                              onClick={() => void run(() => act(row, "execute"))}
                            >
                              Execute
                            </Button>
                          )}
                        </>
                      )}
                      {row.invitation_status === "Issued" && (
                        <Button
                          type="button"
                          disabled={busy}
                          onClick={() => void run(() => act(row, "revoke"))}
                        >
                          Revoke invitation
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      <CursorNavigation
        page={cursors.length}
        loading={loading}
        hasNext={rows.length > 25}
        onPrevious={() => setCursors((items) => items.slice(0, -1))}
        onNext={() => {
          const last = rows[24];
          if (last) setCursors((items) => [...items, last]);
        }}
      />
    </div>
  );
}

export function OwnerInvitationPage() {
  const { refreshProfile } = useAuth();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const token = hash.slice(1);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  async function accept() {
    if (busy || !token) return;
    setBusy(true);
    setError("");
    try {
      await governanceRpc("accept_owner_invitation", { p_token: token });
      setAccepted(true);
      void navigate("/owner-invitation", { replace: true });
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to accept invitation.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="page-stack">
      <h1>Owner Invitation</h1>
      {token && (
        <Button
          type="button"
          disabled={busy || !/^[0-9a-f]{64}$/.test(token)}
          onClick={() => void accept()}
        >
          Accept Invitation
        </Button>
      )}
      {!token && accepted && <p role="status">Owner invitation accepted.</p>}
      {!token && !accepted && (
        <p role="alert">Open the original invitation link to continue.</p>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
