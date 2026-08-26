import { afterEach, describe, expect, it, vi } from "vitest";

import { getAuthRedirectTo, sanitizeRedirectPath } from "./redirects";

describe("auth redirects", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds callback URLs from the current origin", () => {
    expect(getAuthRedirectTo("/auth/callback")).toBe(
      "http://localhost:3000/auth/callback",
    );
  });

  it("allows known local paths only", () => {
    expect(sanitizeRedirectPath("/admin")).toBe("/admin");
    expect(sanitizeRedirectPath("https://evil.example/dashboard")).toBe("/dashboard");
    expect(sanitizeRedirectPath("/unknown")).toBe("/dashboard");
    expect(sanitizeRedirectPath(null)).toBe("/dashboard");
  });
});
