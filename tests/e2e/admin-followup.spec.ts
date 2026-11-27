import { expect, test } from "@playwright/test";
import { fixture } from "./global-setup";
import { localService, createSessionUser } from "./local-session-fixtures";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
test("report disposition and priority settings use the real queue", async ({
  page,
}) => {
  const service = localService();
  const user = await createSessionUser("report-action");
  const marker = crypto.randomUUID();
  const report = await service
    .from("question_reports")
    .insert({
      entity_type: "question",
      question_id: fixture.questionIds[0],
      test_id: fixture.testId,
      reporter_id: user.id,
      category: "unclear_wording",
      reason: "other",
      status: "open",
      description: `Synthetic new disposition ${marker}`,
      idempotency_key: crypto.randomUUID(),
    })
    .select("id")
    .single();
  expect(report.error).toBeNull();
  await page.goto("/admin/reports");
  await page.getByLabel("Email").fill(fixture.adminEmail);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await page.getByLabel("High-priority report threshold").fill("1");
  await page
    .getByLabel("Priority change reason")
    .fill("Synthetic threshold validation");
  await page.getByRole("button", { name: "Save Priority" }).click();
  await expect(page.getByText("High Priority", { exact: true }).first()).toBeVisible();
  await page.goto(`/admin/reports/${report.data!.id}`);
  await page.getByLabel("Internal reason").fill("Verified correction queue concern");
  await page.getByLabel("Message to reporter").fill("We are reviewing your question.");
  await page.route(
    "**/rest/v1/rpc/act_on_question_report",
    async (route) => {
      const [first, second] = await Promise.all([route.fetch(), route.fetch()]);
      expect(first.ok()).toBe(true);
      expect(second.ok()).toBe(true);
      expect(await first.text()).toBe(await second.text());
      await route.abort();
    },
    { times: 1 },
  );
  await page.getByRole("button", { name: "Valid", exact: true }).click();
  await expect(page.getByText(/Failed to fetch|NetworkError/i)).toBeVisible();
  await page.getByRole("button", { name: "Valid", exact: true }).click();
  await expect(page.getByText("Report disposition saved.")).toBeVisible();
  expect(
    (
      await service
        .from("question_reports")
        .select("moderation_disposition,status")
        .eq("id", report.data!.id)
        .single()
    ).data,
  ).toEqual({ moderation_disposition: "valid", status: "in_review" });
  await page.getByLabel("Internal reason").fill("The issue has been corrected");
  await page.getByLabel("Message to reporter").fill("Thank you for your report.");
  await page.getByRole("button", { name: "Fixed", exact: true }).click();
  await expect(page.getByText("Report disposition saved.")).toBeVisible();
  expect(
    (
      await service
        .from("question_reports")
        .select("status")
        .eq("id", report.data!.id)
        .single()
    ).data?.status,
  ).toBe("resolved");
});
test("staff can retire and restore a tag while its question reference stays intact", async ({
  page,
}) => {
  const service = localService();
  const tag = `Referenced ${crypto.randomUUID()}`;
  const q = await service
    .from("questions")
    .insert({
      partition_key: "Finance",
      question_type: "Scenario",
      question_text: `Retirement browser ${tag}`,
      options: ["A", "B", "C", "D"],
      correct_option_id: "A",
      difficulty: "Easy",
      tags: [tag],
    })
    .select("id")
    .single();
  expect(q.error).toBeNull();
  const blueprint = await service
    .from("blueprint_versions")
    .insert({
      blueprint_name: `Retirement ${tag}`,
      cluster: "Finance",
      category: "Finance",
      level: "State",
      version: "1",
      total_questions: 1,
      distribution: {
        schema_version: 1,
        strata: [{ id: "one", count: 1, tags: [tag] }],
      },
      change_reason: "Referenced-tag fixture",
    })
    .select("id")
    .single();
  expect(blueprint.error).toBeNull();
  const actor = createClient<Database>(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  expect(
    (
      await actor.auth.signInWithPassword({
        email: fixture.adminEmail,
        password: fixture.password,
      })
    ).error,
  ).toBeNull();
  const generated = await actor.rpc("generate_test_from_blueprint", {
    p_blueprint_id: blueprint.data!.id,
    p_expected_blueprint_version: "1",
    p_requested_count: 1,
    p_seed: tag,
    p_idempotency_key: crypto.randomUUID(),
  });
  expect(generated.error).toBeNull();
  const code = generated.data![0].test_id;
  const started = await actor.rpc("start_test_session", {
    p_test_id: code,
    p_idempotency_key: crypto.randomUUID(),
  });
  expect(started.error).toBeNull();
  const session = started.data![0].session_id;
  expect(
    (
      await actor.rpc("submit_test_session", {
        p_session_id: session,
        p_expected_session_version: 1,
      })
    ).error,
  ).toBeNull();
  const before = await actor.rpc("get_test_result", { p_session_id: session });
  expect(before.error).toBeNull();
  await page.goto("/admin/catalog");
  await page.getByLabel("Email").fill(fixture.adminEmail);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await page.getByLabel("Search tags").fill(tag);
  await page.getByRole("button", { name: tag, exact: true }).click();
  await page
    .getByLabel("Tag change reason")
    .fill("Retire the referenced fixture label");
  await page.getByRole("button", { name: "Retire Tag" }).click();
  await expect(
    page.getByText("Tag retired. Existing references are unchanged."),
  ).toBeVisible();
  expect(
    (
      await service
        .from("questions")
        .select("tags,lifecycle_state")
        .eq("id", q.data!.id)
        .single()
    ).data,
  ).toEqual({ tags: [tag], lifecycle_state: "Active" });
  expect(
    (await actor.rpc("get_selectable_topic_tags", { p_labels: [tag] })).data,
  ).toEqual([]);
  expect((await actor.rpc("get_test_result", { p_session_id: session })).data).toEqual(
    before.data,
  );
  expect(
    (
      await service
        .from("test_definition_questions")
        .select("question_id")
        .eq("test_definition_id", generated.data![0].test_definition_id)
    ).data,
  ).toEqual([{ question_id: q.data!.id }]);
  await page
    .getByLabel("Tag change reason")
    .fill("Restore the referenced fixture label");
  await page.getByRole("button", { name: "Restore Tag" }).click();
  await expect(page.getByText("Tag restored.", { exact: true })).toBeVisible();
});
