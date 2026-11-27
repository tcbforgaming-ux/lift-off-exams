import { expect, test } from "@playwright/test";
import { fixture } from "./global-setup";
import { createSessionUser, localService } from "./local-session-fixtures";

test("Infinite Run keeps supplying questions, recovers a lost response, and finishes", async ({
  page,
}) => {
  const account = await createSessionUser("infinite");
  const service = localService();
  expect(
    (
      await service
        .from("subscriptions")
        .insert({ user_id: account.id, status: "active" })
    ).error,
  ).toBeNull();
  expect(
    (
      await service.from("questions").insert({
        partition_key: "Entrepreneurship",
        question_type: "Scenario",
        question_text: `Infinite Run fixture ${account.id}`,
        options: ["One", "Two", "Three", "Four"],
        correct_option_id: "A",
        difficulty: "Hard",
        explanation: "Protected Infinite Run explanation",
      })
    ).error,
  ).toBeNull();
  await page.goto("/infinite-run");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await page
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption("Entrepreneurship");
  const state = page.waitForResponse((response) =>
    response.url().endsWith("/rpc/get_infinite_run"),
  );
  await page.getByRole("button", { name: "Start Infinite Run" }).click();
  const payload = await (await state).text();
  expect(payload).not.toContain('"answer"');
  expect(payload).not.toContain('"explanation"');
  const next = page.getByRole("button", { name: "Next", exact: true });
  const unsure = page.getByRole("radio", { name: /I Don.t Know/ });
  await expect(next).toBeDisabled();
  await page.route(
    "**/rpc/advance_infinite_run",
    async (route) => {
      const responses = await Promise.all([route.fetch(), route.fetch()]);
      expect(responses.every((response) => response.ok())).toBe(true);
      expect(await responses[0].text()).toBe(await responses[1].text());
      await route.abort();
    },
    { times: 1 },
  );
  await unsure.check();
  await next.click();
  await page.getByRole("button", { name: "Retry Next" }).click();
  await expect(page.getByText("Question 2", { exact: true })).toBeVisible();
  await unsure.check();
  await next.click();
  await expect(page.getByText("Question 3", { exact: true })).toBeVisible();
  const question = await page.locator("legend").innerText();
  await page.getByRole("link", { name: "Exit run" }).click();
  await page.getByRole("link", { name: /Open saved Infinite Run/ }).click();
  await page.reload();
  await expect(page.getByText("Question 3", { exact: true })).toBeVisible();
  await expect(page.locator("legend")).toHaveText(question);
  await page.getByRole("button", { name: "Finish run" }).click();
  await expect(
    page.getByRole("heading", { name: "Infinite Run finished" }),
  ).toBeVisible();
  await expect(page.getByText(/0\/2 correct/)).toBeVisible();
  await expect(next).toHaveCount(0);
  await page.getByRole("button", { name: "Review answers" }).click();
  await expect(page.getByLabel("Show explanations")).toBeVisible();
  await expect(page.locator("ol li")).toHaveCount(2);
});
