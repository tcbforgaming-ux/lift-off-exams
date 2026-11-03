import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { fixture } from "./global-setup";
import type { Database } from "../../src/lib/supabase/database.types";

function service() {
  if (
    process.env.VITE_SUPABASE_URL !== "http://127.0.0.1:58421" ||
    process.env.E2E_DISPOSABLE_PROJECT !== "liftoff-stabilization-disposable"
  )
    throw new Error("Disposable local backend required");
  return createClient<Database>(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("real reports and audit records remain reachable beyond server page limits", async ({
  page,
}) => {
  const api = service();
  // Remove only this synthetic fixture family so repeated local runs have stable page sizes.
  const oldReports = await api
    .from("question_reports")
    .delete()
    .like("description", "Synthetic pagination concern number %");
  expect(oldReports.error).toBeNull();
  const auditAction = `reconstruction.pagination.${crypto.randomUUID()}`;
  const email = `pagination-${crypto.randomUUID()}@example.test`;
  const user = await api.auth.admin.createUser({
    email,
    password: fixture.password,
    email_confirm: true,
  });
  expect(user.error).toBeNull();
  const reporter = user.data.user!.id;
  const reports = await api.from("question_reports").insert(
    Array.from({ length: 101 }, (_, i) => ({
      entity_type: "question",
      question_id: fixture.questionIds[0],
      test_id: fixture.testId,
      reporter_id: reporter,
      category: "other",
      reason: "other",
      status: "open",
      description: `Synthetic pagination concern number ${i}`,
      idempotency_key: crypto.randomUUID(),
    })),
  );
  expect(reports.error).toBeNull();
  const logs = await api.from("admin_audit_logs").insert(
    Array.from({ length: 101 }, (_, i) => ({
      action: auditAction,
      resource_type: "question",
      resource_id: fixture.questionIds[0],
      reason: `Synthetic audit page fixture ${i}`,
    })),
  );
  expect(logs.error).toBeNull();
  await login(page, email);
  await page.goto("/reports");
  await expect(page.locator(".report-card")).toHaveCount(50);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
  await expect(page.locator(".report-card")).toHaveCount(50);
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator(".report-card")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Log Out" }).click();
  await login(page, fixture.adminEmail);
  await page.goto("/admin/reports?category=other");
  await expect(page.getByRole("row")).toHaveCount(101);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("row")).toHaveCount(2);
  await page.getByRole("combobox", { name: /^Status/ }).selectOption("resolved");
  await expect(page.getByText("Page 1", { exact: true })).toBeVisible();
  await page.goto("/admin/audit");
  await page.getByLabel("Action", { exact: true }).fill(auditAction);
  await expect(page.locator(".report-card")).toHaveCount(100);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator(".report-card")).toHaveCount(1);
  await page.getByLabel("Resource type", { exact: true }).fill("question");
  await expect(page.getByText("Page 1", { exact: true })).toBeVisible();
  await expect(page.locator(".report-card")).toHaveCount(100);
});

test("native report dialog traps focus, restores its trigger and safely retries a committed response", async ({
  page,
}) => {
  await login(page, fixture.otherEmail);
  await page.goto(`/test-id?code=${fixture.testId}`);
  await page.getByRole("button", { name: /^(Start Test|Continue)$/ }).click();
  const trigger = page.getByRole("button", { name: "Report Question" });
  await trigger.click();
  let dialog = page.getByRole("dialog", { name: "Report question" });
  await expect(dialog.getByLabel("Problem type")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Submit Report" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(dialog.getByLabel("Problem type")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  dialog = page.getByRole("dialog", { name: "Report question" });
  await page.screenshot({ path: "test-results/report-dialog-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileDialog = await dialog.boundingBox();
  expect(mobileDialog).not.toBeNull();
  expect(mobileDialog!.x).toBeGreaterThanOrEqual(0);
  expect(mobileDialog!.x + mobileDialog!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: "test-results/report-dialog-mobile.png" });
  await dialog
    .getByLabel("What is wrong?")
    .fill("Synthetic response-loss persistence check.");
  let key = "";
  await page.route(
    "**/rest/v1/rpc/submit_question_report",
    async (route) => {
      key = (route.request().postDataJSON() as { p_idempotency_key: string })
        .p_idempotency_key;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Synthetic pre-commit failure" }),
      });
    },
    { times: 1 },
  );
  await dialog.getByRole("button", { name: "Submit Report" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByLabel("What is wrong?")).toHaveValue(
    "Synthetic response-loss persistence check.",
  );
  await page.route(
    "**/rest/v1/rpc/submit_question_report",
    async (route) => {
      const body = route.request().postDataJSON() as { p_idempotency_key: string };
      expect(body.p_idempotency_key).toBe(key);
      const committed = await route.fetch();
      expect(committed.ok()).toBe(true);
      await route.abort("failed");
    },
    { times: 1 },
  );
  await dialog.getByRole("button", { name: "Submit Report" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await expect(dialog.getByLabel("What is wrong?")).toHaveValue(
    "Synthetic response-loss persistence check.",
  );
  await dialog.getByRole("button", { name: "Submit Report" }).click();
  await expect(dialog.getByText(/Report submitted/)).toBeVisible();
  const persisted = await service()
    .from("question_reports")
    .select("id", { count: "exact", head: true })
    .eq("idempotency_key", key);
  expect(persisted.error).toBeNull();
  expect(persisted.count).toBe(1);
});
