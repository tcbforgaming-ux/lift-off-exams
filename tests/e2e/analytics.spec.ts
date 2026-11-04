import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
import { fixture } from "./global-setup";
import { createSessionUser, localService } from "./local-session-fixtures";

test("landing actions are real and owned analytics reflect a persisted test", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Lift Off Exams" })).toBeVisible();
  await expect(page.getByText("Learn Smarter, Not Harder")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open Test ID" })).toHaveAttribute(
    "href",
    "/test-id",
  );
  await expect(page.getByRole("button", { name: "Take Demo Test" })).toHaveCount(0);
  const account = await createSessionUser("analytics");
  const api = createClient<Database>(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  expect(
    (
      await api.auth.signInWithPassword({
        email: account.email,
        password: fixture.password,
      })
    ).error,
  ).toBeNull();
  const start = await api.rpc("start_test_session", {
    p_test_id: fixture.testId,
    p_idempotency_key: "analytics-browser",
  });
  expect(start.error).toBeNull();
  const session = start.data?.[0];
  expect(session?.session_id).toBeTruthy();
  expect(
    (
      await api.rpc("submit_test_session", {
        p_session_id: session!.session_id,
        p_expected_session_version: session!.session_version,
      })
    ).error,
  ).toBeNull();
  await page.goto("/analytics");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/analytics$/);
  await expect(page.getByText("Average score (past 30 days)")).toBeVisible();
  await expect(page.getByText("0%", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Time range")).toHaveCount(0);
  expect(
    (
      await localService()
        .from("subscriptions")
        .insert({ user_id: account.id, status: "active" })
    ).error,
  ).toBeNull();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Topic Accuracy" })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Time range").selectOption("lifetime");
  await page.getByRole("button", { name: "Apply Range" }).click();
  await expect(page.getByRole("heading", { name: "Score History" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Score history" }).getByRole("link"),
  ).toHaveCount(1);
  expect(
    await page.locator("main").evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.goto("/generate");
  await expect(
    page.getByRole("checkbox", { name: /Milestone 7.*Needs practice/ }),
  ).toBeChecked();
  await expect(page.getByLabel("Questions", { exact: true })).toHaveValue("4");
});
