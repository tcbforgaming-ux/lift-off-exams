import { expect, test } from "@playwright/test";
import { fixture } from "./global-setup";
import { localService } from "./local-session-fixtures";
test("near-match queue paginates and both authoring modes expose the same repository warning", async ({
  page,
}) => {
  const api = localService();
  const marker = crypto.randomUUID();
  const base = `Inventory case ${marker}: Which inventory procedure should a regional retailer use to reconcile monthly stock records before submitting the financial`;
  const original = `${base} report?`;
  const proposed = `${base} statement?`;
  expect(
    (
      await api.from("questions").insert({
        partition_key: "Finance",
        question_type: "Scenario",
        question_text: original,
        options: ["A", "B", "C", "D"],
        correct_option_id: "A",
        difficulty: "Easy",
        tags: ["Financial Analysis"],
      })
    ).error,
  ).toBeNull();
  expect(
    (
      await api.from("generated_question_candidates").insert(
        Array.from({ length: 27 }, (_, n) => ({
          partition_keys: ["Finance"],
          category: "Finance",
          performance_indicator: "FI:001",
          question_type: "Scenario",
          question_text: `${proposed} Version ${n}`,
          options: ["A", "B", "C", "D"],
          correct_option_id: "A",
          explanation: "Known synthetic explanation.",
          difficulty: "Easy",
          tags: ["Financial Analysis"],
        })),
      )
    ).error,
  ).toBeNull();
  await page.goto("/admin/duplicates");
  await page.getByLabel("Email").fill(fixture.adminEmail);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(
    page.getByRole("heading", { name: "Near-Duplicate Queue" }),
  ).toBeVisible();
  await expect(page.locator("article")).toHaveCount(25);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
  await expect(page.locator("article").first()).toBeVisible();
  await page.goto("/admin/questions/author");
  await page.getByRole("textbox", { name: "Question", exact: true }).fill(proposed);
  for (const letter of ["A", "B", "C", "D"])
    await page
      .getByRole("textbox", { name: `Option ${letter}` })
      .fill(`Choice ${letter}`);
  await page
    .getByRole("textbox", { name: "Explanation" })
    .fill("Known synthetic explanation.");
  await page.getByRole("textbox", { name: "Indicator", exact: true }).fill("FI:001");
  await page
    .getByRole("textbox", { name: "Tags (comma-separated)" })
    .fill("Financial Analysis");
  await page
    .getByRole("textbox", { name: "Reason", exact: true })
    .fill("Verify advisory duplicate warning.");
  await page.getByRole("button", { name: "Preview Question" }).click();
  await expect(
    page
      .getByRole("region", { name: "Advisory near matches" })
      .getByRole("link", { name: original }),
  ).toBeVisible();
  await page.getByRole("button", { name: "JSON Import" }).click();
  await page
    .getByRole("textbox", { name: "Reason", exact: true })
    .fill("Verify bulk advisory duplicate warning.");
  await page.getByLabel("JSON file").setInputFiles({
    name: "near.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify([
        {
          partitionKey: "Finance",
          performanceIndicator: "FI:001",
          questionType: "S",
          questionText: proposed,
          options: ["A", "B", "C", "D"].map((id) => ({ id, text: `Choice ${id}` })),
          correctOptionId: "A",
          explanation: "Known synthetic explanation.",
          difficulty: "Easy",
          tags: ["Financial Analysis"],
        },
      ]),
    ),
  });
  await page.getByRole("button", { name: "Preview Import" }).click();
  await expect(
    page
      .getByRole("region", { name: "Advisory near matches" })
      .getByRole("link", { name: original }),
  ).toBeVisible();
});
