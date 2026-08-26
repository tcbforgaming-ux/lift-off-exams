import { describe, expect, it, vi } from "vitest";

describe("getClientEnv", () => {
  it("validates required Supabase environment variables", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key");
    vi.stubEnv("VITE_APP_ENV", "local");

    const { getClientEnv } = await import("./env");

    expect(getClientEnv()).toEqual({
      appEnv: "local",
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "anon-key",
    });

    vi.unstubAllEnvs();
  });
});
