import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fixture } from "./global-setup";
import { createSessionUser, localService } from "./local-session-fixtures";

test("completed Tests and Quizzes combine, filter, and leave downloads Test-only", async ({
  page,
}) => {
  const account = await createSessionUser("activity-overview");
  const service = localService();
  const testCode =
    "AT" + crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  const quizCode =
    "AQ" + crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
  if (!/^[0-9a-f-]{36}$/.test(account.id))
    throw new Error("Invalid synthetic account.");
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
      input: `
    begin;
    insert into public.questions(partition_key,question_type,question_text,options,correct_option_id,difficulty)
    select 'Finance','Scenario','Activity fixture ${account.id} '||n,'["One","Two","Three","Four"]','A','Easy'
    from generate_series(1,5) n;
    insert into public.test_ids(id,mode,category,question_count,pool_timestamp) values
      ('${testCode}','Test','Finance',5,now()),('${quizCode}','Quiz','Mixed practice',5,now());
    insert into public.test_sessions(test_definition_id,user_id,status,mode,question_count,idempotency_key,active_period_started_at,submitted_at)
    select definition_id,'${account.id}','submitted',mode,5,id,null,now()-interval '1 minute'
    from public.test_ids where id in ('${testCode}','${quizCode}');
    insert into public.test_sessions(test_definition_id,user_id,mode,question_count,idempotency_key)
    select definition_id,'${account.id}','Quiz',5,id||':unfinished' from public.test_ids where id='${quizCode}';
    insert into public.test_results(session_id,user_id,test_definition_id,total_questions,answered_questions,unanswered_questions,correct_answers,incorrect_answers,raw_score,percentage,scoring_rule_version,explanation_policy_version,active_duration_seconds,submitted_at)
    select id,user_id,test_definition_id,5,5,0,c,5-c,c,c*20,'single-choice-v1','stripe-entitlement-v1',0,submitted_at
    from public.test_sessions cross join lateral (select case when mode='Test' then 4 else 3 end c) x
    where user_id='${account.id}' and status='submitted';
    insert into public.test_result_items(session_id,position,question_id,question_type,question_text,options,difficulty,tags,selected_option_id,correct_option_id,is_correct)
    select s.id,q.n,q.id,'Scenario',s.mode||' saved question '||q.n,q.options,'Easy',array[s.mode||' topic'],
      case when q.n<=case when s.mode='Test' then 4 else 3 end then 'A' when s.mode='Quiz' and q.n=4 then 'UNKNOWN' else 'B' end,
      'A',q.n<=case when s.mode='Test' then 4 else 3 end
    from public.test_sessions s cross join lateral (select id,options,row_number() over(order by id) n
      from public.questions where question_text like 'Activity fixture ${account.id} %') q
    where s.user_id='${account.id}' and s.status='submitted';
    commit;`,
    },
  );
  await page.goto("/analytics");
  await page.getByLabel("Email").fill(account.email);
  await page.getByLabel("Password").fill(fixture.password);
  await page.getByRole("button", { name: "Log In" }).click();
  await expect(
    page.getByText("Completed activities", { exact: true }).locator(".."),
  ).toContainText("2");
  await expect(
    page.getByText("Average score (past 30 days)").locator(".."),
  ).toContainText("70%");
  await expect(page.getByLabel("Activity mode")).toHaveCount(0);
  expect(
    (
      await service
        .from("subscriptions")
        .insert({ user_id: account.id, status: "active" })
    ).error,
  ).toBeNull();
  await page.reload();
  const history = page.getByRole("region", { name: "Score History" });
  const topics = page.getByRole("region", { name: "Topic Accuracy" });
  await expect(history).toContainText(/Test · .*80%/);
  await expect(history).toContainText(/Quiz · .*60%/);
  await expect(topics).toContainText("Test topic");
  await expect(topics).toContainText("Quiz topic");
  for (const [mode, score, excluded] of [
    ["Test", 80, "Quiz"],
    ["Quiz", 60, "Test"],
  ] as const) {
    await page.getByLabel("Activity mode").selectOption(mode);
    await page.getByRole("button", { name: "Apply Range" }).click();
    await expect(history.getByRole("link")).toHaveCount(1);
    await expect(history).toContainText(new RegExp(`${mode} · .*${score}%`));
    await expect(topics).toContainText(mode + " topic");
    await expect(topics).not.toContainText(excluded + " topic");
    await expect(
      page.getByRole("region", { name: "Confidence analysis" }),
    ).toContainText(
      mode === "Test" ? "0 of 5 submitted answers" : "1 of 5 submitted answers",
    );
  }
  const download = page.waitForEvent("download");
  await expect(
    page.getByRole("region", { name: "Export Test Mode data" }),
  ).toContainText("Quizzes are excluded.");
  await page.getByRole("button", { name: "Download CSV" }).click();
  const csv = await readFile(await (await download).path(), "utf8");
  expect(csv).toContain('"Completed tests","1"');
  expect(csv).toContain('"80.00%"');
  expect(csv).not.toContain('"60.00%"');
  expect(csv).not.toContain("Quiz topic");
});
