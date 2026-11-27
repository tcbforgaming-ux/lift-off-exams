import { expect, test } from "@playwright/test";
import { fixture } from "./global-setup";
import { localService } from "./local-session-fixtures";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";

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
