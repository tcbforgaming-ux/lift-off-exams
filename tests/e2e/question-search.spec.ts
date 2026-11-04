import { expect, test } from "@playwright/test";
import { fixture } from "./global-setup";
import { createSessionUser, localService } from "./local-session-fixtures";

test("free users can search, dismiss the unseen warning, then attempt without spoilers", async ({
  page,
}) => {
  const account = await createSessionUser("question-search");
  await page.goto("/search");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/search$/);
  await page.getByLabel("Keyword").fill("Milestone 7 browser question 1");
  await page.getByRole("button", { name: "Search Questions" }).click();
  const question = page.getByRole("button", { name: "Open Question", exact: true });
  await expect(question).toHaveCount(1);
  await question.click();
  await expect(page.getByRole("heading", { name: "Unseen Question" })).toBeFocused();
  await expect(
    page.getByText("Milestone 7 browser question 1", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Close Question" }).click();
  await expect(question).toBeFocused();
  await question.click();
  await page.getByRole("button", { name: "Attempt Question" }).click();
  await page.getByRole("radio", { name: "Correct choice" }).check();
  await page.getByRole("button", { name: "Check Answer" }).click();
  await expect(page.getByText("Correct. Answer: A")).toBeVisible();
  await expect(page.getByText("Protected E2E explanation 1")).toHaveCount(0);
  await expect(page.getByText(/Answered correctly · Viewed 1 times/)).toBeVisible();
  await expect(
    page.getByText("Ever correct: Recorded · Ever incorrect: Not recorded"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close Question" }).click();
  await question.click();
  await page.getByRole("button", { name: "Attempt Question" }).click();
  await page.getByRole("radio", { name: "Distractor B" }).check();
  await page.getByRole("button", { name: "Check Answer" }).click();
  await expect(
    page.getByText("Ever correct: Recorded · Ever incorrect: Recorded"),
  ).toBeVisible();
});

test("search pages past 25, resets filters, and hides retired questions", async ({
  page,
}) => {
  const account = await createSessionUser("search-pages");
  const prefix = `Search pagination ${crypto.randomUUID()}`;
  const { error } = await localService()
    .from("questions")
    .insert(
      Array.from({ length: 28 }, (_, n) => ({
        partition_key: "Finance",
        question_type: "Scenario",
        question_text: `${prefix} ${n}`,
        options: ["A", "B", "C", "D"].map((id) => ({ id, text: id })),
        correct_option_id: "A",
        difficulty: n === 0 ? "Hard" : "Easy",
        lifecycle_state: n === 27 ? "Retired" : "Active",
      })),
    );
  expect(error).toBeNull();
  await page.goto("/search");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await page.getByLabel("Keyword").fill(prefix);
  await page.getByRole("button", { name: "Search Questions" }).click();
  const rows = page.getByRole("button", { name: "Open Question", exact: true });
  await expect(rows).toHaveCount(25);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(rows).toHaveCount(2);
  await page.getByLabel("Difficulty").selectOption("Hard");
  await page.getByRole("button", { name: "Search Questions" }).click();
  await expect(page.getByText("Page 1", { exact: true })).toBeVisible();
  await expect(rows).toHaveCount(1);
});
