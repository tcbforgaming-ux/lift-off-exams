import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
import { fixture } from "./global-setup";
import { createSessionUser, localService } from "./local-session-fixtures";

test("paid Quiz launches 20 untimed questions and saves a resumable, owned result", async ({
  page,
}) => {
  const account = await createSessionUser("quiz");
  const other = await createSessionUser("quiz-other");
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
      await service.from("questions").insert(
        Array.from({ length: 20 }, (_, i) => ({
          partition_key: "Finance",
          question_type: "Scenario",
          question_text: `Quiz browser ${account.id} ${i}`,
          options: ["First", "Second", "Third", "Fourth"],
          correct_option_id: "A",
          difficulty: "Easy",
          explanation: "Protected Quiz explanation",
        })),
      )
    ).error,
  ).toBeNull();
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
  const payloads: string[] = [];
  page.on("response", async (response) => {
    if (response.url().includes("/rest/v1/rpc/"))
      payloads.push(await response.text().catch(() => ""));
  });
  await page.goto("/quiz");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await page.getByRole("button", { name: "Start Quiz" }).click();
  await expect(page.getByRole("heading", { name: "Question 1 of 20" })).toBeVisible();
  const sessionId = new URL(page.url()).pathname.split("/").at(-1)!;
  await expect(page.getByText("Time remaining")).toHaveCount(0);
  const first = await api.rpc("get_test_session", { p_session_id: sessionId });
  expect(first.error).toBeNull();
  const key = await service
    .from("questions")
    .select("correct_option_id")
    .eq("id", first.data![0].question_id)
    .single();
  expect(key.error).toBeNull();
  const wrong = key.data?.correct_option_id === "B" ? "A" : "B";
  await page.getByRole("radio", { name: new RegExp(`^${wrong} `) }).click();
  await expect(page.getByText("Answer saved.")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: "I Don't Know" }).click();
  await expect(page.getByText("Answer saved.")).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByText("This session is paused.")).toBeVisible();
  await page.goto("/history");
  await expect(
    page.locator(".history-item").filter({ hasText: "Mixed practice" }),
  ).toContainText("Quiz");
  await page.locator(`a[href="/sessions/${sessionId}"]`).click();
  await page.getByRole("button", { name: "Resume Session" }).click();
  await expect(page.getByRole("radio", { name: "I Don't Know" })).toBeChecked();
  expect(payloads.join("\n")).not.toContain("correct_option_id");
  expect(payloads.join("\n")).not.toContain("Protected Quiz explanation");
  const current = await api.rpc("get_test_session", { p_session_id: sessionId });
  expect(current.error).toBeNull();
  await page.getByRole("button", { name: "Submit Quiz" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Submit Quiz" }).click();
  await expect(page.getByText(/Submitted Quiz result/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Download CSV" })).toHaveCount(0);
  const repeat = await api.rpc("submit_test_session", {
    p_session_id: sessionId,
    p_expected_session_version: current.data![0].session_version,
  });
  expect(repeat.error).toBeNull();
  const result = await api.rpc("get_test_result", { p_session_id: sessionId });
  expect(result.error).toBeNull();
  expect(result.data!.slice(0, 3).map((item) => item.selected_option_id)).toEqual([
    wrong,
    "UNKNOWN",
    null,
  ]);
  const evidence = await api.rpc("search_my_question_bank", {
    p_status: "Answered incorrectly",
  });
  expect(evidence.error).toBeNull();
  expect(evidence.data).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: result.data![0].question_id,
        latest_option_id: wrong,
        ever_incorrect: true,
      }),
      expect.objectContaining({
        id: result.data![1].question_id,
        latest_option_id: "UNKNOWN",
        ever_incorrect: true,
      }),
    ]),
  );
  expect(evidence.data).not.toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: result.data![2].question_id }),
    ]),
  );
  expect(
    (
      await api.rpc("prepare_my_test_export", {
        p_kind: "result",
        p_format: "csv",
        p_request: crypto.randomUUID(),
        p_session: sessionId,
      })
    ).error?.code,
  ).toBe("42501");
  await page.getByRole("link", { name: "Back to History" }).click();
  await page.locator(`a[href="/results/${sessionId}"]`).click();
  await expect(page.getByText(/Submitted Quiz result/)).toBeVisible();
  expect(
    (
      await api.auth.signInWithPassword({
        email: other.email,
        password: fixture.password,
      })
    ).error,
  ).toBeNull();
  expect(
    (await api.rpc("get_test_result", { p_session_id: sessionId })).error,
  ).not.toBeNull();
  expect(
    (await api.rpc("get_test_result_explanations", { p_session_id: sessionId })).error,
  ).not.toBeNull();
});
