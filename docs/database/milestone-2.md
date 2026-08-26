# Milestone 2: Supabase Migration Foundation

This milestone establishes the ordered local migration history for the
production rebuild. It does not connect to, reset, or modify any remote
Supabase project.

## Audit Summary

The prototype schema existed as several standalone SQL files under
`outputs/lift-off-exams`:

- `supabase-schema.sql`
- `supabase-user-data.sql`
- `admin-controls.sql`
- `team-accounts.sql`
- `stripe-webhook.sql`

Those files contained duplicated definitions for profiles, user data tables,
billing tables, Stripe webhook state, and policies. The production migrations
replace that fragmented local history with chronological migrations under
`supabase/migrations`.

No tracked `supabase/migrations` directory existed before this milestone.

## Migration Order

1. `20260728000100_extensions_and_auth_helpers.sql`
   - Extensions, `profiles`, default profile creation from `auth.users`,
     trusted role helpers, shared `updated_at` trigger.
2. `20260728000200_core_question_test_schema.sql`
   - Questions, question versions, blueprints, Test IDs, reports.
3. `20260728000300_user_activity_billing_notifications.sql`
   - User-owned history, analytics, sessions, notifications, billing, deletion requests.
4. `20260728000400_admin_governance_and_teams.sql`
   - Admin audit, access links, governance, duplicate reviews, team accounts, assignments.
5. `20260728000500_question_generation_contracts.sql`
   - Existing Make/OpenAI generation database contract:
     `generation_queue_v3`, `deca_batch_jobs`,
     `generated_question_candidates`, `build_deca_batch_jsonl()`,
     `insert_generated_questions()`, and `publish_generated_question()`.
6. `20260728000600_trusted_functions_rls_and_grants.sql`
   - Trusted helper RPCs, RLS policies, least-privilege grants.

## Security Model

Authorization is enforced by trusted database state:

- Platform role comes from `public.profiles.role`.
- Owner self-suspension is respected by `public.current_user_role()`.
- Team permissions come from `public.team_memberships`.
- Client routes and JWT app metadata are not treated as authorization sources.

Every application-owned public table has RLS enabled.

Server-only tables:

- `public.generation_queue_v3`
- `public.deca_batch_jobs`
- `public.stripe_webhook_events`

These tables are managed through service-role Edge Functions or trusted server
processes. Browser clients are not granted table privileges or policies for
them.

`supabase/config.toml` is intentionally local-only. It defines a stable local
project id, local service ports, auth redirect URLs for the Vite dev server, and
the existing Edge Function JWT settings. It is not a remote project link.

## Local Validation

Before running reset or drift commands, confirm the CLI is local-only:

```powershell
supabase status
```

Do not run reset if the CLI reports a linked or remote database target for the
operation.

Fresh local rebuild:

```powershell
supabase db reset
```

Database tests:

```powershell
supabase test db
```

Schema drift check:

```powershell
supabase db diff --local --schema public
```

If generated types are adopted for the production frontend:

```powershell
supabase gen types typescript --local --schema public > src/lib/supabase/database.types.ts
```

Application checks after dependencies are installed:

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Known Local Tooling Limitation

During this milestone, the Supabase CLI was not available in the current shell.
The migrations and tests are committed as local files, but `supabase db reset`,
`supabase test db`, `supabase db diff`, and type generation still need to be run
on a machine/session where the Supabase CLI is installed and targeting the local
development stack.
