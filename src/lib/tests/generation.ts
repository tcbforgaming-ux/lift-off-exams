import { getSupabaseBrowserClient } from "../supabase/browserClient";

export const TEST_QUESTION_LIMIT = 250;
export const TEST_SEED_MAX_BYTES = 128;

export type TestBlueprintSummary = {
  id: string;
  blueprint_name: string;
  category: string;
  cluster: string;
  level: string;
  version: string;
  total_questions: number;
  distribution: unknown;
};

export type TestGenerationResult = {
  success: boolean;
  test_definition_id: string | null;
  test_id: string | null;
  generation_status: "Ready" | "Failed";
  requested_count: number;
  selected_count: number;
  canonical_seed: string;
  algorithm_version: string;
  blueprint_summary: Record<string, unknown>;
  shortage: {
    requested_total?: number;
    available_selected_total?: number;
    unsatisfied_strata?: Array<{
      stratum_id: string;
      requested: number;
      available: number;
      raw_available: number;
      constraints_overlap: boolean;
      guidance: string;
    }>;
  };
};

export type TestIdPreview = {
  test_id: string;
  category: string;
  difficulties: string[];
  topic_tags: string[];
  original_question_count: number;
  creation_date: string;
  blueprint_name: string;
  blueprint_version: string;
  generation_status: string;
  updated_question_count: number;
  authentication_required_to_launch: boolean;
  launch_available: boolean;
  content_policy: "current_with_warning";
  legacy_resolution_status: "Backfilled" | "Replaced" | "Retired" | null;
  replacement_test_id: string | null;
};

export type TestManifestQuestion = {
  test_id: string;
  test_definition_id: string;
  question_position: number;
  question_id: string;
  question_type: string;
  question_text: string;
  options: unknown;
  difficulty: string;
  tags: string[];
  performance_indicator: string | null;
  updated_since_generation: boolean;
};

type RpcError = { message: string };

type TestGenerationRpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: RpcError | null }>;
};

function rpcClient() {
  return getSupabaseBrowserClient() as unknown as TestGenerationRpcClient;
}

export function parseRequestedQuestionCount(value: string | number) {
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) {
    throw new Error("Question count must be a whole number.");
  }

  const count = Number(text);
  if (count < 1 || count > TEST_QUESTION_LIMIT) {
    throw new Error(`Question count must be between 1 and ${TEST_QUESTION_LIMIT}.`);
  }

  return count;
}

export function validateSeed(seed: string) {
  if (seed !== seed.trim()) {
    throw new Error("Seed cannot begin or end with whitespace.");
  }

  if (!seed) return;

  if (new TextEncoder().encode(seed).length > TEST_SEED_MAX_BYTES) {
    throw new Error(`Seed cannot exceed ${TEST_SEED_MAX_BYTES} UTF-8 bytes.`);
  }
}

export async function fetchActiveBlueprints() {
  const { data, error } = await getSupabaseBrowserClient()
    .from("blueprint_versions")
    .select(
      "id,blueprint_name,category,cluster,level,version,total_questions,distribution",
    )
    .eq("status", "Active")
    .order("blueprint_name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as TestBlueprintSummary[];
}

export async function generateTestFromBlueprint(input: {
  blueprintId: string;
  expectedVersion: string;
  requestedCount: number;
  seed: string;
  idempotencyKey: string;
}) {
  const { data, error } = await rpcClient().rpc("generate_test_from_blueprint", {
    p_blueprint_id: input.blueprintId,
    p_expected_blueprint_version: input.expectedVersion,
    p_requested_count: input.requestedCount,
    p_seed: input.seed || null,
    p_idempotency_key: input.idempotencyKey,
  });

  if (error) throw new Error(error.message);
  const rpcData: unknown = data;
  const result = Array.isArray(rpcData) ? (rpcData as unknown[])[0] : rpcData;
  if (!result) throw new Error("The generation service returned no result.");
  return result as TestGenerationResult;
}

export async function fetchTestIdPreview(testId: string) {
  const { data, error } = await rpcClient().rpc("get_test_id_preview", {
    p_test_id: testId.trim().toUpperCase(),
  });

  if (error) throw new Error(error.message);
  return (Array.isArray(data) ? data[0] : data) as TestIdPreview | null;
}

export async function fetchGeneratedTestManifest(testId: string) {
  const { data, error } = await rpcClient().rpc("get_generated_test_manifest", {
    p_test_id: testId.trim().toUpperCase(),
  });

  if (error) throw new Error(error.message);
  return (Array.isArray(data) ? data : []) as TestManifestQuestion[];
}

export async function fetchTestQuestionExplanation(testId: string, questionId: string) {
  const { data, error } = await rpcClient().rpc("get_test_question_explanation", {
    p_test_id: testId.trim().toUpperCase(),
    p_question_id: questionId,
  });

  if (error) throw new Error(error.message);
  const rpcData: unknown = data;
  const result = Array.isArray(rpcData) ? (rpcData as unknown[])[0] : rpcData;
  if (!result || typeof result !== "object") {
    throw new Error("The explanation service returned no result.");
  }
  return result as { question_id: string; explanation: string | null };
}
