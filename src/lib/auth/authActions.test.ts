import { describe, expect, it, vi } from "vitest";

import { signInWithGoogle, signUpWithEmail } from "./authActions";

type CapturedSignupPayload = {
  email: string;
  password: string;
  options: {
    data: Record<string, unknown>;
  };
};

function assertSignupPayload(value: unknown): asserts value is CapturedSignupPayload {
  if (!value || typeof value !== "object" || !("options" in value)) {
    throw new Error("Expected captured signup payload.");
  }
}

describe("auth actions", () => {
  it("carries only safe destinations through the existing Google callback contract", async () => {
    const signInWithOAuth = vi.fn(() => Promise.resolve({ data: {}, error: null }));
    const supabase = { auth: { signInWithOAuth } };
    const payload = (redirectTo: string) => ({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    await signInWithGoogle(supabase as never, "/admin/reports?status=open#queue");
    expect(signInWithOAuth).toHaveBeenLastCalledWith(
      payload(
        "http://localhost:3000/auth/callback?next=%2Fadmin%2Freports%3Fstatus%3Dopen%23queue",
      ),
    );
    await signInWithGoogle(supabase as never, "//evil.example/admin");
    expect(signInWithOAuth).toHaveBeenLastCalledWith(
      payload("http://localhost:3000/auth/callback?next=%2Fdashboard"),
    );
    await signInWithGoogle(supabase as never);
    expect(signInWithOAuth).toHaveBeenLastCalledWith(
      payload("http://localhost:3000/auth/callback"),
    );
  });
  it("does not send protected role fields during email registration", async () => {
    let submittedPayload: unknown;
    const signUp = vi.fn((payload: unknown) => {
      submittedPayload = payload;
      return Promise.resolve({ data: {}, error: null });
    });
    const supabase = {
      auth: {
        signUp,
      },
    };

    await signUpWithEmail(supabase as never, {
      displayName: "Taylor",
      email: "taylor@example.test",
      password: "password123",
    });

    expect(signUp).toHaveBeenCalledTimes(1);
    assertSignupPayload(submittedPayload);
    expect(submittedPayload.email).toBe("taylor@example.test");
    expect(submittedPayload.password).toBe("password123");
    expect(submittedPayload.options.data).toEqual({ display_name: "Taylor" });
    expect(submittedPayload.options.data).not.toHaveProperty("role");
    expect(submittedPayload.options.data).not.toHaveProperty("account_tier");
  });
});
