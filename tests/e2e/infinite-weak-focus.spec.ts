import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import type { Database } from "../../src/lib/supabase/database.types";
import { fixture } from "./global-setup";
import { createSessionUser, localService } from "./local-session-fixtures";

async function signedInClient(email: string) {
  const api = createClient<Database>(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  expect(
    (await api.auth.signInWithPassword({ email, password: fixture.password })).error,
  ).toBeNull();
  return api;
}

async function login(page: Page, email: string) {
  await page.goto("/infinite-run");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
}

test("focus selects unseen weak questions, survives resume, and visibly falls back and recovers", async ({
  page,
}) => {
  const account = await createSessionUser("weak-focus");
  const service = localService();
  expect(
    (
      await service
        .from("profiles")
        .update({ account_tier: "premium" })
        .eq("user_id", account.id)
    ).error,
  ).toBeNull();
  const topic = `Weak fixture ${account.id}`;
  const question = {
    question_type: "Scenario",
    options: ["One", "Two", "Three", "Four"],
    correct_option_id: "A",
    difficulty: "Hard",
    lifecycle_state: "Active",
    explanation: "Protected Focus explanation",
    tags: [topic],
  };
  const seed = await service
    .from("questions")
    .insert(
      Array.from({ length: 8 }, (_, i) => ({
        ...question,
        partition_key: "Marketing",
        question_text: `${topic} history ${i}`,
      })),
    )
    .select("id");
  expect(seed.error).toBeNull();
  const names = [`${topic} first active`, `${topic} second active`];
  const target = await service
    .from("questions")
    .insert([
      { ...question, partition_key: "Finance", question_text: names[0] },
      { ...question, partition_key: "Finance", question_text: names[1] },
      {
        ...question,
        partition_key: "Finance",
        question_text: `${topic} retired`,
        lifecycle_state: "Retired",
      },
      {
        ...question,
        partition_key: "Finance",
        question_text: `${topic} standard fallback`,
        tags: [],
      },
    ])
    .select("id,question_text");
  expect(target.error).toBeNull();
  const api = await signedInClient(account.email);
  const focusChoice = page.getByRole("radio", { name: "Weak Area Focus" });
  await login(page, account.email);
  await expect(page.getByText("Insufficient Data.", { exact: true })).toBeVisible();
  await expect(focusChoice).toBeDisabled();
  await expect(
    page.getByRole("radio", { name: "Standard Infinite Run" }),
  ).toBeChecked();
  for (const row of seed.data!) {
    expect(
      (
        await api.rpc("review_my_bank_question", {
          p_id: row.id,
          p_action: "attempt",
          p_acknowledge: true,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await api.rpc("review_my_bank_question", {
          p_id: row.id,
          p_action: "grade",
          p_option: "B",
        })
      ).error,
    ).toBeNull();
  }
  await page.reload();
  await expect(focusChoice).toBeEnabled();
  await focusChoice.check();
  await expect(page.getByRole("list", { name: "Ranked weak topics" })).toContainText(
    `${topic}: 0/8 correct`,
  );
  await page
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption("Finance");
  const started = page.waitForResponse("**/rpc/start_infinite_run_focused");
  await page.getByRole("button", { name: "Start Infinite Run" }).click();
  const body = await (await started).text();
  const payload: unknown = JSON.parse(body);
  expect(payload).toMatchObject({
    mode: "weak",
    selection_mode: "weak",
    focus_topics: [topic],
  });
  expect(body).not.toContain('"answer"');
  expect(body).not.toContain('"explanation"');
  await expect(page.getByRole("region", { name: "Weak Area Focus" })).toContainText(
    topic,
  );
  const legend = page.locator("legend");
  const first = await legend.innerText();
  expect(names).toContain(first);
  const next = async () => {
    await page.getByRole("radio", { name: /I Don.t Know/ }).check();
    await page.getByRole("button", { name: "Next", exact: true }).click();
  };
  await next();
  const second = names.find((name) => name !== first)!;
  await expect(legend).toHaveText(second);
  await page.getByRole("link", { name: "Exit run" }).click();
  await page.getByRole("link", { name: /Open saved Infinite Run/ }).click();
  await page.reload();
  await expect(legend).toHaveText(second);
  await expect(page.getByRole("region", { name: "Weak Area Focus" })).toContainText(
    topic,
  );

  const retired = target
    .data!.filter((q) => names.includes(q.question_text))
    .map((q) => q.id);
  expect(
    (
      await service
        .from("questions")
        .update({ lifecycle_state: "Retired" })
        .in("id", retired)
    ).error,
  ).toBeNull();
  await next();
  await expect(page.getByText(/Using Standard selection/)).toBeVisible();
  const replenished = `${topic} replenished`;
  expect(
    (
      await service.from("questions").insert({
        ...question,
        partition_key: "Finance",
        question_text: replenished,
      })
    ).error,
  ).toBeNull();
  await next();
  await expect(legend).toHaveText(replenished);
  await expect(page.getByText(/Using Standard selection/)).toHaveCount(0);
});

test("a free account cannot select focus or bypass the launch check", async ({
  page,
}) => {
  const account = await createSessionUser("weak-focus-free");
  const api = await signedInClient(account.email);
  await login(page, account.email);
  await expect(
    page.getByText("Premium access is required for Infinite Run."),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: "Weak Area Focus" })).toBeDisabled();
  expect(
    (await api.rpc("start_infinite_run_focused", { p_request: crypto.randomUUID() }))
      .error?.code,
  ).toBe("42501");
});
