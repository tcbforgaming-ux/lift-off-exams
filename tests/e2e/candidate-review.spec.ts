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
  await expect(page.getByRole("heading", { name: "Candidate Detail" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Back to Candidates" })).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("textbox", { name: "Question", exact: true }),
  ).toBeVisible();
  expect(
    await page.locator("main").evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
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
  await page.route(
    "**/rest/v1/rpc/publish_review_candidate",
    async (route) => {
      const [first, second] = await Promise.all([route.fetch(), route.fetch()]);
      expect(first.ok()).toBe(true);
      expect(second.ok()).toBe(true);
      expect(await first.text()).toBe(await second.text());
      await route.fulfill({ response: first });
    },
    { times: 1 },
  );
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByText(/Published \/ Valid/)).toBeVisible();
  const question = await api
    .from("questions")
    .select("question_text,lifecycle_state")
    .eq("question_text", revised)
    .single();
  expect(question.error).toBeNull();
  expect(question.data?.lifecycle_state).toBe("Active");
  const audit = await api
    .from("admin_audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("action", "candidate.publish")
    .eq("reason", "Publish the reviewed question.")
    .contains("metadata", {
      question_id:
        (await api.from("questions").select("id").eq("question_text", revised).single())
          .data?.id ?? "",
    });
  expect(audit.error).toBeNull();
  expect(audit.count).toBe(1);
  await page.getByRole("button", { name: "Back to Candidates" }).click();
  await expect(page.getByText("Page 2", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Search candidates")).toHaveValue(marker);
  await expect(
    page.getByRole("button", { name: "Review", exact: true }).first(),
  ).toBeFocused();
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let arrived!: () => void;
  const oldRequest = new Promise<void>((resolve) => {
    arrived = resolve;
  });
  await page.route("**/rest/v1/rpc/list_review_candidates", async (route) => {
    const body = route.request().postDataJSON() as { p_status: string | null };
    if (body.p_status !== "Published") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    arrived();
    await held;
    await route.fulfill({ response });
  });
  await page.getByRole("combobox", { name: "Review status" }).selectOption("Published");
  await oldRequest;
  await page.getByRole("combobox", { name: "Review status" }).selectOption("Rejected");
  await expect(page.getByText("Page 1", { exact: true })).toBeVisible();
  await expect(page.getByText("No matching candidates.")).toBeVisible();
  const oldResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/list_review_candidates") &&
      (response.request().postDataJSON() as { p_status: string }).p_status ===
        "Published",
  );
  release();
  await oldResponse;
  await expect(page.getByText("No matching candidates.")).toBeVisible();
});
