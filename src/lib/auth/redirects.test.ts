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
  it("preserves safe queries, fragments and authorized-route patterns", () => {
    for (const path of [
      "/admin/reports?status=open#queue",
      "/generate?count=50#topics",
      "/history?mode=Test",
      "/admin/reports/f0210000-0000-4000-8000-000000000001?view=review#question",
      "/sessions/f0210000-0000-4000-8000-000000000001#answer",
    ]) {
      expect(sanitizeRedirectPath(path)).toBe(path);
    }
  });
  it("rejects protocol-relative, malformed, authentication-loop and unknown targets", () => {
    for (const path of [
      "//evil.example/admin",
      "https://evil.example/admin",
      "http://localhost:3000/admin",
      "/\\evil.example/admin",
      "/login",
      "/signup?next=/admin",
      "/auth/callback",
      "/reset-password",
      "/admin?x=%xx",
      "/admin\n",
      "/missing",
      42,
      {},
    ]) {
      expect(sanitizeRedirectPath(path)).toBe("/dashboard");
    }
  });
});
