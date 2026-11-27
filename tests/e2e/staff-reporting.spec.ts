import { expect, test } from "@playwright/test";
import { fixture } from "./global-setup";
import { createSessionUser, localService } from "./local-session-fixtures";

test("staff sees flagged report volume, opens the question, and can change the date range", async ({
  page,
}) => {
  const service = localService();
  const account = await createSessionUser("report-volume");
  const prompt = `Staff reporting browser question ${account.id}`;
  const question = await service
    .from("questions")
    .insert({
      partition_key: "Finance",
      question_type: "Scenario",
      question_text: prompt,
      options: ["First", "Second", "Third", "Fourth"],
      correct_option_id: "A",
      difficulty: "Easy",
    })
    .select("id")
    .single();
  expect(question.error).toBeNull();
  const reports = await service.from("question_reports").insert(
    Array.from({ length: 3 }, (_, index) => ({
      entity_type: "question",
      question_id: question.data!.id,
      reporter_id: account.id,
      category: "other",
      reason: "other",
      status: "open",
      description: `Synthetic staff reporting case ${index}`,
      idempotency_key: crypto.randomUUID(),
    })),
  );
  expect(reports.error).toBeNull();
  await page.goto("/admin");
  await page.getByLabel("Email").fill(fixture.adminEmail);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page.getByRole("heading", { name: "Platform Reporting" })).toBeVisible();
  await expect(page.getByText("Total accounts", { exact: true })).toBeVisible();
  await page.getByLabel("Flagged only").check();
  const row = page.getByRole("row", { name: new RegExp(prompt) });
  await expect(row.getByText("3 (3 open or in review)")).toBeVisible();
  await expect(row.getByText("High report volume")).toBeVisible();
  await row.getByRole("link", { name: prompt }).click();
  await expect(page).toHaveURL(
    new RegExp(`/admin/questions\\?question=${question.data!.id}$`),
  );
  await page.goBack();
  await page.getByLabel("From (UTC)", { exact: true }).fill("2020-06-01");
  await page.getByLabel("Through (UTC)", { exact: true }).fill("2020-06-01");
  await page.getByRole("button", { name: "Apply date range" }).click();
  await expect(page.getByText("No scores", { exact: true })).toBeVisible();
  await expect(
    page.getByText("No questions match this range and filter."),
  ).toBeVisible();
});
