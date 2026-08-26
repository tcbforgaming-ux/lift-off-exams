import { describe, expect, it, vi } from "vitest";

import { signUpWithEmail } from "./authActions";

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
