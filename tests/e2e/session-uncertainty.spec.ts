import { createClient } from "@supabase/supabase-js";
import {
  api as verificationApi,
  project as verificationProject,
} from "../../scripts/verification-target.mjs";
import { expect, test } from "@playwright/test";
import { fixture } from "./global-setup";

test("explicit uncertainty persists through reload and scores separately from unanswered", async ({
  page,
}) => {
  const url = process.env.VITE_SUPABASE_URL;
  if (
    url !== verificationApi ||
    process.env.E2E_DISPOSABLE_PROJECT !== verificationProject
  )
    throw new Error("Disposable backend required");
  const api = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `uncertainty-${crypto.randomUUID()}@example.test`;
  expect(
    (
      await api.auth.admin.createUser({
        email,
        password: fixture.password,
        email_confirm: true,
      })
    ).error,
  ).toBeNull();
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto(`/test-id?code=${fixture.testId}`);
  await page.getByRole("button", { name: /^(Start Test|Continue)$/ }).click();
  const unknown = page.getByRole("radio", { name: "I Don't Know" });
  await unknown.click();
  await expect(page.getByText("Answer saved.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(unknown).toBeChecked();
  await expect(page.getByText("This session is paused.")).toBeVisible();
  await page.getByRole("button", { name: "Resume Session", exact: true }).click();
  await page.getByRole("button", { name: "Submit Test", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Submit this test?" })
    .getByRole("button", { name: "Submit Test", exact: true })
    .click();
  await expect(page).toHaveURL(/\/results\//);
  await expect(page.getByRole("heading", { name: "0.00%" })).toBeVisible();
  await expect(page.getByText("I Don't Know", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Topic performance" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Difficulty performance" }),
  ).toBeVisible();
  await expect(page.getByText("Explanation", { exact: true })).toHaveCount(0);
});
