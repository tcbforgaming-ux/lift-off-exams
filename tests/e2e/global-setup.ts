import { createClient } from "@supabase/supabase-js";

import type { Database } from "../../src/lib/supabase/database.types";

export const fixture = {
  email: `milestone7-free-${process.env.E2E_RUN_ID ?? "manual"}@example.test`,
  otherEmail: `milestone7-other-${process.env.E2E_RUN_ID ?? "manual"}@example.test`,
  adminEmail: `milestone8-admin-${process.env.E2E_RUN_ID ?? "manual"}@example.test`,
  password: "LocalOnly-M7-Password!",
  testId: "E2EFLOW00001",
  definitionId: "e7200000-0000-4000-8000-000000000001",
  questionIds: [
    "e7210000-0000-4000-8000-000000000001",
    "e7210000-0000-4000-8000-000000000002",
    "e7210000-0000-4000-8000-000000000003",
    "e7210000-0000-4000-8000-000000000004",
  ],
} as const;

async function globalSetup() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (process.env.E2E_LOCAL_ONLY !== "true" || !url?.startsWith("http://127.0.0.1:")) {
    throw new Error("Playwright fixtures may run only against local Supabase.");
  }
  if (!serviceRoleKey) throw new Error("Missing local SUPABASE_SERVICE_ROLE_KEY.");

  const supabase = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: users, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) throw listError;
  const createOrRefreshUser = async (email: string) => {
    const existing = users.users.find((user) => user.email === email);
    if (existing) {
      const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
        password: fixture.password,
        email_confirm: true,
        user_metadata: { display_name: email.split("@")[0] },
      });
      if (error || !data.user) throw error ?? new Error(`Could not refresh ${email}`);
      return data.user;
    }
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: fixture.password,
      email_confirm: true,
      user_metadata: { display_name: email.split("@")[0] },
    });
    if (error || !data.user) throw error ?? new Error(`Could not create ${email}`);
    return data.user;
  };
  const freeUser = await createOrRefreshUser(fixture.email);
  await createOrRefreshUser(fixture.otherEmail);
  const adminUser = await createOrRefreshUser(fixture.adminEmail);
  const { error: adminProfileError } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("user_id", adminUser.id);
  if (adminProfileError) throw adminProfileError;

  const { data: existingDefinition, error: definitionLookupError } = await supabase
    .from("test_ids")
    .select("id")
    .eq("id", fixture.testId)
    .maybeSingle();
  if (definitionLookupError) throw definitionLookupError;
  if (existingDefinition) return;

  const questions = fixture.questionIds.map((id, index) => ({
    id,
    partition_key: "Finance",
    performance_indicator: `E2E-${index + 1}`,
    question_type: "Scenario",
    question_text: `Milestone 7 browser question ${index + 1}`,
    options: [
      { id: "A", text: "Correct choice" },
      { id: "B", text: "Distractor B" },
      { id: "C", text: "Distractor C" },
      { id: "D", text: "Distractor D" },
    ],
    correct_option_id: "A",
    explanation: `Protected E2E explanation ${index + 1}`,
    difficulty: "Medium",
    tags: ["Milestone 7"],
    lifecycle_state: "Active",
    question_hash: `milestone-7-e2e-${index + 1}`,
  }));
  const { error: questionError } = await supabase.from("questions").insert(questions);
  if (questionError) throw questionError;

  const { error: testIdError } = await supabase.from("test_ids").insert({
    id: fixture.testId,
    definition_id: fixture.definitionId,
    mode: "Test",
    category: "Finance",
    difficulties: ["Medium"],
    topic_tags: ["Milestone 7"],
    question_count: 4,
    pool_timestamp: new Date().toISOString(),
    created_by: freeUser.id,
    blueprint_snapshot: {
      blueprint_name: "Milestone 7 Browser Fixture",
      version: "1.0.0",
    },
    canonical_seed: "milestone-7-e2e",
    algorithm_version: "sha256-strata-v1",
    eligibility_rule_version: "active-complete-v1",
    generation_status: "Ready",
    selected_question_count: 4,
    completed_at: new Date().toISOString(),
  });
  if (testIdError) throw testIdError;

  const { data: storedQuestions, error: storedError } = await supabase
    .from("questions")
    .select("id, question_hash, updated_at")
    .in("id", [...fixture.questionIds]);
  if (storedError) throw storedError;
  const byId = new Map(storedQuestions.map((question) => [question.id, question]));
  const memberships = fixture.questionIds.map((questionId, index) => {
    const question = byId.get(questionId);
    if (!question?.question_hash)
      throw new Error("Fixture question snapshot is incomplete.");
    return {
      test_definition_id: fixture.definitionId,
      question_id: questionId,
      position: index + 1,
      stratum_id: "browser-fixture",
      content_hash: question.question_hash,
      question_updated_at: question.updated_at,
    };
  });
  const { error: membershipInsertError } = await supabase
    .from("test_definition_questions")
    .insert(memberships);
  if (membershipInsertError) throw membershipInsertError;
}

export default globalSetup;
