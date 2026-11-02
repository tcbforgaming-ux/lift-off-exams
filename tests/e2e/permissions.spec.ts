import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import type { Database } from "../../src/lib/supabase/database.types";
import { fixture } from "./global-setup";

function client(service = false) {
  const url = process.env.VITE_SUPABASE_URL;
  if (
    url !== "http://127.0.0.1:58421" ||
    process.env.E2E_DISPOSABLE_PROJECT !== "liftoff-stabilization-disposable"
  ) {
    throw new Error("Disposable local backend required.");
  }
  return createClient<Database>(
    url,
    (service
      ? process.env.SUPABASE_SERVICE_ROLE_KEY
      : process.env.VITE_SUPABASE_ANON_KEY)!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

for (const [role, email] of [
  ["student", fixture.email],
  ["admin", fixture.adminEmail],
  ["owner", fixture.ownerEmail],
]) {
  test(`${role} can save and reload only its own basic profile`, async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(fixture.password);
    await page.getByRole("button", { name: "Log In" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/profile");
    const name = `Verified ${role}`;
    await page.getByLabel("Display name").fill(name);
    await page.getByLabel("Phone", { exact: true }).fill("555-0199");
    await page.getByRole("button", { name: "Save Profile" }).click();
    await expect(page.getByText("Profile updated.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Display name")).toHaveValue(name);
    await expect(page.getByLabel("Phone", { exact: true })).toHaveValue("555-0199");

    const api = client();
    const { data, error } = await api.auth.signInWithPassword({
      email,
      password: fixture.password,
    });
    expect(error).toBeNull();
    const id = data.user!.id;
    for (const update of [
      { role: "owner" },
      { account_tier: "premium" },
      { owner_state: "unavailable" },
    ]) {
      expect(
        (await api.from("profiles").update(update).eq("user_id", id)).error,
      ).not.toBeNull();
    }
    const other = await client(true)
      .from("profiles")
      .select("user_id")
      .neq("user_id", id)
      .limit(1)
      .single();
    expect(other.error).toBeNull();
    const cross = await api
      .from("profiles")
      .update({ display_name: "forged" })
      .eq("user_id", other.data!.user_id)
      .select("user_id");
    expect(cross.error).toBeNull();
    expect(cross.data).toEqual([]);
    expect((await api.rpc("mark_inactive_owners", {})).error).not.toBeNull();
    expect(
      (
        await api.rpc("bootstrap_initial_owner", {
          p_target_user_id: id,
          p_reason: "forged",
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await api
          .from("admin_audit_logs")
          .insert({ action: "forged", resource_type: "profile" })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await api.rpc("write_test_session_audit", {
          p_action: "forged",
          p_session_id: id,
          p_test_id: "fake",
          p_previous_state: "",
          p_new_state: "",
        })
      ).error,
    ).not.toBeNull();
    await api.auth.signOut();
  });
}

test("real zero-row profile update does not show success or lose input", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(fixture.otherEmail);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/profile");
  await expect(page.getByLabel("Display name")).toBeVisible();
  const server = client(true);
  const users = await server.auth.admin.listUsers();
  const id = users.data.users.find((user) => user.email === fixture.otherEmail)!.id;
  const original = await server.from("profiles").select("*").eq("user_id", id).single();
  expect(original.error).toBeNull();
  try {
    expect((await server.from("profiles").delete().eq("user_id", id)).error).toBeNull();
    await page.getByLabel("Display name").fill("Preserved after zero rows");
    await page.getByRole("button", { name: "Save Profile" }).click();
    await expect(page.getByRole("alert")).toContainText("could not update");
    await expect(page.getByLabel("Display name")).toHaveValue(
      "Preserved after zero rows",
    );
    await expect(page.getByText("Profile updated.")).toHaveCount(0);
  } finally {
    expect((await server.from("profiles").insert(original.data!)).error).toBeNull();
  }
});

test("anonymous direct API cannot call maintenance", async () => {
  const api = client();
  expect(
    (await api.rpc("build_deca_batch_jsonl", { limit_count: 1 })).error,
  ).not.toBeNull();
  expect((await api.rpc("mark_inactive_owners", {})).error).not.toBeNull();
});

test("cross-user reports and trusted lifecycle audits remain isolated", async () => {
  const user = client();
  const other = client();
  expect(
    (
      await user.auth.signInWithPassword({
        email: fixture.otherEmail,
        password: fixture.password,
      })
    ).error,
  ).toBeNull();
  expect(
    (
      await other.auth.signInWithPassword({
        email: fixture.email,
        password: fixture.password,
      })
    ).error,
  ).toBeNull();
  const started = await user.rpc("start_test_session", {
    p_test_id: fixture.testId,
    p_idempotency_key: crypto.randomUUID(),
  });
  expect(started.error).toBeNull();
  const session = started.data![0];
  const submitted = await user.rpc("submit_question_report", {
    p_session_id: session.session_id,
    p_question_id: fixture.questionIds[0],
    p_category: "unclear_wording",
    p_description: "Synthetic cross-user isolation fixture",
    p_idempotency_key: crypto.randomUUID(),
  });
  expect(submitted.error).toBeNull();
  const report = submitted.data![0];
  const otherReports = await other.rpc("get_own_question_reports", {});
  expect(otherReports.error).toBeNull();
  expect(otherReports.data?.some((row) => row.report_id === report.report_id)).toBe(
    false,
  );
  expect(
    (await other.rpc("get_question_report_detail", { p_report_id: report.report_id }))
      .error,
  ).not.toBeNull();
  expect(
    (await other.rpc("get_test_session", { p_session_id: session.session_id })).error,
  ).not.toBeNull();
  const result = await user.rpc("submit_test_session", {
    p_session_id: session.session_id,
    p_expected_session_version: session.session_version,
  });
  expect(result.error).toBeNull();
  expect(
    (await other.rpc("get_test_result", { p_session_id: session.session_id })).error,
  ).not.toBeNull();
  expect(
    (
      await user.rpc("get_test_result_explanations", {
        p_session_id: session.session_id,
      })
    ).error,
  ).not.toBeNull();
  const identity = await user.auth.getUser();
  const audits = await client(true)
    .from("admin_audit_logs")
    .select("actor_user_id,action")
    .eq("resource_id", session.session_id);
  expect(audits.error).toBeNull();
  expect(audits.data?.length).toBeGreaterThan(1);
  expect(
    audits.data?.every((row) => row.actor_user_id === identity.data.user!.id),
  ).toBe(true);
  await user.auth.signOut();
  await other.auth.signOut();
});
