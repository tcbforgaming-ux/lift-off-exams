import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { fixture } from "./global-setup";
import { createSessionUser, localService } from "./local-session-fixtures";

test("name rules reject signup and rename without saving the disallowed name", async ({
  page,
}) => {
  const service = localService();
  const student = await createSessionUser("name-policy");
  const marker = `blorn${crypto.randomUUID().slice(0, 8)}`;
  const banned = `Test ${marker.toUpperCase()}!`;
  const email = `name-policy-${marker}@example.test`;
  const profile = await service
    .from("profiles")
    .select("display_name")
    .eq("user_id", student.id)
    .single();
  expect(profile.error).toBeNull();

  await page.goto("/admin/name-rules");
  await page.getByLabel("Email").fill(fixture.adminEmail);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await page.getByLabel("Word or phrase").fill(marker);
  await page
    .getByLabel("Moderation reason")
    .fill("Verify new account and rename enforcement.");
  await page.getByRole("button", { name: "Activate rule" }).click();
  await expect(page.getByText("Rule activated.")).toBeVisible();
  await expect(
    page.getByRole("row", { name: new RegExp(marker) }).getByText("Active"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Log Out" }).click();

  await page.goto("/signup");
  await page.getByLabel("Display name").fill(banned);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByLabel("Confirm password", { exact: false }).fill(fixture.password);
  await page.getByRole("button", { name: "Sign Up", exact: true }).click();
  await expect(
    page.getByText("Choose a display name without a restricted word or phrase."),
  ).toBeVisible();

  const anon = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const untrusted = await anon.auth.signUp({
    email,
    password: fixture.password,
    options: { data: { display_name: banned } },
  });
  expect(untrusted.error).not.toBeNull();
  expect(untrusted.data.user).toBeNull();
  const users = await service.auth.admin.listUsers({ perPage: 200 });
  expect(users.error).toBeNull();
  expect(users.data.users.some((user) => user.email === email)).toBe(false);

  await page.goto("/profile");
  await page.getByLabel("Email").fill(student.email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await page.getByLabel("Display name").fill(banned);
  await page.getByRole("button", { name: "Save Profile" }).click();
  await expect(page.getByRole("alert")).toHaveText(
    "Choose a display name without a restricted word or phrase.",
  );
  await page.reload();
  await expect(page.getByLabel("Display name")).toHaveValue(
    profile.data!.display_name ?? "",
  );
  await page.goto("/admin/name-rules");
  await expect(page).toHaveURL(/\/unauthorized$/);
});
