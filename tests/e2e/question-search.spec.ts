import { expect, test } from "@playwright/test";
import { fixture } from "./global-setup";
import { createSessionUser } from "./local-session-fixtures";

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
});
