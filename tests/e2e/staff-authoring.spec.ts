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

test("manual authoring retains a durable retry after concurrent commits and a lost response", async ({
  page,
}) => {
  const text = `Synthetic manual question ${crypto.randomUUID()}?`;
  await login(page, fixture.adminEmail);
  await page.goto("/admin/questions");
  await page.getByRole("link", { name: "Author or Import Questions" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const question = page.getByRole("textbox", { name: "Question", exact: true });
  await question.focus();
  await page.keyboard.type(text);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("textbox", { name: "Option A" })).toBeFocused();
  for (const letter of ["A", "B", "C", "D"])
    await page
      .getByRole("textbox", { name: `Option ${letter}` })
      .fill(`Choice ${letter}`);
  await page
    .getByRole("textbox", { name: "Explanation" })
    .fill("The first choice is correct.");
  await page.getByRole("textbox", { name: "Indicator" }).fill("FI:001");
  await page
    .getByRole("textbox", { name: "Tags (comma-separated)" })
    .fill("Financial Analysis");
  await page
    .getByRole("textbox", { name: "Reason" })
    .fill("Synthetic manual authoring test");
  expect(
    await page.locator("main").evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBe(true);
  await page.getByRole("button", { name: "Preview Question" }).click();
  await expect(page.getByRole("status")).toContainText("1 ready; nothing saved yet.");
  await page.route(
    "**/rest/v1/rpc/commit_staff_questions",
    async (route) => {
      const [first, second] = await Promise.all([route.fetch(), route.fetch()]);
      expect(first.ok()).toBe(true);
      expect(second.ok()).toBe(true);
      expect(await first.text()).toBe(await second.text());
      await route.abort();
    },
    { times: 1 },
  );
  await page.getByRole("button", { name: "Create Pending Candidate" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(question).toHaveValue(text);
  await page.getByRole("button", { name: "Create Pending Candidate" }).click();
  await expect(page.getByRole("status")).toContainText(
    "1 pending review, 0 published.",
  );
  const api = localService();
  const candidates = await api
    .from("generated_question_candidates")
    .select("id,review_status,staff_import_id")
    .eq("question_text", text);
  expect(candidates.error).toBeNull();
  expect(candidates.data).toHaveLength(1);
  expect(candidates.data?.[0]?.review_status).toBe("Pending Review");
  const audit = await api
    .from("admin_audit_logs")
    .select("id", { count: "exact", head: true })
    .eq("resource_id", candidates.data?.[0]?.staff_import_id ?? "")
    .eq("action", "question.staff_import");
  expect(audit.error).toBeNull();
  expect(audit.count).toBe(1);
  expect(
    (await api.from("questions").select("id").eq("question_text", text)).data,
  ).toEqual([]);
});

test("JSON import rejects bad files and reports valid, invalid and duplicate rows accurately", async ({
  page,
}) => {
  await login(page, fixture.adminEmail);
  await page.goto("/admin/questions/author");
  await page.getByRole("button", { name: "JSON Import" }).click();
  const upload = page.getByLabel("JSON file");
  const preview = page.getByRole("button", { name: "Preview Import" });
  await page
    .getByRole("textbox", { name: "Reason" })
    .fill("Synthetic JSON upload test");
  await upload.setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("["),
  });
  await preview.click();
  await expect(page.getByRole("alert")).toContainText("valid JSON");
  await upload.setInputFiles({
    name: "large.json",
    mimeType: "application/json",
    buffer: Buffer.alloc(262145),
  });
  await preview.click();
  await expect(page.getByRole("alert")).toContainText("256 KiB");
  const row = {
    partitionKey: "Finance",
    questionText: `Synthetic bulk question ${crypto.randomUUID()}?`,
    options: ["A", "B", "C", "D"].map((id) => ({ id, text: `Choice ${id}` })),
    correctOptionId: "A",
    explanation: "The first choice is correct.",
    difficulty: "Easy",
    tags: ["Financial Analysis"],
  };
  await page
    .getByRole("textbox", { name: "Default indicator for rows without one" })
    .fill("FI:001");
  await upload.setInputFiles({
    name: "mixed.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify([
        row,
        { ...row, options: [] },
        { ...row, questionText: ` ${row.questionText.toUpperCase()} ` },
      ]),
    ),
  });
  await preview.click();
  await expect(page.getByRole("status")).toContainText(
    "1 ready; nothing saved yet. 1 duplicate, 1 rejected.",
  );
  await page.getByRole("button", { name: "Import Valid Rows" }).click();
  await expect(page.getByRole("status")).toContainText(
    "1 pending review, 0 published. 1 duplicate, 1 rejected.",
  );
  await page.getByRole("link", { name: "Review candidate 1" }).click();
  await expect(page.getByText(/Pending Review \/ Valid/)).toBeVisible();
  await page.getByRole("button", { name: "Log Out" }).click();
  await login(page, fixture.email);
  await page.goto("/admin/questions/author");
  await expect(page).toHaveURL(/\/unauthorized$/);
});
