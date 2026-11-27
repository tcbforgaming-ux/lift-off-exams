import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { fixture } from "./global-setup";
import { createSessionUser, localService } from "./local-session-fixtures";
test("a signed-in student loses activity access, appeals, and resumes after staff approval", async ({
  page,
  browser,
}) => {
  const student = await createSessionUser("suspension");
  const user = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  expect(
    (
      await user.auth.signInWithPassword({
        email: student.email,
        password: fixture.password,
      })
    ).error,
  ).toBeNull();
  await page.goto("/login");
  await page.getByLabel("Email").fill(student.email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const staffContext = await browser.newContext();
  const staff = await staffContext.newPage();
  try {
    await staff.goto("/admin/moderation");
    await staff.getByLabel("Email").fill(fixture.adminEmail);
    await staff.getByLabel("Password", { exact: true }).fill(fixture.password);
    await staff.getByRole("button", { name: "Log In" }).click();
    await staff.getByLabel("Student User ID").fill(student.id);
    await staff
      .getByLabel("Moderation reason")
      .fill("Synthetic suspension for verification.");
    await staff.route(
      "**/rest/v1/rpc/moderate_student",
      async (route) => {
        const [first, second] = await Promise.all([route.fetch(), route.fetch()]);
        expect(first.ok()).toBe(true);
        expect(second.ok()).toBe(true);
        expect(await first.text()).toBe(await second.text());
        await route.fulfill({ response: first });
      },
      { times: 1 },
    );
    await staff.getByRole("button", { name: "Suspend Student" }).click();
    await expect(
      staff.getByText("Synthetic suspension for verification.", { exact: true }),
    ).toBeVisible();
    const denied = await user.rpc("start_quiz", { p_request: crypto.randomUUID() });
    expect(denied.error?.details).toBe("account_suspension_only");
    expect((await user.from("test_results").select("session_id")).error?.details).toBe(
      "account_suspension_only",
    );
    await page.goto("/history");
    await expect(page).toHaveURL(/\/account\/suspension$/);
    await page
      .getByLabel("Appeal and supporting information")
      .fill("Please review my account.");
    await page.getByRole("button", { name: "Submit Appeal" }).click();
    await expect(page.getByText("Awaiting staff review")).toBeVisible();
    await staff.reload();
    await staff.getByLabel("Moderation reason").fill("Appeal reviewed and approved.");
    await staff.getByRole("button", { name: "Approve Appeal" }).click();
    await expect(staff.getByText("Ended", { exact: false })).toBeVisible();
    await page.reload();
    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "Test History" })).toBeVisible();
    const status = await localService()
      .from("profiles")
      .select("suspended_until")
      .eq("user_id", student.id)
      .single();
    expect(status.data?.suspended_until).toBeNull();
  } finally {
    await staffContext.close();
  }
});
