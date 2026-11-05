import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
import { fixture } from "./global-setup";
import { createSessionUser, localService } from "./local-session-fixtures";

test("Hardcore commits only on Next and resumes at its saved position", async ({
  page,
}) => {
  const account = await createSessionUser("hardcore");
  const service = localService();
  expect(
    (
      await service
        .from("subscriptions")
        .insert({ user_id: account.id, status: "active" })
    ).error,
  ).toBeNull();
  expect(
    (
      await service.from("questions").insert({
        partition_key: "Finance",
        question_type: "Scenario",
        question_text: `Hardcore ${account.id}`,
        options: ["First", "Second", "Third", "Fourth"],
        correct_option_id: "A",
        difficulty: "Hard",
        explanation: "Hardcore explanation",
      })
    ).error,
  ).toBeNull();
  await page.goto("/hardcore");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await page.getByLabel("Strike cap").selectOption("2");
  const load = page.waitForResponse((response) =>
    response.url().endsWith("/rpc/get_hardcore"),
  );
  await page.getByRole("button", { name: "Start Hardcore" }).click();
  const active = (await (await load).json()) as { question: { id: string } };
  const key = await service
    .from("questions")
    .select("correct_option_id")
    .eq("id", active.question.id)
    .single();
  expect(key.error).toBeNull();
  const correct = "ABCD".indexOf(key.data!.correct_option_id);
  expect(correct).toBeGreaterThanOrEqual(0);
  await expect(page.getByText("Strikes: 0/2")).toBeVisible();
  const next = page.getByRole("button", { name: "Next", exact: true });
  await expect(next).toBeDisabled();
  const answers = page.getByRole("radio");
  await answers.nth((correct + 1) % 4).check();
  await answers.nth(correct).check();
  await expect(page.getByText("Strikes: 0/2")).toBeVisible();
  await next.click();
  await expect(
    page.getByRole("status").filter({ hasText: "Strikes: 0/2" }),
  ).toContainText("Question 2");
  const unknown = page.getByRole("radio", { name: /I Don.t Know/ });
  await unknown.check();
  await expect(page.getByText("Strikes: 0/2")).toBeVisible();
  await next.click();
  await expect(page.getByText("Strikes: 1/2")).toBeVisible();
  const url = page.url();
  await page.getByRole("link", { name: "Exit run" }).click();
  await page.getByRole("link", { name: "Resume: 1/2 strikes" }).click();
  await expect(page).toHaveURL(url);
  await page.reload();
  await expect(
    page.getByRole("status").filter({ hasText: "Strikes: 1/2" }),
  ).toContainText("Question 3");
  await unknown.check();
  await next.click();
  await expect(page.getByRole("heading", { name: "Run ended" })).toBeVisible();
  await expect(page.getByText("1 of 3 correct")).toBeVisible();
  await expect(next).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("Strike limit reached: 2/2")).toBeVisible();
});

test("concurrent Next requests commit the same Hardcore position once", async () => {
  const account = await createSessionUser("hardcore-race");
  expect(
    (
      await localService()
        .from("questions")
        .insert({
          partition_key: "Finance",
          question_type: "Scenario",
          question_text: `Hardcore concurrency ${account.id}`,
          options: ["First", "Second", "Third", "Fourth"],
          correct_option_id: "A",
          difficulty: "Medium",
          explanation: "Protected explanation",
        })
    ).error,
  ).toBeNull();
  const api = createClient<Database>(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
    },
  );
  expect(
    (
      await api.auth.signInWithPassword({
        email: account.email,
        password: fixture.password,
      })
    ).error,
  ).toBeNull();
  const start = await api.rpc("start_hardcore", { p_request: crypto.randomUUID() });
  expect(start.error).toBeNull();
  const id = (start.data as { id: string }).id;
  const next = () =>
    api.rpc("advance_hardcore", {
      p_run: id,
      p_position: 1,
      p_request: crypto.randomUUID(),
      p_response: "UNKNOWN",
    });
  const responses = await Promise.all([next(), next()]);
  expect(responses.filter(({ error }) => error === null)).toHaveLength(1);
  expect(responses.filter(({ error }) => error?.code === "22023")).toHaveLength(1);
  expect((await api.rpc("get_hardcore", { p_run: id })).data).toMatchObject({
    committed: 1,
    strikes: 1,
    correct: 0,
    question: null,
  });
  const review = await api.rpc("review_hardcore", { p_run: id, p_explanations: true });
  expect(review.error).toBeNull();
  expect(review.data).toHaveLength(1);
  expect(JSON.stringify(review.data)).not.toContain('"explanation"');
});
