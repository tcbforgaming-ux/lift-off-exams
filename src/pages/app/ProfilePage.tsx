import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { displayRole } from "../../lib/auth/roles";
import { useAuth } from "../../lib/auth/useAuth";
import { getSupabaseBrowserClient } from "../../lib/supabase/browserClient";

export function ProfilePage() {
  const { profile, refreshProfile, role, user } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    setStatus("saving");
    try {
      const { data, error } = await getSupabaseBrowserClient()
        .from("profiles")
        .update({
          display_name: displayName.trim() || null,
          phone: phone.trim() || null,
        })
        .eq("user_id", user.id)
        .select("user_id, display_name, phone")
        .maybeSingle();
      if (error || data?.user_id !== user.id) {
        throw error ?? new Error("The profile update did not return your row.");
      }
      await refreshProfile();
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <p className="eyebrow">Account</p>
        <h1>Profile</h1>
        <Link to="/account/deletion">Account Deletion</Link>
        {(role === "owner" ||
          (profile?.owner_state && profile.owner_state !== "active")) && (
          <Link to="/owner-access">Owner Access</Link>
        )}
        <p>Basic account details and trusted role information.</p>
      </div>

      <div className="grid two-column">
        <Card>
          <h2>Profile Details</h2>
          <form
            className="form-stack"
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
          >
            <label className="field-label" htmlFor="profile-display-name">
              Display name
            </label>
            <input
              id="profile-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />

            <label className="field-label" htmlFor="profile-phone">
              Phone
            </label>
            <input
              id="profile-phone"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />

            {status === "saved" && (
              <p className="form-message form-message-success" role="status">
                Profile updated.
              </p>
            )}
            {status === "error" && (
              <p className="form-message form-message-error" role="alert">
                We could not update your profile.
              </p>
            )}

            <Button type="submit" disabled={status === "saving"}>
              {status === "saving" ? "Saving" : "Save Profile"}
            </Button>
          </form>
        </Card>

        <Card>
          <h2>Access</h2>
          <dl className="detail-list">
            <div>
              <dt>Email</dt>
              <dd>{user?.email ?? "Unknown"}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{displayRole(role)}</dd>
            </div>
            <div>
              <dt>Account tier</dt>
              <dd>{profile?.account_tier ?? "free"}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </section>
  );
}
