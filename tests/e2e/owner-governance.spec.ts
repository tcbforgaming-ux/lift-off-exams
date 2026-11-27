import { expect, test, type Page } from "@playwright/test";
import { fixture } from "./global-setup";
import { localService } from "./local-session-fixtures";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test("sole owner can approve and execute a persisted administrator proposal", async ({
  page,
}) => {
  const api = localService();
  const email = `governance-${crypto.randomUUID()}@example.test`;
  const target = await api.auth.admin.createUser({
    email,
    password: fixture.password,
    email_confirm: true,
  });
  expect(target.error).toBeNull();
  const targetId = target.data.user?.id ?? "";
  await login(page, fixture.ownerEmail);
  await page.getByRole("link", { name: "Admin Dashboard" }).click();
  await page.getByRole("link", { name: "Owner Governance" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const account = page.getByLabel("Target account ID");
  await account.fill(targetId);
  await account.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Reason")).toBeFocused();
  const reason = `Synthetic approval for ${email}`;
  await page.getByLabel("Reason").fill(reason);
  await page.getByRole("button", { name: "Open Proposal" }).click();
  await expect(page.getByText("Proposal opened.")).toBeVisible();
  const proposal = page.getByRole("listitem").filter({ hasText: reason });
  await expect(proposal.getByRole("button", { name: "Execute" })).toBeDisabled();
  await proposal.getByRole("button", { name: "Approve" }).click();
  await expect(proposal.getByText(/1\/1 eligible approvals/)).toBeVisible();
  expect(
    await page.locator("main").evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await proposal.getByRole("button", { name: "Execute" }).click();
  await expect(page.getByText("Proposal executed.")).toBeVisible();
  const profile = await api
    .from("profiles")
    .select("role")
    .eq("user_id", targetId)
    .single();
  expect(profile.data?.role).toBe("admin");
  await page.getByRole("button", { name: "Log Out" }).click();
  await login(page, fixture.adminEmail);
  await page.goto("/admin/governance");
  await expect(page).toHaveURL(/\/unauthorized$/);
});

test("owner invitation survives login and can only be accepted once", async ({
  page,
}) => {
  const api = localService();
  const email = `owner-invitation-${crypto.randomUUID()}@example.test`;
  const recipient = await api.auth.admin.createUser({
    email,
    password: fixture.password,
    email_confirm: true,
  });
  expect(recipient.error).toBeNull();
  await login(page, fixture.ownerEmail);
  await page.goto("/admin/governance");
  await page.getByLabel("Action").selectOption("owner_invite");
  await page.getByLabel("Recipient email").fill(email);
  await page.getByLabel("Reason").fill("Synthetic owner invitation");
  await page.getByRole("button", { name: "Open Proposal" }).click();
  const proposal = page.getByRole("listitem").filter({ hasText: email });
  await proposal.getByRole("button", { name: "Approve" }).click();
  await proposal.getByRole("button", { name: "Execute" }).click();
  const link = await page.getByLabel("Owner invitation link").inputValue();
  await page.getByRole("button", { name: "Log Out" }).click();
  await page.goto(link);
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await page.getByRole("button", { name: "Accept Invitation" }).click();
  await expect(page.getByText("Owner invitation accepted.")).toBeVisible();
  const persisted = await api
    .from("profiles")
    .select("role")
    .eq("user_id", recipient.data.user?.id ?? "")
    .single();
  expect(persisted.data?.role).toBe("owner");
  await page.goto(link);
  await page.getByRole("button", { name: "Accept Invitation" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Invalid or expired owner invitation.",
  );
});

test("password reauthentication can suspend and restore owner access", async ({
  page,
}) => {
  const api = localService();
  const backup = await api.auth.admin.createUser({
    email: `backup-owner-${crypto.randomUUID()}@example.test`,
    password: fixture.password,
    email_confirm: true,
  });
  expect(backup.error).toBeNull();
  expect(
    (
      await api
        .from("profiles")
        .update({ role: "owner" })
        .eq("user_id", backup.data.user?.id ?? "")
    ).error,
  ).toBeNull();
  await login(page, fixture.ownerEmail);
  await page.goto("/owner-access");
  await page.getByLabel("Current password").fill(fixture.password);
  await page.getByRole("button", { name: "Suspend Owner Privileges" }).click();
  await expect(page.getByText("State: self suspended")).toBeVisible();
  await page.getByLabel("Current password").fill(fixture.password);
  await page.getByRole("button", { name: "Restore Owner Privileges" }).click();
  await expect(page.getByText("State: active")).toBeVisible();
});
