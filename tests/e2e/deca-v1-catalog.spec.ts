import { expect, test } from "@playwright/test";
import { fixture } from "./global-setup";
import { createSessionUser, localService } from "./local-session-fixtures";

test("a published Finance blueprint generates the exact counts and updates without replacing the original", async ({
  page,
}) => {
  const service = localService();
  const account = await createSessionUser("deca-catalog");
  expect(
    (
      await service
        .from("profiles")
        .update({ account_tier: "premium" })
        .eq("user_id", account.id)
    ).error,
  ).toBeNull();
  const { data: blueprint, error } = await service
    .from("blueprint_versions")
    .select("*")
    .eq("blueprint_name", "Finance Cluster Exam - State Test")
    .eq("status", "Active")
    .single();
  expect(error).toBeNull();
  const allocations = (
    blueprint!.distribution as {
      strata: { id: string; tags: string[]; count: number }[];
    }
  ).strata;
  expect(allocations).toHaveLength(12);

  await page.goto("/generate");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await page.getByLabel("Category", { exact: true }).selectOption("Finance");
  await page.getByLabel("Blueprint", { exact: true }).selectOption({
    label: "Finance Cluster Exam - State Test - prd-19.3-v1",
  });
  await page.getByRole("radio", { name: "Blueprint exam" }).check();
  const table = page.getByRole("table", { name: "Blueprint allocations" });
  await expect(table.getByRole("row")).toHaveCount(13);
  await expect(table.getByRole("row", { name: /Financial Analysis 28/ })).toBeVisible();
  await expect(page.getByRole("group", { name: "Topic Tags" })).toHaveCount(0);
  await page.getByRole("button", { name: "Generate Test", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Question pool shortage" }),
  ).toBeVisible();
  await expect(page.getByText(/cannot fill every blueprint allocation/)).toBeVisible();

  expect(
    (
      await service.from("questions").insert(
        allocations.flatMap((row) =>
          Array.from({ length: row.count }, (_, i) => ({
            partition_key: "Finance",
            question_type: "Scenario",
            question_text: `Official catalog fixture ${account.id} ${row.id} ${i}`,
            options: ["First", "Second", "Third", "Fourth"],
            correct_option_id: "A",
            difficulty: i % 2 === 0 ? "Easy" : "Hard",
            tags: row.tags,
          })),
        ),
      )
    ).error,
  ).toBeNull();
  await page.getByRole("button", { name: "Generate Test", exact: true }).click();
  await page.getByRole("link", { name: "View Test ID" }).click();
  const original = new URL(page.url()).searchParams.get("code")!;
  const membership = async (code: string) => {
    const definition = await service
      .from("test_ids")
      .select("definition_id")
      .eq("id", code)
      .single();
    expect(definition.error).toBeNull();
    const { data, error } = await service
      .from("test_definition_questions")
      .select("question_id,position,stratum_id")
      .eq("test_definition_id", definition.data!.definition_id)
      .order("position");
    expect(error).toBeNull();
    return data!;
  };
  const before = await membership(original);
  expect(new Set(before.map((q) => q.question_id)).size).toBe(100);
  for (const row of allocations)
    expect(before.filter((q) => q.stratum_id === row.id)).toHaveLength(row.count);
  expect(
    (
      await service
        .from("questions")
        .update({ question_text: `Edited ${account.id}` })
        .eq("id", before[0].question_id)
    ).error,
  ).toBeNull();
  await page.reload();
  await page.getByRole("button", { name: "Generate Updated Test" }).click();
  await expect(page).not.toHaveURL(new RegExp(`code=${original}$`));
  expect(await membership(original)).toEqual(before);
  const updated = new URL(page.url()).searchParams.get("code")!;
  const after = await membership(updated);
  for (const row of allocations)
    expect(after.filter((q) => q.stratum_id === row.id)).toHaveLength(row.count);
});
