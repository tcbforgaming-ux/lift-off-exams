import { expect, test, type Page } from "@playwright/test";
import { fixture } from "./global-setup";

async function submit(page: Page, email: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
}
test("real admin login preserves a deep safe destination, query and fragment", async ({
  page,
}) => {
  await page.goto("/admin/reports?status=open#queue");
  await expect(page).toHaveURL(/\/login$/);
  await submit(page, fixture.adminEmail);
  await expect(page).toHaveURL(/\/admin\/reports\?status=open#queue$/);
  await expect(
    page.getByRole("heading", { name: "Question Report Queue", exact: true }),
  ).toBeVisible();
});
test("real standard login cannot turn an admin destination into authorization", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
  await submit(page, fixture.email);
  await expect(page).toHaveURL(/\/unauthorized$/);
  await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Admin Dashboard" })).toHaveCount(0);
});
test("real customer destination and direct login use consistent defaults", async ({
  page,
}) => {
  await page.goto("/profile?tab=basic#name");
  await expect(page).toHaveURL(/\/login$/);
  await submit(page, fixture.email);
  await expect(page).toHaveURL(/\/profile\?tab=basic#name$/);
  await page.goto("/login");
  await expect(page).toHaveURL(/\/dashboard$/);
});
test("slow actual profile lookup never shows unauthorized content or loses destination", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested!: () => void;
  const started = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route("**/rest/v1/profiles?**", async (route) => {
    requested();
    await gate;
    await route.continue();
  });
  await submit(page, fixture.adminEmail);
  await started;
  await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toHaveCount(0);
  release();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
});
test("logout and another account login do not reuse admin destination", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
  await submit(page, fixture.adminEmail);
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole("button", { name: "Log Out" }).click();
  await page.goto("/login");
  await submit(page, fixture.email);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("link", { name: "Admin Dashboard" })).toHaveCount(0);
});
