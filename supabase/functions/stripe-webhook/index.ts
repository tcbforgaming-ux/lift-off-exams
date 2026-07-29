import Stripe from "npm:stripe@18";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!stripeSecretKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY.",
  );
}

const stripe = new Stripe(stripeSecretKey);
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const handledEvents = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function idFromExpandable(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function unixDate(value: number | null | undefined): string | null {
  return value ? new Date(value * 1000).toISOString() : null;
}

function subscriptionPeriod(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  const periodStart =
    (subscription as Stripe.Subscription & { current_period_start?: number })
      .current_period_start ?? item?.current_period_start;
  const periodEnd =
    (subscription as Stripe.Subscription & { current_period_end?: number })
      .current_period_end ?? item?.current_period_end;

  return {
    start: unixDate(periodStart),
    end: unixDate(periodEnd),
  };
}

async function findUserId(
  customerId: string | null,
  metadataUserId?: string | null,
): Promise<string | null> {
  if (metadataUserId) return metadataUserId;
  if (!customerId) return null;

  const { data, error } = await supabase
    .from("billing_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) throw error;
  return data?.user_id ?? null;
}

async function saveBillingCustomer(
  userId: string,
  customerId: string,
  email?: string | null,
) {
  const { error } = await supabase.from("billing_customers").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      email: email || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
}

async function setAccountTier(userId: string, isPremium: boolean) {
  const accountTier = isPremium ? "premium" : "free";

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      account_tier: accountTier,
      account_type: accountTier,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (profileError) throw profileError;

  const { error: preferenceError } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        account_tier: accountTier,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

  if (preferenceError) throw preferenceError;
}

async function syncSubscription(
  subscription: Stripe.Subscription,
  fallbackUserId?: string | null,
) {
  const customerId = idFromExpandable(subscription.customer);
  const metadataUserId =
    subscription.metadata?.supabase_user_id || fallbackUserId || null;
  const userId = await findUserId(customerId, metadataUserId);

  if (!userId) {
    throw new Error(
      `Could not associate Stripe subscription ${subscription.id} with a Supabase user.`,
    );
  }

  if (customerId) {
    await saveBillingCustomer(userId, customerId);
  }

  const item = subscription.items.data[0];
  const period = subscriptionPeriod(subscription);
  const premiumStatuses = new Set(["active", "trialing"]);

  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      price_id: item?.price?.id || null,
      current_period_start: period.start,
      current_period_end: period.end,
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
  await setAccountTier(userId, premiumStatuses.has(subscription.status));
}

async function retrieveAndSyncSubscription(
  subscriptionId: string,
  fallbackUserId?: string | null,
) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
  await syncSubscription(subscription, fallbackUserId);
}

function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const legacySubscription = (
    invoice as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null;
    }
  ).subscription;

  if (legacySubscription) return idFromExpandable(legacySubscription);

  const parent = (
    invoice as Stripe.Invoice & {
      parent?: {
        subscription_details?: {
          subscription?: string | Stripe.Subscription | null;
        } | null;
      } | null;
    }
  ).parent;

  return idFromExpandable(parent?.subscription_details?.subscription);
}

async function processEvent(event: Stripe.Event) {
  if (!handledEvents.has(event.type)) return;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerId = idFromExpandable(session.customer);
    const userId =
      session.metadata?.supabase_user_id ||
      session.client_reference_id ||
      null;

    if (!userId) {
      throw new Error(
        `Checkout Session ${session.id} is missing its Supabase user id.`,
      );
    }

    if (customerId) {
      await saveBillingCustomer(
        userId,
        customerId,
        session.customer_details?.email || session.customer_email,
      );
    }

    const subscriptionId = idFromExpandable(session.subscription);
    if (subscriptionId) {
      await retrieveAndSyncSubscription(subscriptionId, userId);
    }
    return;
  }

  if (event.type.startsWith("customer.subscription.")) {
    const eventSubscription = event.data.object as Stripe.Subscription;

    // Retrieving the object prevents older, out-of-order events from
    // overwriting newer subscription state.
    try {
      await retrieveAndSyncSubscription(
        eventSubscription.id,
        eventSubscription.metadata?.supabase_user_id,
      );
    } catch (error) {
      if (event.type !== "customer.subscription.deleted") throw error;
      await syncSubscription(
        eventSubscription,
        eventSubscription.metadata?.supabase_user_id,
      );
    }
    return;
  }

  if (event.type.startsWith("invoice.")) {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId = invoiceSubscriptionId(invoice);
    if (subscriptionId) await retrieveAndSyncSubscription(subscriptionId);
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const signature = request.headers.get("Stripe-Signature");
  if (!signature) {
    return jsonResponse({ error: "Missing Stripe-Signature header" }, 400);
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider,
    );
  } catch (error) {
    console.error("Stripe signature verification failed:", error);
    return jsonResponse({ error: "Invalid Stripe signature" }, 400);
  }

  try {
    const { data: existingEvent, error: lookupError } = await supabase
      .from("stripe_webhook_events")
      .select("event_id")
      .eq("event_id", event.id)
      .maybeSingle();

    if (lookupError) throw lookupError;
    if (existingEvent) {
      return jsonResponse({ received: true, duplicate: true });
    }

    await processEvent(event);

    const { error: eventError } = await supabase
      .from("stripe_webhook_events")
      .insert({
        event_id: event.id,
        event_type: event.type,
        stripe_created_at: unixDate(event.created),
        processed_at: new Date().toISOString(),
      });

    if (eventError && eventError.code !== "23505") throw eventError;

    return jsonResponse({
      received: true,
      handled: handledEvents.has(event.type),
    });
  } catch (error) {
    console.error(`Stripe webhook ${event.id} failed:`, error);
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : "Stripe webhook processing failed.",
      },
      500,
    );
  }
});
