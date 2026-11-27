import { expect, test } from "@playwright/test";
import { demoFixtures } from "./demo-fixtures";
import { fixture } from "./global-setup";
import { createSessionUser, localService } from "./local-session-fixtures";

test("all five public demos grade, review and replay without saving account data", async ({
  page,
}) => {
  const service = localService();
  if (!process.env.LIFTOFF_VERIFY_PROVISIONED_DEMO) {
    expect(
      (await service.from("demo_questions").upsert(demoFixtures)).error,
    ).toBeNull();
  }
  const account = await createSessionUser("demo-isolation");
  const snapshot = async () => {
    const responses = await Promise.all(
      (["test_sessions", "test_results", "user_question_status"] as const).map(
        (table) => service.from(table).select("*", { count: "exact", head: true }),
      ),
    );
    for (const response of responses) expect(response.error).toBeNull();
    return responses.map((response) => response.count);
  };
  const before = await snapshot();
  await page.goto("/");
  await page.getByRole("link", { name: "Try a Demo" }).click();
  for (const id of new Set(demoFixtures.map((item) => item.demo_id))) {
    const selected = demoFixtures.filter((item) => item.demo_id === id);
    const payload = page.waitForResponse((response) =>
      response.url().endsWith("/rpc/get_public_demo"),
    );
    await page.locator(`a[href="/demo/${id}"]`).click();
    const response = await payload;
    expect(await response.json()).toEqual(
      selected.map(({ position, prompt, choices }) => ({ position, prompt, choices })),
    );
    await expect(page).toHaveURL(new RegExp(`/demo/${id}$`));
    await expect(page.locator("fieldset")).toHaveCount(5);
    for (let index = 0; index < 4; index++) {
      const question = selected[index];
      const key = "ABCD".indexOf(question.answer);
      await page
        .locator("fieldset")
        .nth(index)
        .getByRole("radio")
        .nth(index === 3 ? (key + 1) % 4 : key)
        .check();
    }
    await expect(page.getByText("Correct answer:", { exact: false })).toHaveCount(0);
    const gradePayload = page.waitForResponse((response) =>
      response.url().endsWith("/rpc/grade_public_demo"),
    );
    await page.getByRole("button", { name: "Submit demo" }).click();
    const grade = await gradePayload;
    expect(await grade.json()).toEqual({
      score: 3,
      skipped: 1,
      items: selected.map(({ position, answer }, index) => ({
        position,
        answer,
        selected:
          index === 4
            ? null
            : index === 3
              ? "ABCD"[("ABCD".indexOf(answer) + 1) % 4]
              : answer,
      })),
    });
    await expect(page.getByRole("heading", { name: "3 of 5 correct" })).toBeVisible();
    await expect(page.getByText("1 incorrect · 1 skipped")).toBeVisible();
    await expect(page.getByText("Correct answer:", { exact: false })).toHaveCount(5);
    await expect(
      page.getByRole("link", { name: "Create an account to save future results" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Replay demo" }).click();
    await expect(page.locator("input:checked")).toHaveCount(0);
    await page.getByRole("link", { name: "Choose another demo" }).click();
  }
  expect(await snapshot()).toEqual(before);
  await page.goto("/demo/not-a-demo");
  await expect(page.getByRole("heading", { name: "Demo not found" })).toBeVisible();
  await page.goto("/login");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/demo/finance");
  await page.getByRole("radio").first().check();
  await page.reload();
  await expect(page.locator("fieldset")).toHaveCount(5);
  await expect(page.locator("input:checked")).toHaveCount(0);
  await page.getByRole("button", { name: "Submit demo" }).click();
  await expect(page.getByRole("heading", { name: "0 of 5 correct" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create an account to save future results" }),
  ).toHaveCount(0);
  expect(await snapshot()).toEqual(before);
});
