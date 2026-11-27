import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export type JsonRecord = Record<string, unknown>;

export type PipelineEnv = {
  openAiApiKey: string;
  supabaseUrl: string;
  serviceRoleKey: string;
  batchSecret: string;
};

export type PipelineClients = {
  fetch: typeof fetch;
  supabase: SupabaseClient;
  env: PipelineEnv;
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function loadPipelineEnv(): PipelineEnv {
  const env = {
    openAiApiKey: Deno.env.get("OPENAI_API_KEY") ?? "",
    supabaseUrl: Deno.env.get("SUPABASE_URL") ?? "",
    serviceRoleKey:
      Deno.env.get("SERVICE_ROLE_KEY") ??
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      "",
    batchSecret: Deno.env.get("BATCH_SECRET") ?? "",
  };

  const missing = Object.entries(env)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing generation pipeline environment: ${missing.join(", ")}`);
  }

  return env;
}

export function createPipelineClients(env = loadPipelineEnv()): PipelineClients {
  return {
    env,
    fetch,
    supabase: createClient(env.supabaseUrl, env.serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }),
  };
}

export function authorizeBatchRequest(request: Request, expectedSecret: string) {
  const incomingSecret = request.headers.get("x-batch-secret");

  if (!incomingSecret || incomingSecret !== expectedSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  return null;
}

export function boundedError(value: unknown, maxLength = 1200) {
  const message = value instanceof Error ? value.message : JSON.stringify(value);
  return message.slice(0, maxLength);
}

export function redact(value: string) {
  if (value.length <= 8) return "[redacted]";
  return `${value.slice(0, 4)}...[redacted]...${value.slice(-4)}`;
}

export function validateJsonl(jsonl: string) {
  const lines = jsonl
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const customIds = new Set<string>();

  for (const line of lines) {
    const parsed = JSON.parse(line) as JsonRecord;
    const customId = parsed.custom_id;
    if (typeof customId !== "string" || !customId) {
      throw new Error("JSONL line is missing a custom_id.");
    }
    if (customIds.has(customId)) {
      throw new Error(`Duplicate JSONL custom_id: ${customId}`);
    }
    customIds.add(customId);
  }

  return { lineCount: lines.length, customIds: [...customIds] };
}

function textFromContentPart(part: JsonRecord): string | null {
  if (typeof part.text === "string") return part.text;
  if (typeof part.output_text === "string") return part.output_text;
  if (typeof part.content === "string") return part.content;
  return null;
}

export function extractResponseText(responseBody: unknown): string | null {
  if (!responseBody || typeof responseBody !== "object") return null;
  const body = responseBody as JsonRecord;

  if (typeof body.output_text === "string") return body.output_text;

  const output = body.output;
  if (!Array.isArray(output)) return null;

  const textParts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as JsonRecord).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const text = textFromContentPart(part as JsonRecord);
      if (text) textParts.push(text);
    }
  }

  return textParts.length > 0 ? textParts.join("\n") : null;
}

export function parseGeneratedQuestions(text: string): unknown[] {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Generated question text was empty.");

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced?.[1]?.trim() ?? trimmed;
  const parsed = JSON.parse(jsonText) as unknown;

  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const questions = (parsed as JsonRecord).questions;
    if (Array.isArray(questions)) return questions;
  }

  throw new Error("Generated question payload must be an array or { questions }.");
}

export type BatchOutputRecord = {
  custom_id?: string;
  response?: {
    status_code?: number;
    body?: unknown;
  };
  error?: unknown;
};

export type BatchOutputLine = BatchOutputRecord & {
  position: number;
  source_line: number;
  source_text: string;
  parse_error: "invalid_json" | "invalid_envelope" | null;
};

export function parseBatchOutputJsonl(output: string) {
  if (output.length > 32 * 1024 * 1024)
    throw new Error("Output exceeds bounded file limit.");
  const records: BatchOutputLine[] = [];
  for (const [physicalIndex, source] of output.split("\n").entries()) {
    const line = source.trim();
    if (!line) continue;
    if (records.length >= 10000)
      throw new Error("Output exceeds bounded record limit.");
    const base = {
      position: records.length,
      source_line: physicalIndex + 1,
      source_text: line,
    };
    let parsed: unknown;
    try {
      parsed = line.length <= 512 * 1024 ? JSON.parse(line) : null;
    } catch {
      records.push({ ...base, parse_error: "invalid_json" });
      continue;
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      records.push({ ...base, parse_error: "invalid_envelope" });
      continue;
    }
    const envelope = parsed as JsonRecord;
    if (
      (!envelope.response ||
        typeof envelope.response !== "object" ||
        Array.isArray(envelope.response)) &&
      envelope.error == null
    ) {
      records.push({ ...base, parse_error: "invalid_envelope" });
      continue;
    }
    const response = envelope.response as JsonRecord | undefined;
    if (
      envelope.error == null &&
      (!response?.body ||
        typeof response.body !== "object" ||
        Array.isArray(response.body))
    ) {
      records.push({ ...base, parse_error: "invalid_envelope" });
      continue;
    }
    records.push({ ...(envelope as BatchOutputRecord), ...base, parse_error: null });
  }
  return records;
}
