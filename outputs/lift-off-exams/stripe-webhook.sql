create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  stripe_created_at timestamptz,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;

-- No browser-facing policies are intentionally created. The Stripe webhook
-- accesses this table with the service-role key.

create index if not exists stripe_webhook_events_processed_at_idx
on public.stripe_webhook_events (processed_at desc);

alter table public.subscriptions
add column if not exists stripe_customer_id text;

alter table public.subscriptions
add column if not exists stripe_subscription_id text;

alter table public.subscriptions
add column if not exists status text not null default 'inactive';

alter table public.subscriptions
add column if not exists price_id text;

alter table public.subscriptions
add column if not exists current_period_start timestamptz;

alter table public.subscriptions
add column if not exists current_period_end timestamptz;

alter table public.subscriptions
add column if not exists cancel_at_period_end boolean not null default false;

alter table public.subscriptions
add column if not exists updated_at timestamptz not null default now();

create unique index if not exists subscriptions_stripe_subscription_id_idx
on public.subscriptions (stripe_subscription_id)
where stripe_subscription_id is not null;

alter table public.profiles
add column if not exists account_tier text not null default 'free';

alter table public.profiles
add column if not exists account_type text;
