import { expect, test, type Page } from "@playwright/test";

import { fixture } from "./global-setup";

async function logIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("a private user report can be reviewed, corrected, and audited by an administrator", async ({
  page,
}) => {
  await logIn(page, fixture.email);
  await page.goto(`/test-id?code=${fixture.testId}`);
  await page.getByRole("button", { name: /^(Start Test|Continue)$/ }).click();
  await expect(page).toHaveURL(/\/sessions\/[0-9a-f-]+$/);

  await page.getByRole("button", { name: "Report Question" }).click();
  const reportDialog = page.getByRole("dialog", { name: "Report question" });
  await reportDialog.getByLabel("Problem type").selectOption("unclear_wording");
  await reportDialog
    .getByLabel("What is wrong?")
    .fill(
      "The wording is ambiguous and should identify the relevant business context.",
    );
  await reportDialog.getByRole("button", { name: "Submit Report" }).click();
  await expect(reportDialog.getByText(/Report submitted/)).toBeVisible();
  await reportDialog.getByRole("button", { name: "Close" }).click();

  await page.goto("/reports");
  await expect(page.getByText("Unclear wording")).toBeVisible();
  await expect(page.getByText("open", { exact: true })).toBeVisible();

  await page.goto("/admin/reports");
  await expect(page).toHaveURL(/\/unauthorized$/);

  await page.getByRole("button", { name: "Log Out" }).click();
  await logIn(page, fixture.adminEmail);
  await page.goto("/admin/reports?status=open");
  const reportRow = page.getByRole("row").filter({ hasText: fixture.email });
  await expect(reportRow.getByRole("cell", { name: "Unclear wording" })).toBeVisible();
  await reportRow.getByRole("link", { name: "Review" }).click();
  await expect(page.getByRole("heading", { name: "Unclear wording" })).toBeVisible();

  await page
    .getByLabel("Question text")
    .fill("Which response best addresses the stated business context?");
  await page
    .getByLabel("Internal reason")
    .fill("Clarified wording after a verified user report");
  await page
    .getByLabel("Message to reporter")
    .fill("We clarified the question wording while preserving its tested concept.");
  await page.getByRole("button", { name: "Save Correction and Resolve" }).click();
  await expect(page.getByText("Question corrected and report resolved.")).toBeVisible();
  await expect(page.getByText("resolved", { exact: true })).toBeVisible();

  await page.goto("/admin/audit");
  const correctionAudit = page
    .locator(".report-card")
    .filter({ hasText: fixture.adminEmail })
    .filter({ hasText: "question.corrected" });
  await expect(correctionAudit).toHaveCount(1);
  await expect(correctionAudit).toContainText(
    "Clarified wording after a verified user report",
  );
});
