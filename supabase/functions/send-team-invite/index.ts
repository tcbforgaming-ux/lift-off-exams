import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-retry-count",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function validInviteLink(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (!url.hash.includes("team-invite=")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey =
      Deno.env.get("SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail =
      Deno.env.get("TEAM_INVITE_FROM_EMAIL") ||
      Deno.env.get("RESEND_FROM_EMAIL") ||
      Deno.env.get("FROM_EMAIL");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Required Supabase server secrets are missing. Set SERVICE_ROLE_KEY.");
    }
    if (!resendApiKey || !fromEmail) {
      throw new Error("Resend secrets are missing. Set RESEND_API_KEY and TEAM_INVITE_FROM_EMAIL.");
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const requestBody = await request.json().catch(() => ({}));
    const inviteId = String(requestBody.invite_id || requestBody.inviteId || "");
    const inviteLink = validInviteLink(requestBody.invite_link || requestBody.inviteLink);
    if (!inviteId) return jsonResponse({ error: "invite_id is required" }, 400);
    if (!inviteLink) return jsonResponse({ error: "A valid invite_link is required" }, 400);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const accessToken = authorization.slice("Bearer ".length);
    const {
      data: { user: actor },
      error: actorError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (actorError || !actor) {
      return jsonResponse(
        { error: actorError?.message || "Invalid user session" },
        401,
      );
    }

    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("team_invites")
      .select("id,team_id,email,role,role_label,status,expires_at,send_count,teams(name,created_by)")
      .eq("id", inviteId)
      .maybeSingle();

    if (inviteError) throw inviteError;
    if (!invite) return jsonResponse({ error: "Invite not found" }, 404);
    if (invite.status !== "pending") {
      return jsonResponse({ error: "Only pending invites can be emailed" }, 409);
    }
    if (new Date(invite.expires_at).getTime() <= Date.now()) {
      return jsonResponse({ error: "Invite has expired" }, 409);
    }

    const { data: actorMembership, error: membershipError } = await supabaseAdmin
      .from("team_memberships")
      .select("role,status")
      .eq("team_id", invite.team_id)
      .eq("user_id", actor.id)
      .maybeSingle();

    if (membershipError) throw membershipError;
    const actorCanManage =
      invite.teams?.created_by === actor.id ||
      (
        actorMembership?.status === "active" &&
        ["team_admin", "co_admin"].includes(actorMembership.role)
      );

    if (!actorCanManage) {
      return jsonResponse({ error: "Team administrator access required" }, 403);
    }

    const teamName = invite.teams?.name || "Lift Off Exams team";
    const roleLabel = invite.role_label || "Student";
    const subject = `You're invited to ${teamName}`;
    const text = [
      `You have been invited to join ${teamName} as ${roleLabel}.`,
      "",
      "Open this link to accept the invitation:",
      inviteLink,
      "",
      "Lift Off Exams",
    ].join("\n");
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#10211d;">
        <h1 style="font-size:22px;margin:0 0 12px;">You're invited to ${escapeHtml(teamName)}</h1>
        <p>You have been invited to join as <strong>${escapeHtml(roleLabel)}</strong>.</p>
        <p><a href="${escapeHtml(inviteLink)}" style="background:#0f766e;color:#fff;padding:12px 16px;border-radius:8px;text-decoration:none;display:inline-block;">Accept Invitation</a></p>
        <p style="color:#53635f;">If the button does not work, paste this link into your browser:<br>${escapeHtml(inviteLink)}</p>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: invite.email,
        subject,
        html,
        text,
      }),
    });

    const resendPayload = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) {
      const message =
        resendPayload?.message ||
        resendPayload?.error ||
        "Resend could not send the team invite.";
      await supabaseAdmin
        .from("team_invites")
        .update({
          last_send_error: String(message).slice(0, 1000),
          updated_at: new Date().toISOString(),
        })
        .eq("id", invite.id);
      return jsonResponse({ error: message }, 502);
    }

    const sentAt = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("team_invites")
      .update({
        email_sent_at: sentAt,
        send_count: Number(invite.send_count || 0) + 1,
        last_send_error: null,
        updated_at: sentAt,
      })
      .eq("id", invite.id);

    if (updateError) console.error("Invite send tracking failed:", updateError);

    return jsonResponse({
      ok: true,
      invite_id: invite.id,
      email_sent_at: sentAt,
      resend_id: resendPayload?.id || null,
    });
  } catch (error) {
    console.error("Team invite email error:", error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not send the team invite email.",
      },
      500,
    );
  }
});
