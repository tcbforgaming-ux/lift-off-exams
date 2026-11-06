import { expect, test, type Page } from "@playwright/test";
import { fixture } from "./global-setup";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(fixture.adminEmail);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("held profile exits the loader; Retry keeps the authorized deep link", async ({
  page,
}) => {
  await login(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let delivered!: () => void;
  const lateResponse = new Promise<void>((resolve) => {
    delivered = resolve;
  });
  await page.route(
    "**/rest/v1/profiles?**",
    async (route) => {
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      await gate;
      await route.fulfill({ response });
      delivered();
    },
    { times: 1 },
  );
  await page.goto("/admin/reports?status=open#queue");
  await expect(page.getByText("Checking session")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Could not verify your session" }),
  ).toBeVisible({ timeout: 8_000 });
  await expect(
    page.getByRole("heading", { name: "Question Report Queue" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(
    page.getByRole("heading", { name: "Question Report Queue" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/reports\?status=open#queue$/);
  await page.getByRole("button", { name: "Log Out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  release();
  await lateResponse;
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Question Report Queue" }),
  ).toHaveCount(0);
});

test("held token refresh exits the loader without signing out and can retry", async ({
  page,
}) => {
  await login(page);
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find(
      (name) => name.startsWith("sb-") && name.endsWith("-auth-token"),
    );
    if (!key) throw new Error("Missing synthetic auth session");
    const record = JSON.parse(localStorage.getItem(key) ?? "{}") as {
      expires_at?: number;
    };
    record.expires_at = 1;
    localStorage.setItem(key, JSON.stringify(record));
  });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tokenRoute = "**/auth/v1/token?grant_type=refresh_token";
  await page.route(tokenRoute, async (route) => {
    await gate;
    await route.abort().catch(() => undefined);
  });
  const refresh = page.waitForRequest((request) =>
    request.url().includes("grant_type=refresh_token"),
  );
  await page.goto("/admin");
  await refresh;
  await expect(page.getByText("Checking session")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Could not verify your session" }),
  ).toBeVisible({ timeout: 8_000 });
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toHaveCount(0);
  await page.unroute(tokenRoute);
  release();
  await page.getByRole("button", { name: "Retry" }).click();
  await expect(page.getByRole("heading", { name: "Admin Dashboard" })).toBeVisible({
    timeout: 12_000,
  });
});
