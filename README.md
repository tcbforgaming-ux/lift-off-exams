# Lift Off Exams

Production rebuild foundation for Lift Off Exams.

The archived prototype remains in `outputs/lift-off-exams` for visual and functional
reference. The production application starts from `src`.

## Requirements

- Node.js 22 or newer
- pnpm 11 or newer
- Supabase project URL and anon key

## Local Setup

1. Install dependencies:

   ```powershell
   pnpm install
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

4. Start the app:

   ```powershell
   pnpm dev
   ```

   The app runs at `http://127.0.0.1:4173/`.

## Verification

Run the full local check suite:

```powershell
pnpm verify
```

Individual checks:

```powershell
supabase db reset
supabase test db
supabase db diff --local --schema public
pnpm typecheck
pnpm lint
pnpm format
pnpm test
pnpm test:e2e
pnpm build
```

Generate current local database types after migrations change:

```powershell
supabase gen types typescript --local --schema public > src/lib/supabase/database.types.ts
```

## Milestone 0 Scope

Implemented foundation only:

- React + TypeScript + Vite application scaffold
- Environment-variable validation
- Supabase browser client factory
- Route map and placeholder routes
- Responsive application shell
- Base design tokens and UI primitives
- Error boundary and loading boundary
- Vitest, ESLint, Prettier, TypeScript checks
- GitHub Actions CI workflow

Not implemented yet:

- Tests, quizzes, or real test generation
- Subscriptions or billing flows
- Analytics
- Admin features
- Changes to the existing question-generation pipeline

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
