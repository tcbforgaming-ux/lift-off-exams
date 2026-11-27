import { expect, test, type Page } from "@playwright/test";
import { fixture } from "./global-setup";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("staff catalog supports keyboard tag creation and blueprint activation", async ({
  page,
}) => {
  await login(page, fixture.adminEmail);
  await page.goto("/admin/catalog");
  await page.setViewportSize({ width: 390, height: 844 });
  const tag = `Catalog ${crypto.randomUUID()}`;
  const label = page.getByLabel("Tag label", { exact: true });
  await label.fill(tag);
  await label.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Description", { exact: true })).toBeFocused();
  await page
    .getByLabel("Description", { exact: true })
    .fill("Synthetic catalog metadata");
  await page.getByLabel("Tag change reason").fill("Synthetic tag creation");
  await page.getByRole("button", { name: "Save Tag" }).click();
  await expect(
    page.getByText("Tag saved. Existing associations are unchanged."),
  ).toBeVisible();
  expect(
    await page
      .locator("main")
      .evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("button", { name: "Blueprints", exact: true }).click();
  await page.getByLabel("Blueprint name").fill(tag);
  await page.getByLabel("New version").fill("1");
  await page.getByLabel("Draft reason").fill("Synthetic draft creation");
  const allocation = page.getByLabel("Allocation JSON");
  const valid = await allocation.inputValue();
  await allocation.fill("{");
  await page.getByRole("button", { name: "Save as Draft" }).click();
  await expect(page.getByText("Allocation must be valid JSON.")).toBeVisible();
  await allocation.fill(valid);
  await page.getByRole("button", { name: "Save as Draft" }).click();
  await expect(
    page.getByText("Draft created. The active version is unchanged."),
  ).toBeVisible();
  await page.getByLabel("Activation reason").fill("Synthetic draft activation");
  await page.getByRole("button", { name: "Activate Draft" }).click();
  await expect(page.getByText("Blueprint activated.")).toBeVisible();
  await expect(page.getByRole("button", { name: `${tag} · 1 · Active` })).toBeVisible();
  await page.getByRole("button", { name: "Log Out" }).click();
  await login(page, fixture.email);
  await page.goto("/admin/catalog");
  await expect(page).toHaveURL(/\/unauthorized$/);
});
