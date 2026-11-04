import { expect, test } from "@playwright/test";
import { fixture } from "./global-setup";
import { localService } from "./local-session-fixtures";

test("staff can paginate, revise, approve and publish a generated candidate", async ({
  page,
}) => {
  const api = localService();
  const marker = crypto.randomUUID();
  const created = new Date().toISOString();
  const inserted = await api.from("generated_question_candidates").insert(
    Array.from({ length: 27 }, (_, index) => ({
      source_custom_id: marker,
      category: "Financial Analysis",
      partition_keys: ["Finance"],
      performance_indicator: "FI:001",
      question_type: "Fill In The Blank",
      question_text: `Synthetic review question ${marker} ${index}?`,
      options: ["First", "Second", "Third", "Fourth"],
      correct_option_id: "A",
      explanation: "The first answer is correct.",
      difficulty: "Easy",
      tags: ["Financial Analysis"],
      created_at: created,
    })),
  );
  expect(inserted.error).toBeNull();
  await page.goto("/login");
  await page.getByLabel("Email").fill(fixture.adminEmail);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/admin/candidates");
  await page.getByLabel("Search candidates").fill(marker);
  await expect(page.getByRole("button", { name: "Review", exact: true })).toHaveCount(
    25,
  );
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("button", { name: "Review", exact: true })).toHaveCount(
    2,
  );
  await page.getByRole("button", { name: "Review", exact: true }).first().click();
  await page.getByLabel("Reason").fill("The wording should be clearer.");
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await expect(page.getByText(/Rejected \/ Unchecked/)).toBeVisible();
  const revised = `Revised candidate question ${marker}?`;
  await page.getByRole("textbox", { name: "Question", exact: true }).fill(revised);
  await page.getByLabel("Reason").fill("Clarified the question wording.");
  await page.getByRole("button", { name: "Save Edit" }).click();
  await expect(page.getByText(/Pending Review \/ Valid/)).toBeVisible();
  await page.getByLabel("Reason").fill("The revised content is valid.");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByText(/Approved \/ Valid/)).toBeVisible();
  await page.getByLabel("Reason").fill("Publish the reviewed question.");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText(/Published \/ Valid/)).toBeVisible();
  const question = await api
    .from("questions")
    .select("question_text,lifecycle_state")
    .eq("question_text", revised)
    .single();
  expect(question.error).toBeNull();
  expect(question.data?.lifecycle_state).toBe("Active");
  await page.getByRole("button", { name: "Back to Candidates" }).click();
  await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Search candidates")).toHaveValue(marker);
});
