# Lift Off Exams

Lift Off Exams is a DECA practice application with saved Test IDs, recoverable
test sessions, results, and staff question review.

The archived prototype remains in `outputs/lift-off-exams` for visual and functional
reference. The production application starts from `src`.

## Requirements

- Node.js 24 and pnpm 11.9.0 (the CI versions)
- Supabase CLI and Docker Desktop for the isolated verification backend
- The API URL and public anon key for your intended local development stack

## Local Setup

1. Install dependencies:

   ```powershell
   pnpm install --frozen-lockfile
   ```

2. Create a local environment file:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Fill in:

   ```text
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   VITE_APP_ENV
   ```

4. With your intended development backend running, start the app:

   ```powershell
   pnpm dev
   ```

   The app runs at `http://127.0.0.1:4173/`.

## Verification

Run the full local check suite:

```powershell
pnpm verify
```

For backend verification, use the marked isolated stack. The verification
runner validates its local target and refuses to reset a database containing
non-fixture accounts:

```powershell
pnpm test:backend
pnpm test:hosted-grants
pnpm test:pipeline
pnpm test:pipeline:db
pnpm exec playwright install chromium
pnpm test:backend:e2e
pnpm test:backend:stop
```

The isolated defaults are API `59471`, database `59472`, shadow database
`59479`, and browser app `4176`, all accessed through loopback. Leave the
interactive backend on `58421` alone. If Windows or Docker reserves these ports,
set `LIFTOFF_VERIFY_API_PORT` to a free base (database: base + 1; shadow:
base + 8) and, if needed, set `LIFTOFF_VERIFY_BROWSER_PORT`. Keep the same
settings for all verification commands, including stop.

On Windows, if CLI 2.110.0 fails to start Postgres with a read-only pgSodium
key mount, use the [official 2.109.1 release](https://github.com/supabase/cli/releases/tag/v2.109.1)
side by side and set `LIFTOFF_VERIFY_SUPABASE_CLI` to its absolute executable
path. If bundled Chromium is unavailable and Google Chrome is installed, set
`LIFTOFF_VERIFY_CHROME=1` for the backend browser command. This still runs
against the marked backend with synthetic accounts.

The backend check verifies schema drift and generated public types. On type
drift it leaves the generated artifact under the marked verification directory
for review, without overwriting the tracked file.

## Current Scope

Available workflows include sign-in, Test Mode generation, Test ID preview and
replay, session recovery, results, history, analytics, question search and review,
question reports, staff candidate
and question review, blueprint management, owner governance, and local
self-service account recovery and deletion verification.

Demo, Quiz, Infinite Run, team assignments, and live billing and notification
delivery are not ready for use. See the
[reconstruction ledger](docs/reconstruction/completion-ledger.md) for the
remaining Version 1 work and local verification limits.

## Authentication Configuration

Milestone 3 auth setup and manual Supabase/Google configuration are documented
in `docs/auth/milestone-3.md`.

## Question Repository

Milestone 4 question-repository access, pagination, lifecycle auditing, and
performance-review guidance are documented in `docs/questions/milestone-4.md`.

## Generation Pipeline

Milestone 5 generation/import contracts, Edge Function secrets, Make Scheduler
calls, and admin pipeline monitoring are documented in
`docs/generation/milestone-5.md`.

## Deterministic Test IDs

Milestone 6 Test ID identity, canonical blueprints, deterministic selection,
authorization, compatibility, performance checks, and deployment order are
documented in `docs/tests/milestone-6.md`.

## Test Sessions And Results

Milestone 7 session identity, recovery, state transitions, server scoring, history,
free-user explanation enforcement, concurrency, and local Playwright setup are
documented in `docs/tests/milestone-7.md`.

## Reports And Administrative Review

Milestone 8 private question reporting, staff review states, correction and lifecycle
transactions, immutable auditing, historical scoring safeguards, and local acceptance
testing are documented in `docs/reports/milestone-8.md`.
