import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { createSessionUser, localService } from "./local-session-fixtures";
import { fixture } from "./global-setup";
import type { Database } from "../../src/lib/supabase/database.types";

function client() {
  return createClient<Database>(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

async function login(page: Page, email: string, route: string) {
  await page.goto(route);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
}

async function seedQuizPool() {
  const prefix = crypto.randomUUID();
  const { error } = await localService()
    .from("questions")
    .insert(
      Array.from({ length: 20 }, (_, i) => ({
        partition_key: "Finance",
        question_type: "Scenario",
        question_text: `Weekly allowance ${prefix} ${i}`,
        options: ["First", "Second", "Third", "Fourth"],
        correct_option_id: "A",
        difficulty: "Medium",
        explanation: "Protected weekly explanation",
      })),
    );
  expect(error).toBeNull();
}

async function signInDirect(email: string) {
  const api = client();
  expect(
    (await api.auth.signInWithPassword({ email, password: fixture.password })).error,
  ).toBeNull();
  return api;
}

test("free Quiz reserves the final shared slot, records a result, and shows exhaustion", async ({
  page,
}) => {
  await seedQuizPool();
  const account = await createSessionUser("weekly-quiz");
  const api = await signInDirect(account.email);
  await login(page, account.email, "/dashboard");
  const quota = page.getByRole("region", { name: "Weekly allowances" });
  const balance = (label: string) =>
    quota.getByText(label, { exact: true }).locator("..");
  await expect(balance("Generated Tests remaining")).toContainText("3");
  await expect(balance("Test ID uses remaining")).toContainText("7");
  await expect(balance("Shared Test, Quiz and Hardcore slots remaining")).toContainText(
    "10",
  );
  const reset = (await api.rpc("get_my_weekly_activity_allowance").single()).data!
    .resets_at;
  await expect(quota.locator("time")).toHaveAttribute("datetime", reset);
  await expect(quota.getByText(/Monday.*00:00/)).toBeVisible();

  expect(
    (
      await api.rpc("start_test_session", {
        p_test_id: fixture.testId,
        p_idempotency_key: "mixed-first",
      })
    ).error,
  ).toBeNull();
  for (let n = 0; n < 8; n++) {
    expect(
      (await api.rpc("start_quiz", { p_request: crypto.randomUUID() })).error,
    ).toBeNull();
  }
  await page.goto("/dashboard");
  await expect(balance("Test ID uses remaining")).toContainText("6");
  await expect(balance("Shared Test, Quiz and Hardcore slots remaining")).toContainText(
    "1",
  );
  await page.goto("/quiz");
  await expect(page.getByText(/Free Quiz attempts use the shared/)).toBeVisible();
  const launchRequests: string[] = [];
  const loseFirstResponse = "**/rest/v1/rpc/start_quiz";
  await page.route(loseFirstResponse, async (route) => {
    launchRequests.push(route.request().postData() ?? "");
    if (launchRequests.length === 1) {
      const committed = await route.fetch();
      expect(committed.ok()).toBe(true);
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Start Quiz", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Start Quiz", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Question 1 of 20" })).toBeVisible();
  expect(launchRequests).toHaveLength(2);
  expect(launchRequests[0]).toBe(launchRequests[1]);
  await page.unroute(loseFirstResponse);
  expect(await page.getByText("Time remaining").count()).toBe(0);
  const session = new URL(page.url()).pathname;
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByText("This session is paused.")).toBeVisible();
  await page.goto("/dashboard");
  await expect(balance("Shared Test, Quiz and Hardcore slots remaining")).toContainText(
    "0",
  );
  await page.goto(session);
  await page.getByRole("button", { name: "Resume Session" }).click();
  await page.getByRole("button", { name: "Submit Quiz" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Submit Quiz" }).click();
  await expect(page.getByText(/Submitted Quiz result/)).toBeVisible();
  await page.goto("/history");
  await expect(
    page.locator(`a[href="/results/${session.split("/").at(-1)}"]`),
  ).toBeVisible();
  await page.goto("/analytics");
  await expect(
    page.getByText("Completed activities", { exact: true }).locator(".."),
  ).toContainText("1");
  await expect(page.getByLabel("Activity mode")).toHaveCount(0);
  await page.goto("/quiz");
  await page.getByRole("button", { name: "Start Quiz", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("resets Monday at 00:00 UTC");
  await expect(page).toHaveURL(/\/quiz$/);
});

test("concurrent free Quiz launches can claim the final shared slot only once", async () => {
  await seedQuizPool();
  const account = await createSessionUser("weekly-race");
  const api = await signInDirect(account.email);
  for (let n = 0; n < 9; n++) {
    expect(
      (await api.rpc("start_quiz", { p_request: crypto.randomUUID() })).error,
    ).toBeNull();
  }
  const requests = [crypto.randomUUID(), crypto.randomUUID()];
  const results = await Promise.all(
    requests.map((p_request) => api.rpc("start_quiz", { p_request })),
  );
  const winner = results.findIndex((result) => !result.error);
  expect(winner).toBeGreaterThanOrEqual(0);
  expect(results[1 - winner].error?.message).toContain(
    "Weekly Test, Quiz and Hardcore",
  );
  const replay = await api.rpc("start_quiz", { p_request: requests[winner] });
  expect(replay.data).toEqual(results[winner].data);
  const { data, error } = await api.rpc("get_my_weekly_activity_allowance").single();
  expect(error).toBeNull();
  expect(data).toMatchObject({
    shared_remaining: 0,
    generated_remaining: 3,
    test_id_remaining: 7,
  });
});

test("the final generation and Test ID slots are serialized across launch paths", async () => {
  const account = await createSessionUser("weekly-test-race");
  const api = await signInDirect(account.email);
  const gen = {
    p_blueprint_id: "e7300000-0000-4000-8000-000000000001",
    p_expected_blueprint_version: "1.0.0",
    p_requested_count: 4,
  };
  for (let n = 0; n < 2; n++) {
    const result = await api.rpc("generate_test_from_blueprint", {
      ...gen,
      p_idempotency_key: `saved-${n}`,
    });
    expect(result.data?.[0].success).toBe(true);
  }
  const genKeys = ["final-gen-a", "final-gen-b"];
  const genResults = await Promise.all(
    genKeys.map((p_idempotency_key) =>
      api.rpc("generate_test_from_blueprint", { ...gen, p_idempotency_key }),
    ),
  );
  const win = genResults.findIndex((r) => r.data?.[0].success);
  expect(win).toBeGreaterThanOrEqual(0);
  expect(genResults[1 - win].error?.message).toContain("Weekly generated Test");
  const own = genResults[win].data![0].test_id;
  expect(
    (
      await api.rpc("generate_test_from_blueprint", {
        ...gen,
        p_idempotency_key: genKeys[win],
      })
    ).data?.[0].test_id,
  ).toBe(own);

  for (let n = 0; n < 6; n++) {
    const r = await api.rpc("start_test_session", {
      p_test_id: fixture.testId,
      p_idempotency_key: `retake-${n}`,
    });
    expect(r.error).toBeNull();
    const abandoned = await api.rpc("abandon_test_session", {
      p_session_id: r.data![0].session_id,
    });
    expect(abandoned.data).toBe("abandoned");
  }
  const launches = await Promise.all([
    api.rpc("start_test_session", { p_test_id: own, p_idempotency_key: "final-id-a" }),
    api.rpc("start_test_session_configured", {
      p_test_id: fixture.testId,
      p_idempotency_key: "final-id-b",
    }),
  ]);
  expect(launches.filter((r) => !r.error)).toHaveLength(1);
  expect(launches.find((r) => r.error)?.error?.message).toContain("Weekly Test ID");
  const balance = await api.rpc("get_my_weekly_activity_allowance").single();
  expect(balance.data).toMatchObject({
    generated_remaining: 0,
    test_id_remaining: 0,
    shared_remaining: 9,
  });
});
