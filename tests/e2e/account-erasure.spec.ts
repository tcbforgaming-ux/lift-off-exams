import { expect, test, type Page } from "@playwright/test";
import { project as verificationProject } from "../../scripts/verification-target.mjs";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
import { fixture } from "./global-setup";
import { createSessionUser, localService } from "./local-session-fixtures";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
}

function controlErasureClock(userId: string, afterWarning: boolean) {
  localService();
  if (!/^[0-9a-f-]{36}$/.test(userId)) throw new Error("Invalid synthetic account ID.");
  return execFileSync(
    "docker",
    [
      "exec",
      `supabase_db_${verificationProject}`,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-qAt",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `update private.account_erasure_jobs set base_deadline=now()-interval '1 day',
      warning_due_at=now()-interval '8 days'
      ${afterWarning ? ",warning_sent_at=now()-interval '8 days'" : ""}
      where user_id='${userId}'::uuid returning id;`,
    ],
    { encoding: "utf8" },
  ).trim();
}

test("two trusted workers finish one account and an old JWT cannot read data", async () => {
  const account = await createSessionUser("erasure-worker");
  const service = localService();
  const client = createClient<Database>(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  expect(
    (
      await client.auth.signInWithPassword({
        email: account.email,
        password: fixture.password,
      })
    ).error,
  ).toBeNull();
  const billing = await service.from("subscriptions").insert({
    user_id: account.id,
    status: "active",
    stripe_subscription_id: `sub_fixture_${account.id}`,
  });
  expect(billing.error).toBeNull();
  const repeated = await Promise.all([
    client.rpc("request_account_deletion", { p_confirmation: "DELETE" }),
    client.rpc("request_account_deletion", { p_confirmation: "DELETE" }),
  ]);
  expect(repeated.map((item) => item.error)).toEqual([null, null]);
  expect(repeated[0]?.data).toEqual(repeated[1]?.data);
  const job = controlErasureClock(account.id, false);
  expect(job).toMatch(/^[0-9a-f-]{36}$/);
  const denied = await client.rpc("advance_account_erasure", { p_job: job });
  expect(denied.error).not.toBeNull();
  const output = execFileSync(
    process.execPath,
    ["scripts/run-local-account-erasure.mjs"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        ACCOUNT_ERASURE_LOCAL_API: process.env.VITE_SUPABASE_URL,
        ACCOUNT_ERASURE_LOCAL_SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    },
  );
  expect(output).toContain("warning_sent");
  controlErasureClock(account.id, true);
  const run = () => service.rpc("advance_account_erasure", { p_job: job });
  const [recovery, first, second] = await Promise.all([
    client.rpc("recover_account_from_deletion"),
    run(),
    run(),
  ]);
  expect(recovery.error?.message).toContain("recovery window is closed");
  expect([first.data, second.data].sort()).toEqual(["billing_captured", "claimed"]);
  expect((await run()).data).toBe("billing_checkpointed");
  const finished = await Promise.all([run(), run()]);
  expect(finished.map((item) => item.data)).toEqual(["completed", "completed"]);
  expect((await service.auth.admin.getUserById(account.id)).data.user).toBeNull();
  const blocked = await client.from("profiles").select("user_id");
  expect(blocked.error?.message).toContain("Account no longer exists.");
});

test("a recoverable deletion restricts an existing session and can be cancelled from login", async ({
  page,
}) => {
  const account = await createSessionUser("erasure-recovery");
  const client = createClient<Database>(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  expect(
    (
      await client.auth.signInWithPassword({
        email: account.email,
        password: fixture.password,
      })
    ).error,
  ).toBeNull();
  await login(page, account.email);
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/profile");
  await page.getByRole("link", { name: "Account Deletion" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const confirmation = page.getByLabel("Type DELETE to confirm");
  await confirmation.fill("DELETE");
  await confirmation.focus();
  await page.keyboard.press("Tab");
  const password = page.getByLabel("Current password");
  await expect(password).toBeFocused();
  await password.fill(fixture.password);
  await page.getByRole("button", { name: "Request Deletion" }).click();
  await expect(page.getByRole("heading", { name: "Deletion Pending" })).toBeVisible();
  expect(
    await page.locator("main").evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  const blocked = await client
    .from("profiles")
    .select("user_id")
    .eq("user_id", account.id);
  expect(blocked.error?.details).toBe("account_recovery_only");
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/account\/deletion$/);
  await page.getByRole("button", { name: "Log Out" }).click();
  await login(page, account.email);
  await expect(page).toHaveURL(/\/account\/deletion$/);
  await password.fill(fixture.password);
  await page.getByRole("button", { name: "Recover Account" }).click();
  await expect(page.getByText(/Account recovered/)).toBeVisible();
  expect(
    (await client.from("profiles").select("user_id").eq("user_id", account.id)).error,
  ).toBeNull();
});
