import { expect, test } from "@playwright/test";
import { fixture } from "./global-setup";

test("custom practice generates, launches, and fits desktop and mobile", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(fixture.email);
  await page.getByLabel("Password").fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("link", { name: "Generate", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Generate Test" })).toBeVisible();
  await page.getByLabel("Category", { exact: true }).selectOption("Finance");
  await page
    .getByLabel("Blueprint", { exact: true })
    .selectOption({ label: "Browser Practice Blueprint - 1.0.0" });
  await expect(page.getByLabel("Milestone 7")).toBeChecked();
  await page.getByLabel("Questions", { exact: true }).fill("41");
  await page.getByRole("button", { name: "Generate Test" }).click();
  await expect(
    page.getByText("Free Test generation is limited to 40 questions."),
  ).toBeVisible();
  await page.getByLabel("Questions", { exact: true }).fill("2");
  await page.getByLabel("Timer", { exact: true }).selectOption("custom");
  await page.getByLabel("Minutes", { exact: true }).fill("5");
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 850 });
    await page.evaluate("window.scrollTo(0,0)");
    await expect(page.getByRole("button", { name: "Generate Test" })).toBeVisible();
    const fits = await page.evaluate<boolean>(
      "document.documentElement.scrollWidth <= window.innerWidth",
    );
    expect(fits).toBe(true);
    await page.screenshot({
      path: `test-results/generate-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("button", { name: "Generate Test" }).click();
  await page.getByRole("link", { name: "View Test ID" }).click();
  await page.getByRole("button", { name: "Start Test" }).click();
  await expect(page.getByRole("heading", { name: "Question 1 of 2" })).toBeVisible();
  await expect(page.getByText("Time remaining", { exact: true })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(5);
  await expect(page.getByRole("radio", { name: "I Don't Know" })).toBeVisible();
  await page.getByRole("button", { name: "Submit Test" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Submit Test" }).click();
  await expect(page).toHaveURL(/\/results\/[0-9a-f-]+$/);
});
