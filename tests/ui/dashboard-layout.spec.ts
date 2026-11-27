import { expect, test, type Page } from "@playwright/test";

async function mockAccount(page: Page, role: "admin" | "student") {
  const user = {
    id: "00000000-0000-4000-8000-000000000101",
    email: "ui-layout@example.test",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: new Date().toISOString(),
  };
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const token = [
    Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"),
    Buffer.from(
      JSON.stringify({ sub: user.id, exp: expires, role: "authenticated" }),
    ).toString("base64url"),
    "ui-only-not-a-real-signature",
  ].join(".");
  await page.route("http://127.0.0.1:55421/**", async (route) => {
    if (route.request().url().includes("/auth/v1/token")) {
      await route.fulfill({
        json: {
          access_token: token,
          refresh_token: "ui-only-refresh",
          token_type: "bearer",
          expires_in: 3600,
          expires_at: expires,
          user,
        },
      });
    } else if (route.request().url().includes("/rest/v1/profiles")) {
      await route.fulfill({
        json: {
          user_id: user.id,
          display_name: "Layout Reviewer",
          role,
          account_tier: "free",
          suspended_until: null,
        },
      });
    } else {
      await route.fulfill({ json: [] });
    }
  });
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill("Ui-only-password");
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("separate dashboard navigation and persistent themes fit mobile and desktop", async ({
  page,
}) => {
  await mockAccount(page, "admin");
  await expect(page.getByRole("link", { name: "Report Queue" })).toHaveCount(0);
  await page.getByRole("link", { name: "Admin Dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Admin navigation" }),
  ).toBeVisible();
  for (const theme of ["dark", "light"]) {
    const toggle = page.getByRole("switch", { name: "Dark mode" });
    if ((await toggle.getAttribute("aria-checked")) !== String(theme === "dark"))
      await toggle.click();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate<boolean>(
          "document.documentElement.scrollWidth <= innerWidth",
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/admin-${theme}-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page.getByRole("switch", { name: "Dark mode" }).click();
  await page.getByRole("link", { name: "User Dashboard" }).click();
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Admin navigation" })).toHaveCount(
    0,
  );
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: "test-results/user-dark-390.png", fullPage: true });
});

test("a student cannot enter the administrative workspace", async ({ page }) => {
  await mockAccount(page, "student");
  await expect(page.getByRole("link", { name: "Admin Dashboard" })).toHaveCount(0);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/unauthorized$/);
  await expect(page.getByRole("navigation", { name: "Admin navigation" })).toHaveCount(
    0,
  );
});
