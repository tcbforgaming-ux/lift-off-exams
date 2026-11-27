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

function validateSupabaseUrl(value: string, appEnv: AppEnvironment) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === "https:" && parsed.hostname.includes("supabase")) {
      return true;
    }
    return (
      appEnv === "local" &&
      parsed.protocol === "http:" &&
      (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost")
    );
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

  if (!validateSupabaseUrl(supabaseUrl, appEnv)) {
    throw new Error(
      "VITE_SUPABASE_URL must be Supabase HTTPS, or loopback HTTP in local development.",
    );
  }

  return {
    appEnv,
    supabaseUrl,
    supabaseAnonKey,
  };
}
