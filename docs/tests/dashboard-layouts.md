# Dashboard Layouts and Themes

- `/dashboard` is the customer workspace. Staff tools are not mixed into its navigation.
- `/admin` is the staff overview with a separate sidebar. Questions live at
  `/admin/questions`; report, audit, and generation routes retain their existing URLs.
- Staff can switch between workspaces. The public login header offers an admin
  entry link, but protected routes and database authorization remain enforced.
- The dark-mode switch appears in both workspaces and on public pages. It defaults
  to the device preference, then saves an explicit choice in browser storage under
  `liftoff-theme`. Themes synchronize across tabs. No Supabase data is changed.

## Verification

```powershell
pnpm verify
pnpm exec playwright test --config playwright.ui.config.ts
```

The UI suite intercepts a local mock API. It verifies separate navigation, student
route denial, saved themes, reloads, and desktop/mobile screenshots without Docker
or any access to remote accounts. It does not verify live database authorization.

The database-backed acceptance scenario is included in `pnpm test:e2e` and requires
the local Supabase stack. Docker was unavailable for that suite during this change.
