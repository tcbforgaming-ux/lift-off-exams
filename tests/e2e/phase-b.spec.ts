import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { fixture } from "./global-setup";
import { createSessionUser, localService } from "./local-session-fixtures";

const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function generatedFixture(count: number, paid: boolean) {
  const api = localService();
  const user = await createSessionUser("phase-b");
  if (paid)
    expect(
      (
        await api.from("subscriptions").insert({
          user_id: user.id,
          status: "active",
          current_period_end: new Date(Date.now() + 86400000).toISOString(),
        })
      ).error,
    ).toBeNull();
  const tag = `Phase B ${crypto.randomUUID()}`;
  const ids = Array.from({ length: count }, () => crypto.randomUUID());
  expect(
    (
      await api.from("questions").insert(
        ids.map((id, index) => ({
          id,
          partition_key: "Finance",
          question_type: "Scenario",
          question_text: `${tag} question ${index + 1}?`,
          options: ["Correct choice", "Wrong B", "Wrong C", "Wrong D"],
          correct_option_id: "A",
          explanation: `Protected ${tag}`,
          difficulty: "Easy",
          tags: [tag],
          lifecycle_state: "Active",
        })),
      )
    ).error,
  ).toBeNull();
  const blueprint = crypto.randomUUID();
  expect(
    (
      await api.from("blueprint_versions").insert({
        id: blueprint,
        blueprint_name: tag,
        category: "Finance",
        cluster: "Finance",
        level: "State",
        version: "1",
        total_questions: count,
        distribution: {
          schema_version: 1,
          strata: [{ id: "all", count, tags: [tag] }],
        },
        change_reason: "Synthetic local Phase B fixture",
      })
    ).error,
  ).toBeNull();
  const actor = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  expect(
    (
      await actor.auth.signInWithPassword({
        email: user.email,
        password: fixture.password,
      })
    ).error,
  ).toBeNull();
  const generated = await actor.rpc("generate_test_from_blueprint", {
    p_blueprint_id: blueprint,
    p_expected_blueprint_version: "1",
    p_requested_count: count,
    p_seed: null,
    p_idempotency_key: crypto.randomUUID(),
  });
  expect(generated.error).toBeNull();
  const definition = (
    generated.data as {
      test_id: string;
      test_definition_id: string;
      success: boolean;
    }[]
  )[0];
  expect(definition.success).toBe(true);
  return { api, actor, user, tag, ids, ...definition };
}

test("a genuine competing client is denied while reloads and stale generations cannot invalidate the current page", async ({
  page,
  browser,
}) => {
  const user = await createSessionUser("presence-client");
  await login(page, user.email);
  await page.goto(`/test-id?code=${fixture.testId}`);
  await page.getByRole("button", { name: /^(Start Test|Continue)$/ }).click();
  await page.getByRole("radio", { name: /A Correct choice/ }).click();
  await expect(page.getByText("Answer saved.")).toBeVisible();
  const sessionId = page.url().split("/").at(-1)!;
  const api = localService();
  const old = (
    await api
      .from("test_sessions")
      .select("presence_client_id,presence_generation")
      .eq("id", sessionId)
      .single()
  ).data!;
  await page.reload();
  await expect(page.getByRole("radio", { name: /A Correct choice/ })).toBeChecked();
  if (await page.getByRole("button", { name: "Resume Session" }).isVisible())
    await page.getByRole("button", { name: "Resume Session" }).click();
  await expect(page.getByRole("radio", { name: /A Correct choice/ })).toBeEnabled();
  const other = await browser.newContext();
  const second = await other.newPage();
  await login(second, user.email);
  await second.goto(`/sessions/${sessionId}`);
  await expect(second.getByRole("alert")).toContainText("another tab");
  const actor = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  await actor.auth.signInWithPassword({
    email: user.email,
    password: fixture.password,
  });
  const stale = await actor.rpc("release_test_session", {
    p_session_id: sessionId,
    p_client_id: old.presence_client_id,
    p_generation: old.presence_generation,
  });
  expect(stale.error).toBeNull();
  expect((stale.data as { status: string }).status).toBe("in_progress");
  const legacy = await actor.rpc("release_test_session", {
    p_session_id: sessionId,
    p_client_id: old.presence_client_id,
  });
  expect(legacy.error?.message).toContain("generation");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByText("This session is paused.")).toBeVisible();
  await second.reload();
  await second.getByRole("button", { name: "Resume Session" }).click();
  await expect(second.getByRole("radio", { name: /A Correct choice/ })).toBeChecked();
  await expect(second.getByRole("radio", { name: /A Correct choice/ })).toBeEnabled();
  await other.close();
});

test("a paid 250-question attempt persists exact membership, uncertainty, timer preference and immutable summaries", async ({
  page,
}) => {
  const f = await generatedFixture(250, true);
  await login(page, f.user.email);
  await page.goto(`/test-id?code=${f.test_id}`);
  await page.getByLabel("Minutes", { exact: true }).fill("10");
  await page.screenshot({ path: "test-results/phase-b-preview-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/phase-b-preview-mobile.png" });
  expect(
    await page
      .locator("main")
      .first()
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Start Test" }).click();
  await expect(page.getByRole("heading", { name: "Question 1 of 250" })).toBeVisible();
  await page.screenshot({ path: "test-results/phase-b-session-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/phase-b-session-mobile.png" });
  expect(
    await page
      .locator("main")
      .first()
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  const sessionId = page.url().split("/").at(-1)!;
  const keys: string[] = [];
  page.on("response", async (response) => {
    if (response.url().includes("get_test_session")) keys.push(await response.text());
  });
  await page.getByRole("button", { name: "Hide Timer" }).click();
  await expect(page.getByText("Hidden", { exact: true })).toBeVisible();
  await page.getByRole("radio", { name: "I Don't Know" }).click();
  await expect(page.getByText("Answer saved.")).toBeVisible();
  await page.getByRole("button", { name: "Clear Response" }).click();
  await expect(page.getByText("Response cleared.")).toBeVisible();
  await expect(page.getByRole("radio", { name: "I Don't Know" })).not.toBeChecked();
  await page.getByRole("radio", { name: "I Don't Know" }).click();
  await expect(page.getByText("Answer saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Hidden", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Resume Session" }).click();
  await page
    .getByRole("button", { name: "Question 250, unanswered", exact: true })
    .click();
  await page.getByRole("radio", { name: /A Correct choice/ }).click();
  await expect(page.getByText("Answer saved.")).toBeVisible();
  expect(keys.join("")).not.toContain("correct_option_id");
  expect(keys.join("")).not.toContain("Protected");
  const now = new Date().toISOString();
  expect(
    (
      await f.api
        .from("test_sessions")
        .update({
          accumulated_active_seconds: 310,
          active_period_started_at: now,
          presence_seen_at: now,
        })
        .eq("id", sessionId)
    ).error,
  ).toBeNull();
  await page.reload();
  await expect(
    page.getByText("Final five minutes: the timer is visible."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Hide Timer" })).toBeDisabled();
  await page.getByRole("button", { name: "Resume Session" }).click();
  await page.getByRole("button", { name: "Submit Test", exact: true }).click();
  await expect(page.getByRole("button", { name: "Keep Working" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Submit Test" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Keep Working" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Submit Test", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Submit Test", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Submit Test" }).click();
  await expect(page.getByRole("heading", { name: "0.40%" })).toBeVisible();
  const items = await f.api
    .from("test_result_items")
    .select("question_id", { count: "exact" })
    .eq("session_id", sessionId);
  expect(items.error).toBeNull();
  expect(items.count).toBe(250);
  await page.screenshot({ path: "test-results/phase-b-results-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page
      .locator("main")
      .first()
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: "test-results/phase-b-results-mobile.png" });
  for (let offset = 0; offset < f.ids.length; offset += 50) {
    expect(
      (
        await f.api
          .from("questions")
          .update({ tags: ["Changed after result"], difficulty: "Hard" })
          .in("id", f.ids.slice(offset, offset + 50))
      ).error,
    ).toBeNull();
  }
  await page.reload();
  await expect(page.getByRole("heading", { name: "0.40%" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "difficulty performance" }),
  ).toContainText("Easy");
  await page.goto("/history");
  await expect(page.getByText("Difficulty: Easy")).toBeVisible();
  await expect(page.locator(".history-item")).toContainText(f.tag);
});

test("save/pause and save/submit serialize on the server and completed attempts reject stale writes", async () => {
  const f = await generatedFixture(4, false);
  const started = await f.actor.rpc("start_test_session_configured", {
    p_test_id: f.test_id,
    p_idempotency_key: crypto.randomUUID(),
  });
  expect(started.error).toBeNull();
  const session = started.data as { session_id: string };
  const questions = await f.actor.rpc("get_test_session", {
    p_session_id: session.session_id,
  });
  const questionId = (questions.data as { question_id: string }[])[0].question_id;
  const save = (version: number) =>
    f.actor.rpc("save_test_session_answer", {
      p_session_id: session.session_id,
      p_question_id: questionId,
      p_selected_option_id: "UNKNOWN",
      p_expected_session_version: version,
    });
  const race = await Promise.all([
    save(1),
    f.actor.rpc("pause_test_session", {
      p_session_id: session.session_id,
      p_expected_session_version: 1,
    }),
  ]);
  expect(race.filter((r) => r.error === null)).toHaveLength(1);
  const row = (
    await f.api
      .from("test_sessions")
      .select("status,version")
      .eq("id", session.session_id)
      .single()
  ).data!;
  let version = row.version;
  if (row.status === "paused") {
    const resumed = await f.actor.rpc("resume_test_session", {
      p_session_id: session.session_id,
      p_expected_session_version: version,
    });
    expect(resumed.error).toBeNull();
    version = Number(resumed.data);
  }
  const submission = await Promise.all([
    save(version),
    f.actor.rpc("submit_test_session", {
      p_session_id: session.session_id,
      p_expected_session_version: version,
    }),
  ]);
  expect(submission.filter((r) => r.error === null)).toHaveLength(1);
  const final = (
    await f.api
      .from("test_sessions")
      .select("version,status")
      .eq("id", session.session_id)
      .single()
  ).data!;
  if (final.status !== "submitted")
    expect(
      (
        await f.actor.rpc("submit_test_session", {
          p_session_id: session.session_id,
          p_expected_session_version: final.version,
        })
      ).error,
    ).toBeNull();
  expect((await save(1)).error).not.toBeNull();
  const retry = await f.actor.rpc("submit_test_session", {
    p_session_id: session.session_id,
    p_expected_session_version: 1,
  });
  expect(retry.error).toBeNull();
  const results = await f.api
    .from("test_results")
    .select("session_id", { count: "exact" })
    .eq("session_id", session.session_id);
  expect(results.count).toBe(1);
});

test("updated generation makes a new identity without changing original order and refuses a depleted pool", async ({
  page,
}) => {
  const f = await generatedFixture(4, false);
  const membership = await f.api
    .from("test_definition_questions")
    .select("question_id,position")
    .eq("test_definition_id", f.test_definition_id)
    .order("position");
  expect(membership.error).toBeNull();
  expect(
    (
      await f.api
        .from("questions")
        .update({ question_text: `${f.tag} corrected wording` })
        .eq("id", f.ids[0])
    ).error,
  ).toBeNull();
  await login(page, f.user.email);
  await page.goto(`/test-id?code=${f.test_id}`);
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Generate Updated Test" }).click();
  await expect(page).not.toHaveURL(new RegExp(`code=${f.test_id}$`));
  const newId = new URL(page.url()).searchParams.get("code")!;
  expect(newId).not.toBe(f.test_id);
  const original = await f.api
    .from("test_definition_questions")
    .select("question_id,position")
    .eq("test_definition_id", f.test_definition_id)
    .order("position");
  expect(original.data).toEqual(membership.data);
  expect(
    (
      await f.api
        .from("questions")
        .update({ lifecycle_state: "Retired" })
        .in("id", f.ids)
    ).error,
  ).toBeNull();
  await page.goto(`/test-id?code=${f.test_id}`);
  await page.getByRole("button", { name: "Generate Updated Test" }).click();
  await expect(page.getByRole("status")).toContainText("cannot satisfy");
  expect(new URL(page.url()).searchParams.get("code")).toBe(f.test_id);
});
