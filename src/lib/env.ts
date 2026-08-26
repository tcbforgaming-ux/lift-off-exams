export type AppEnvironment = "local" | "preview" | "production";

export type ClientEnv = {
  appEnv: AppEnvironment;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

const validAppEnvironments = new Set<AppEnvironment>([
  "local",
  "preview",
  "production",
]);

function readEnvValue(key: string) {
  return String(import.meta.env[key] ?? "").trim();
}

function parseAppEnvironment(value: string): AppEnvironment {
  if (validAppEnvironments.has(value as AppEnvironment)) {
    return value as AppEnvironment;
  }

  return "local";
}

function validateSupabaseUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname.includes("supabase");
  } catch {
    return false;
  }
}

export function getClientEnv(): ClientEnv {
  const supabaseUrl = readEnvValue("VITE_SUPABASE_URL");
  const supabaseAnonKey = readEnvValue("VITE_SUPABASE_ANON_KEY");
  const appEnv = parseAppEnvironment(readEnvValue("VITE_APP_ENV"));
  const missing = [
    ["VITE_SUPABASE_URL", supabaseUrl],
    ["VITE_SUPABASE_ANON_KEY", supabaseAnonKey],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  if (!validateSupabaseUrl(supabaseUrl)) {
    throw new Error("VITE_SUPABASE_URL must be a valid Supabase HTTPS URL.");
  }

  return {
    appEnv,
    supabaseUrl,
    supabaseAnonKey,
  };
}
