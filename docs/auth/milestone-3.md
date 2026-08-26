# Milestone 3: Authentication, Profiles, and Roles

This milestone implements the production authentication surface for the Vite
rebuild and keeps authorization anchored in Supabase database state.

## Implemented Flows

- Email/password registration
- Login and logout
- Persistent browser sessions through Supabase Auth
- Google OAuth start and callback handling
- Forgot-password request
- Reset-password form
- Email-verification state page
- Basic profile page
- Unauthorized-access state

## Profile Creation

Profiles are created by the trusted database trigger
`public.handle_new_auth_user()` on `auth.users`.

The browser may send a `display_name` hint during registration. Protected fields
such as `role`, `account_tier`, `suspended_until`, and owner-suspension state are
never accepted from client metadata.

Every profile is keyed by `profiles.user_id`, which references `auth.users(id)`.
The trigger uses `on conflict do nothing`, so retries and duplicate callback
handling do not create multiple profiles.

## Role Model

The Version 1 product roles are represented with these trusted database values:

| Product role  | Database value |
| ------------- | -------------- |
| Standard user | `student`      |
| Administrator | `admin`        |
| Owner         | `owner`        |

The app labels `student` as "Standard user". Authorization checks use
`public.profiles.role`, `public.current_user_role()`, RLS policies, and trusted
RPCs. User-editable metadata, request bodies, cookies, and frontend visibility
are not authorization sources.

## Role Changes

`public.set_user_platform_role(target_user_id, new_role, reason, governance_vote_id)`
is an owner-only RPC for granting or revoking administrator access. It does not
create or remove owners.

The RPC records:

- Acting user
- Target user
- Previous role
- New role
- Reason
- Optional governance vote id
- Timestamp through `admin_audit_logs.created_at`

Role changes are transactional because the profile update and audit insert occur
inside one database function call.

## Initial Owner Bootstrap

The initial owner must be created outside the public application with a trusted
service-role context after the user account exists:

```sql
select public.bootstrap_initial_owner(
  '00000000-0000-0000-0000-000000000000',
  'Initial production owner bootstrap'
);
```

Replace the UUID with the target `auth.users.id`. Do not put emails, service
role keys, or owner bootstrap rules in frontend source code. This function is
granted to `service_role` only and is blocked after an active owner exists.

## Owner Removal Governance

Owner-removal governance is implemented as a database-enforced foundation.

Version 1 rules:

- Any active eligible owner may initiate an owner-removal vote.
- The target owner cannot vote on their own removal.
- Votes expire. The default expiry is seven days.
- Owners may withdraw their own active ballot until the vote expires or executes.
- If three or more eligible non-target owners exist, three approvals are required.
- If fewer than three eligible non-target owners exist, all eligible non-target
  owners are required, with a minimum of one non-target owner.
- Execution is transactional: the final ballot, target owner demotion, vote
  closure, and audit record are completed in one RPC call.

Owner states:

- Eligible: `active`
  Can vote and use owner privileges.
- Self-suspended: `self_suspended`
  Cannot vote; may self-restore.
- Inactive suspended: `inactive_suspended`
  Cannot vote after more than a week of owner inactivity; server maintenance can
  mark this state.
- Abstained / governance suspended: `governance_suspended`
  Cannot vote or self-restore; other owners must decide restoration.
- Unavailable: `unavailable`
  Excluded from future owner decisions and owner eligibility.

Owner removal uses:

- `public.initiate_owner_removal_vote(...)`
- `public.cast_owner_removal_vote(...)`
- `public.withdraw_owner_removal_vote(...)`
- `public.expire_owner_removal_votes()`
- `public.mark_inactive_owners(...)`

The public application should call these RPCs from owner-only UI. Service-role
maintenance may call expiry and inactivity routines on a schedule.

## Required Supabase Dashboard Configuration

Configure Supabase Auth URLs without recording secrets in the repository:

- Site URL: `http://127.0.0.1:4173` for local Vite
- Additional redirect URLs:
  - `http://127.0.0.1:4173/auth/callback`
  - `http://127.0.0.1:4173/reset-password`
  - production equivalents after deployment
- Email confirmations enabled for production
- Recovery email templates should point to `/reset-password`

## Required Google Configuration

In Google Cloud Console:

- Configure an OAuth Web Client.
- Add the Supabase callback URL:
  `https://<project-ref>.supabase.co/auth/v1/callback`
- Add local and production app origins where appropriate.

In Supabase:

- Enable Google as an Auth provider.
- Add the Google client ID and client secret.
- Do not commit either value.

Local automated tests do not require production Google credentials. They verify
the surrounding callback/session and client-safety logic; full external Google
OAuth must be verified manually in a staging project.
