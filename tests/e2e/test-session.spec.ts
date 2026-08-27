import { expect, test, type Page } from "@playwright/test";

import { fixture } from "./global-setup";

async function logIn(page: Page, email: string = fixture.email) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("free user can recover, submit, and reopen a secure test session", async ({
  page,
}) => {
  const responseBodies: string[] = [];
  page.on("response", async (response) => {
    if (!response.url().includes("/rest/v1/rpc/")) return;
    responseBodies.push(await response.text().catch(() => ""));
  });

  await logIn(page);
  await page.goto(`/test-id?code=${fixture.testId}`);
  await expect(
    page.getByRole("heading", { name: "Milestone 7 Browser Fixture" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start Test" }).click();
  await expect(page).toHaveURL(/\/sessions\/[0-9a-f-]+$/);
  const sessionUrl = page.url();

  await expect(page.getByRole("heading", { name: "Question 1 of 4" })).toBeVisible();
  await page.getByRole("radio", { name: /B Distractor B/ }).click();
  await expect(page.getByText("Answer saved.")).toBeVisible();
  await expect(page.getByRole("radio", { name: /B Distractor B/ })).toBeChecked();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("radio", { name: /A Correct choice/ }).click();
  await expect(page.getByRole("radio", { name: /A Correct choice/ })).toBeChecked();
  await page.getByRole("button", { name: "Previous" }).click();
  await expect(page.getByRole("radio", { name: /B Distractor B/ })).toBeChecked();

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(page.getByText("This session is paused.")).toBeVisible();
  await expect(page.getByRole("radio", { name: /B Distractor B/ })).toBeDisabled();

  await page.goto("/history");
  await expect(page.getByText(fixture.testId)).toBeVisible();
  await page.getByRole("link", { name: "Resume Session" }).click();
  await expect(page).toHaveURL(sessionUrl);
  await page.getByRole("button", { name: "Resume Session" }).click();
  await expect(page.getByRole("radio", { name: /B Distractor B/ })).toBeEnabled();

  const preSubmissionPayloads = responseBodies.join("\n");
  expect(preSubmissionPayloads).not.toContain("correct_option_id");
  expect(preSubmissionPayloads).not.toContain("Protected E2E explanation");

  await page.getByRole("button", { name: "Submit Test" }).click();
  await expect(page.getByRole("dialog", { name: "Submit this test?" })).toContainText(
    "2 unanswered questions remain",
  );
  await page.getByRole("dialog").getByRole("button", { name: "Submit Test" }).click();
  await expect(page).toHaveURL(/\/results\/[0-9a-f-]+$/);
  const resultUrl = page.url();
  await expect(page.getByRole("heading", { name: "25.00%" })).toBeVisible();
  await expect(
    page.getByText(/Explanations are available with an active premium/),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Protected E2E explanation");

  await page.reload();
  await expect(page).toHaveURL(resultUrl);
  await expect(page.getByRole("heading", { name: "25.00%" })).toBeVisible();
  await page.getByRole("link", { name: "Back to History" }).click();
  await page.getByRole("link", { name: "View Result" }).click();
  await expect(page).toHaveURL(resultUrl);

  const deliveredPayloads = responseBodies.join("\n");
  expect(deliveredPayloads).not.toContain("Protected E2E explanation");
});

test("users cannot open another user's session or result", async ({
  page,
  browser,
}) => {
  await logIn(page);
  await page.goto(`/test-id?code=${fixture.testId}`);
  await page.getByRole("button", { name: "Start Test" }).click();
  await expect(page).toHaveURL(/\/sessions\/[0-9a-f-]+$/);
  const sessionUrl = page.url();
  await page.getByRole("button", { name: "Submit Test" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Submit Test" }).click();
  await expect(page).toHaveURL(/\/results\/[0-9a-f-]+$/);
  const resultUrl = page.url();

  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await logIn(otherPage, fixture.otherEmail);
  await otherPage.goto(sessionUrl);
  await expect(
    otherPage.getByRole("heading", { name: "Session unavailable" }),
  ).toBeVisible();
  await otherPage.goto(resultUrl);
  await expect(
    otherPage.getByRole("heading", { name: "Result unavailable" }),
  ).toBeVisible();
  await otherContext.close();
});
