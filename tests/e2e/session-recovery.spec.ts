import { createClient } from "@supabase/supabase-js";
import {
  api as verificationApi,
  project as verificationProject,
} from "../../scripts/verification-target.mjs";
import { expect, test } from "@playwright/test";
import { fixture } from "./global-setup";
import type { Database } from "../../src/lib/supabase/database.types";

test("navigation and a lost exit both recover saved answers with a frozen server clock", async ({
  page,
}) => {
  const url = process.env.VITE_SUPABASE_URL;
  if (
    url !== verificationApi ||
    process.env.E2E_DISPOSABLE_PROJECT !== verificationProject
  )
    throw new Error("Disposable backend required");
  const api = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `recovery-${crypto.randomUUID()}@example.test`;
  expect(
    (
      await api.auth.admin.createUser({
        email,
        password: fixture.password,
        email_confirm: true,
      })
    ).error,
  ).toBeNull();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(`/test-id?code=${fixture.testId}`);
  await page.getByRole("button", { name: /^(Start Test|Continue)$/ }).click();
  await expect(page).toHaveURL(/\/sessions\//);
  const sessionId = new URL(page.url()).pathname.split("/").at(-1)!;
  await page.getByRole("radio", { name: /A Correct choice/ }).click();
  await expect(page.getByText("Answer saved.")).toBeVisible();
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await api.from("test_sessions").select("status").eq("id", sessionId).single())
          .data?.status,
    )
    .toBe("paused");
  await page.reload();
  await page.getByRole("link", { name: "Resume Session", exact: true }).click();
  await expect(page.getByText("This session is paused.")).toBeVisible();
  await expect(page.getByRole("radio", { name: /A Correct choice/ })).toBeChecked();
  await page.getByRole("button", { name: "Resume Session", exact: true }).click();
  await expect(page.getByRole("radio", { name: /A Correct choice/ })).toBeEnabled();
  await page.route("**/rest/v1/rpc/release_test_session", (route) =>
    route.abort("failed"),
  );
  await page.getByRole("link", { name: "Dashboard", exact: true }).click();
  const now = Date.now();
  const expired = await api
    .from("test_sessions")
    .update({
      accumulated_active_seconds: 0,
      active_period_started_at: new Date(now - 100000).toISOString(),
      presence_seen_at: new Date(now - 90000).toISOString(),
      presence_expires_at: new Date(now - 60000).toISOString(),
    })
    .eq("id", sessionId);
  expect(expired.error).toBeNull();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "Resume Session", exact: true }),
  ).toBeVisible();
  const frozen = await api
    .from("test_sessions")
    .select("status,accumulated_active_seconds,active_period_started_at")
    .eq("id", sessionId)
    .single();
  expect(frozen.error).toBeNull();
  expect(frozen.data).toMatchObject({
    status: "paused",
    accumulated_active_seconds: 10,
    active_period_started_at: null,
  });
});
