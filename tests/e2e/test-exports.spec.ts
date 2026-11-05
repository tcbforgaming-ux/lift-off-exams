import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { inflateSync } from "node:zlib";
import type { Database } from "../../src/lib/supabase/database.types";
import { fixture } from "./global-setup";
import { createSessionUser, localService } from "./local-session-fixtures";

const client = () =>
  createClient<Database>(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );

async function seedResult(paid: boolean) {
  const account = await createSessionUser("test-exports");
  const service = localService();
  const api = client();
  expect(
    (
      await api.auth.signInWithPassword({
        email: account.email,
        password: fixture.password,
      })
    ).error,
  ).toBeNull();
  if (paid)
    expect(
      (
        await service
          .from("subscriptions")
          .insert({ user_id: account.id, status: "active" })
      ).error,
    ).toBeNull();
  const questionId = crypto.randomUUID();
  const definition = crypto.randomUUID();
  const id = crypto.randomUUID();
  const testId = "EX" + definition.replaceAll("-", "").slice(0, 10).toUpperCase();
  const now = new Date(Date.now() - 60_000).toISOString();
  const tags = Array.from(
    { length: 26 },
    (_, i) => "Export Topic " + String(i + 1).padStart(2, "0"),
  );
  const options = ["One", "Two", "Three", "Four"];
  expect(
    (
      await service.from("questions").insert({
        id: questionId,
        partition_key: "Finance",
        question_type: "Scenario",
        question_text: "Edited current question " + questionId,
        options,
        correct_option_id: "B",
        difficulty: "Hard",
      })
    ).error,
  ).toBeNull();
  expect(
    (
      await service.from("test_ids").insert({
        id: testId,
        definition_id: definition,
        mode: "Test",
        category: "Finance",
        difficulties: ["Easy"],
        topic_tags: tags,
        question_count: 1,
        pool_timestamp: now,
        blueprint_snapshot: {
          schema_version: 1,
          blueprint_id: "fixture-export",
          total_questions: 1,
          strata: [{ count: 1, tags }],
        },
      })
    ).error,
  ).toBeNull();
  const sessionIds = [
    id,
    ...Array.from({ length: paid ? 100 : 0 }, () => crypto.randomUUID()),
  ];
  expect(
    (
      await service.from("test_sessions").insert(
        sessionIds.map((session_id) => ({
          id: session_id,
          test_definition_id: definition,
          user_id: account.id,
          mode: "Test",
          status: "submitted",
          question_count: 1,
          idempotency_key: session_id,
          active_period_started_at: null,
          started_at: now,
          submitted_at: now,
        })),
      )
    ).error,
  ).toBeNull();
  expect(
    (
      await service.from("test_results").insert(
        sessionIds.map((session_id) => ({
          session_id,
          user_id: account.id,
          test_definition_id: definition,
          total_questions: 1,
          answered_questions: 1,
          unanswered_questions: 0,
          correct_answers: 0,
          incorrect_answers: 1,
          raw_score: 0,
          percentage: 0,
          scoring_rule_version: "single-choice-v1",
          explanation_policy_version: "stripe-entitlement-v1",
          active_duration_seconds: 10,
          submitted_at: now,
        })),
      )
    ).error,
  ).toBeNull();
  const items = sessionIds.map((session_id) => ({
    session_id,
    position: 1,
    question_id: questionId,
    question_type: "Scenario",
    question_text:
      session_id === id
        ? '=SUM("café")\n' + "Long saved question. ".repeat(230)
        : "Another saved question",
    options,
    difficulty: "Easy",
    tags: [...tags, tags[0]],
    selected_option_id: session_id === id ? "UNKNOWN" : "B",
    correct_option_id: "A",
    is_correct: false,
    explanation_snapshot: "Protected export explanation",
  }));
  // Seed immutable rows as the local database owner; the capture trigger is
  // deliberately not granted to API roles for direct fixture writes.
  execFileSync(
    "docker",
    [
      "exec",
      "-i",
      "supabase_db_liftoff-verification-isolated",
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    {
      input: `insert into public.test_result_items(session_id,position,question_id,question_type,question_text,options,difficulty,tags,selected_option_id,correct_option_id,is_correct,explanation_snapshot)
    select session_id,position,question_id,question_type,question_text,options,difficulty,tags,selected_option_id,correct_option_id,is_correct,explanation_snapshot
    from jsonb_populate_recordset(null::public.test_result_items,$fixture$${JSON.stringify(items)}$fixture$::jsonb);`,
    },
  );
  return { account, id, testId, day: now.slice(0, 10) };
}

async function login(page: Page, email: string, path: string) {
  await page.goto(path);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(page.getByRole("button", { name: "Download CSV" })).toBeVisible();
}

async function file(page: Page, kind: string, format: "CSV" | "PDF", suffix = "") {
  await page.evaluate(() => {
    document.documentElement.removeAttribute("data-export-test-mime");
    const original = URL.createObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      if (blob instanceof Blob)
        document.documentElement.setAttribute("data-export-test-mime", blob.type);
      URL.createObjectURL = original;
      return original(blob);
    };
  });
  const download = page.waitForEvent("download");
  const button = page.getByRole("button", { name: "Download " + format });
  await button.focus();
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  const result = await download;
  await expect(page.locator("html")).toHaveAttribute(
    "data-export-test-mime",
    format === "PDF" ? "application/pdf" : "text/csv;charset=utf-8",
  );
  expect(result.suggestedFilename()).toBe(
    `lift-off-test-${kind}${suffix}.${format.toLowerCase()}`,
  );
  expect(await result.failure()).toBeNull();
  if (process.env.E2E_EXPORT_REVIEW === "1" && kind === "result" && format === "PDF")
    await result.saveAs(".tmp/export-review-result.pdf");
  const buffer = await readFile(await result.path());
  const raw = buffer.toString("latin1");
  if (format === "CSV") {
    expect(buffer.subarray(0, 3)).toEqual(Buffer.from([239, 187, 191]));
    return { text: buffer.toString("utf8"), pages: 0 };
  }
  expect(raw.startsWith("%PDF-")).toBe(true);
  // Read vector text from the compressed page content streams, not PDF metadata.
  const streams = Array.from(
    raw.matchAll(/^\d+ 0 obj\r?\n<<((?:(?!\nendobj)[\s\S])*?)>>\r?\nstream\r?\n/gm),
  );
  const text = streams
    .filter((s) => s[1].includes("/FlateDecode") && !s[1].includes("/Subtype /Image"))
    .map((s) => {
      const length = Number(s[1].match(/\/Length (\d+)/)?.[1]);
      const start = s.index + s[0].length;
      return inflateSync(buffer.subarray(start, start + length)).toString("latin1");
    })
    .join("\n");
  return { text, pages: (raw.match(/\/Type \/Page\b/g) || []).length };
}

test("six paid downloads have matching scope and complete owned snapshot contents", async ({
  page,
}) => {
  const { account, id, testId, day } = await seedResult(true);
  await login(page, account.email, "/results/" + id);
  for (const [kind, route, count, marker] of [
    ["result", "/results/" + id, 1, testId],
    ["analytics", "/analytics", 101, "Export Topic 26"],
    ["history", "/history", 101, testId],
  ] as const) {
    await page.goto(route);
    if (kind === "analytics") {
      await page.getByLabel("Time range").selectOption("custom");
      await page.getByLabel("From", { exact: true }).fill(day);
      await page.getByLabel("Through", { exact: true }).fill(day);
      const applied = page.waitForResponse(
        (response) =>
          response.url().endsWith("/rpc/get_my_activity_analytics") &&
          response.request().postData()?.includes('"p_range":"custom"') === true,
      );
      await page.getByRole("button", { name: "Apply Range" }).click();
      expect((await applied).ok()).toBe(true);
    }
    const suffix = kind === "result" ? "-" + id : "";
    const csv = await file(page, kind, "CSV", suffix);
    const pdf = await file(page, kind, "PDF", suffix);
    expect(csv.text).toContain(`"Completed tests","${count}"`);
    expect(pdf.text).toContain(`Completed tests: ${count}`);
    expect(csv.text).toContain(marker);
    expect(pdf.text).toContain(marker);
    expect(pdf.pages).toBeGreaterThan(1);
    if (kind === "analytics") {
      expect(csv.text).toContain(`"From (UTC, inclusive)","${day}"`);
      expect(pdf.text).toContain(`From \\(UTC, inclusive\\): ${day}`);
    }
    expect(csv.text).not.toContain("Edited current question");
    if (kind !== "history") {
      expect(csv.text).toContain("Protected export explanation");
      expect(pdf.text).toContain("Protected export explanation");
    }
    if (kind === "result") {
      expect(csv.text).toContain(`"'=SUM(""café"")\nLong saved question.`);
      expect(pdf.text).toContain("Long saved question.");
      expect(csv.text).toContain("UNKNOWN");
    } else {
      expect(
        csv.text.match(/"Score History","\d+","Score","0\.00%"/g) ?? [],
      ).toHaveLength(101);
    }
  }
});

test("an unpaid lost-response retry is counted once and never includes explanations", async ({
  page,
}) => {
  const { account, id } = await seedResult(false);
  const denied = await client().rpc("prepare_my_test_export", {
    p_kind: "result",
    p_format: "csv",
    p_request: crypto.randomUUID(),
    p_session: id,
  });
  expect(denied.data).toBeNull();
  expect(denied.error).not.toBeNull();
  await login(page, account.email, "/results/" + id);
  let first = true;
  const keys: string[] = [];
  await page.route("**/rest/v1/rpc/prepare_my_test_export", async (route) => {
    const request: unknown = route.request().postDataJSON();
    if (
      !request ||
      typeof request !== "object" ||
      !("p_request" in request) ||
      typeof request.p_request !== "string"
    )
      throw new Error("Missing export request ID.");
    keys.push(request.p_request);
    if (first) {
      first = false;
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      expect(response.headers()["cache-control"]).toBe("private, no-store");
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Download CSV" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  const csv = await file(page, "result", "CSV", "-" + id);
  expect(keys[0]).toBe(keys[1]);
  expect(csv.text).not.toContain("Explanation");
  const pdf = await file(page, "result", "PDF", "-" + id);
  expect(pdf.text).not.toContain("Explanation");
  await file(page, "result", "CSV", "-" + id);
  await page.getByRole("button", { name: "Download CSV" }).click();
  await expect(page.getByRole("alert")).toContainText("Weekly export limit reached");
});
