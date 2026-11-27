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
  const generation = {
    p_blueprint_id: "e7300000-0000-4000-8000-000000000001",
    p_expected_blueprint_version: "1.0.0",
    p_requested_count: 4,
    p_seed: "analytics-highlight",
  };
  const original = await api.rpc("generate_test_from_blueprint", {
    ...generation,
    p_idempotency_key: "before-highlight",
  });
  expect(original.error).toBeNull();
  const originalId = original.data![0].test_id;
  const originalManifest = await api.rpc("get_generated_test_manifest", {
    p_test_id: originalId,
  });
  expect(originalManifest.error).toBeNull();
  const start = await api.rpc("start_test_session", {
    p_test_id: originalId,
    p_idempotency_key: "analytics-browser",
  });
  expect(start.error).toBeNull();
  const session = start.data?.[0];
  expect(session?.session_id).toBeTruthy();
  let version = session!.session_version;
  for (const [index, question] of originalManifest.data!.entries()) {
    const saved = await api.rpc("save_test_session_answer", {
      p_session_id: session!.session_id,
      p_question_id: question.question_id,
      p_selected_option_id: index === 0 ? "UNKNOWN" : "B",
      p_expected_session_version: version,
    });
    expect(saved.error).toBeNull();
    version = saved.data![0].session_version;
  }
  expect(
    (
      await api.rpc("submit_test_session", {
        p_session_id: session!.session_id,
        p_expected_session_version: version,
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
  await expect(page.getByText(/1 of 4 submitted answers/)).toBeVisible();
  await expect(
    page.getByRole("region", { name: "I Don’t Know Responses" }).getByRole("link"),
  ).toHaveCount(1);
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
  await page.getByLabel("Category", { exact: true }).selectOption("Finance");
  await page
    .getByLabel("Blueprint", { exact: true })
    .selectOption({ label: "Browser Practice Blueprint - 1.0.0" });
  const suggested = page.getByRole("checkbox", { name: /Milestone 7.*Needs practice/ });
  await expect(suggested).toBeChecked();
  await suggested.uncheck();
  await expect(suggested).not.toBeChecked();
  await expect(page.getByLabel("Questions", { exact: true })).toHaveValue("4");
  const repeated = await api.rpc("generate_test_from_blueprint", {
    ...generation,
    p_idempotency_key: "after-highlight",
  });
  expect(repeated.error).toBeNull();
  const manifest = await api.rpc("get_generated_test_manifest", {
    p_test_id: repeated.data![0].test_id,
  });
  expect(manifest.error).toBeNull();
  expect(manifest.data!.map((row) => row.question_id)).toEqual(
    originalManifest.data!.map((row) => row.question_id),
  );
});
