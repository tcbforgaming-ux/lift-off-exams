import { expect, test } from "@playwright/test";
import { fixture } from "./global-setup";

test("staff can switch dashboards and persist dark mode across reloads", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("link", { name: "Admin Dashboard" })).toBeVisible();
  await page.getByLabel("Email").fill(fixture.adminEmail);
  await page.getByLabel("Password").fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
  const adminNav = page.getByRole("navigation", { name: "Admin navigation" });
  await expect(
    adminNav.getByRole("link", { name: "Questions", exact: true }),
  ).toHaveAttribute("href", "/admin/questions");
  await expect(
    adminNav.getByRole("link", { name: "Generate", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("switch", { name: "Dark mode" }).check();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.getByRole("switch", { name: "Dark mode" })).toBeChecked();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
    expect(
      await page.evaluate<boolean>(
        "document.documentElement.scrollWidth <= innerWidth",
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/admin-dark-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("link", { name: "User Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("navigation", { name: "Admin navigation" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("link", { name: "Report Queue" })).toHaveCount(0);
  await expect(page.getByRole("switch", { name: "Dark mode" })).toBeChecked();
  await page.screenshot({ path: "test-results/user-dark-390.png", fullPage: true });
  await page.getByRole("switch", { name: "Dark mode" }).uncheck();
  await page.getByRole("link", { name: "Admin Dashboard" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "test-results/admin-light-1440.png", fullPage: true });
  await page.getByRole("link", { name: "Questions", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/questions$/);
  await expect(
    page.getByRole("navigation", { name: "Admin navigation" }),
  ).toBeVisible();
});
