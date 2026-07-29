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

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Required Supabase server secrets are missing. Set SERVICE_ROLE_KEY.");
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const requestBody = await request.json().catch(() => ({}));
    const accessToken = authorization.slice("Bearer ".length);
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

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

    if (requestBody.diagnostic === true) {
      return jsonResponse({
        ok: true,
        mode: "diagnostic",
        actor_user_id: actor.id,
        actor_email: actor.email,
        has_service_role_key: Boolean(serviceRoleKey),
      });
    }

    const requestId = String(requestBody.request_id || requestBody.requestId || "");
    if (!requestId) {
      return jsonResponse({ error: "request_id is required" }, 400);
    }

    const { data: actorProfile, error: actorProfileError } = await supabaseAdmin
      .from("profiles")
      .select("role,suspended_until")
      .eq("user_id", actor.id)
      .maybeSingle();

    if (actorProfileError) throw actorProfileError;
    const actorIsSuspended =
      actorProfile?.suspended_until &&
      new Date(actorProfile.suspended_until).getTime() > Date.now();

    if (
      actorProfile?.role !== "owner" ||
      actorIsSuspended
    ) {
      return jsonResponse({ error: "Active Owner access required" }, 403);
    }

    const { data: deletionRequest, error: requestError } = await supabaseAdmin
      .from("account_deletion_requests")
      .select("id,user_id,status,recoverable_until")
      .eq("id", requestId)
      .maybeSingle();

    if (requestError) throw requestError;
    if (!deletionRequest) {
      return jsonResponse({ error: "Deletion request not found" }, 404);
    }

    if (deletionRequest.status !== "Final warning sent") {
      return jsonResponse(
        { error: "Send the final warning before executing deletion." },
        409,
      );
    }

    if (deletionRequest.user_id === actor.id) {
      return jsonResponse(
        { error: "Owners cannot execute deletion for their own account." },
        409,
      );
    }

    const now = new Date().toISOString();
    const { error: completionError } = await supabaseAdmin
      .from("account_deletion_requests")
      .update({
        status: "Completed",
        completed_at: now,
        updated_at: now,
        execution_note: `Auth user deleted by ${actor.email || actor.id}`,
      })
      .eq("id", requestId);

    if (completionError) throw completionError;

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      deletionRequest.user_id,
    );

    if (deleteError) throw deleteError;

    const { error: auditError } = await supabaseAdmin.from("admin_audit_logs").insert({
      actor_user_id: actor.id,
      actor_email: actor.email,
      action: "Account deletion executed",
      resource_type: "auth_user",
      resource_id: deletionRequest.user_id,
      reason: "Owner executed account deletion request",
      metadata: {
        deletion_request_id: requestId,
      },
    });

    if (auditError) console.error("Account deletion audit insert failed:", auditError);

    return jsonResponse({
      ok: true,
      deleted_user_id: deletionRequest.user_id,
      request_id: requestId,
    });
  } catch (error) {
    console.error("Account deletion execution error:", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not execute account deletion.",
      },
      500,
    );
  }
});
