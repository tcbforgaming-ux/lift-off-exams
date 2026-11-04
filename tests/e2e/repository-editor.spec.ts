import { expect, test } from "@playwright/test";
import { fixture } from "./global-setup";
import { localService } from "./local-session-fixtures";

test("repository editor preserves filters and recovers from a stale edit", async ({
  page,
}) => {
  const api = localService();
  const id = crypto.randomUUID();
  const text = `Synthetic repository editor ${id}`;
  const seed = await api.from("questions").insert({
    id,
    question_text: text,
    partition_key: "Finance",
    performance_indicator: "FI:001",
    question_type: "Scenario",
    difficulty: "Easy",
    tags: ["Financial Analysis"],
    options: ["First", "Second", "Third", "Fourth"],
    correct_option_id: "A",
    explanation: "The first answer is correct.",
    lifecycle_state: "Active",
  });
  expect(seed.error).toBeNull();
  await page.goto("/login");
  await page.getByLabel("Email").fill(fixture.adminEmail);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const repository = `/admin/questions?q=${id}&partition=Finance`;
  await page.goto(repository);
  await page.getByRole("button", { name: "Open Question" }).click();
  await expect(page.getByRole("heading", { name: "Question Detail" })).toBeFocused();
  const field = page.getByRole("textbox", { name: "Question", exact: true });
  await expect(field).toHaveValue(text);
  await page.getByRole("textbox", { name: "Indicator" }).fill(" ");
  await page
    .getByRole("textbox", { name: "Edit reason" })
    .fill("Review the synthetic item");
  await page.getByRole("button", { name: "Save Question" }).click();
  await expect(page.getByRole("alert")).toContainText("content length");
  await page.getByRole("textbox", { name: "Indicator" }).fill("FI:001");
  expect(
    (
      await api
        .from("questions")
        .update({ question_text: `${text} changed elsewhere` })
        .eq("id", id)
    ).error,
  ).toBeNull();
  await field.fill(`${text} stale draft`);
  await page.getByRole("button", { name: "Save Question" }).click();
  await expect(page.getByRole("alert")).toContainText("Question changed");
  await expect(field).toHaveValue(`${text} stale draft`);
  await page.getByRole("button", { name: "Reload Question" }).click();
  await expect(field).toHaveValue(`${text} changed elsewhere`);
  await field.fill(`${text} saved edit`);
  await page.getByRole("button", { name: "Save Question" }).click();
  await expect(page.getByRole("status")).toContainText("Question saved.");
  const revision = await api
    .from("question_versions")
    .select("report_id,snapshot")
    .eq("question_id", id)
    .single();
  expect(revision.error).toBeNull();
  expect(revision.data?.report_id).toBeNull();
  expect(revision.data?.snapshot).toMatchObject({
    question_text: `${text} saved edit`,
  });
  await page.getByRole("button", { name: "Back to Questions" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/admin/questions\\?q=${id}&partition=Finance$`),
  );
  await page.getByRole("button", { name: "Log Out" }).click();
  await page.goto("/login");
  await page.getByLabel("Email").fill(fixture.email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(`/admin/questions?question=${id}`);
  await expect(page).toHaveURL(/\/unauthorized$/);
});
