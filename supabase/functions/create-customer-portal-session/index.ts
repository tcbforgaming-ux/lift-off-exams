import Stripe from "npm:stripe@18";
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

function validReturnUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!stripeSecretKey || !supabaseUrl || !serviceRoleKey) {
      throw new Error("Required server secrets are missing.");
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }

    const accessToken = authorization.slice("Bearer ".length);
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return jsonResponse(
        { error: userError?.message || "Invalid user session" },
        401,
      );
    }

    const requestBody = await request.json().catch(() => ({}));
    const requestedReturnUrl =
      requestBody.return_url || requestBody.returnUrl;
    const returnUrl =
      validReturnUrl(requestedReturnUrl) ||
      validReturnUrl(Deno.env.get("APP_URL")) ||
      "http://127.0.0.1:4173/?billing=portal";

    const { data: billingCustomer, error: customerError } = await supabaseAdmin
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (customerError) throw customerError;
    if (!billingCustomer?.stripe_customer_id) {
      return jsonResponse(
        {
          error:
            "No Stripe customer is connected to this account. Complete checkout before opening billing management.",
        },
        404,
      );
    }

    const stripe = new Stripe(stripeSecretKey);
    const customer = await stripe.customers.retrieve(
      billingCustomer.stripe_customer_id,
    );

    if (customer.deleted) {
      return jsonResponse(
        { error: "The Stripe customer connected to this account was deleted." },
        410,
      );
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: returnUrl,
    });

    return jsonResponse({
      url: portalSession.url,
      portal_session_id: portalSession.id,
    });
  } catch (error) {
    console.error("Customer portal function error:", error);

    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create a customer portal session.",
      },
      500,
    );
  }
});
