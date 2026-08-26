import { describe, expect, it } from "vitest";

import { canAccessRole, displayRole, isKnownAppRole } from "./roles";

describe("auth roles", () => {
  it("treats student as the standard-user role", () => {
    expect(displayRole("student")).toBe("Standard user");
    expect(canAccessRole("student", "student")).toBe(true);
    expect(canAccessRole("student", "admin")).toBe(false);
    expect(canAccessRole("student", "owner")).toBe(false);
  });

  it("applies the administrator and owner hierarchy", () => {
    expect(canAccessRole("admin", "admin")).toBe(true);
    expect(canAccessRole("admin", "owner")).toBe(false);
    expect(canAccessRole("owner", "admin")).toBe(true);
    expect(canAccessRole("owner", "owner")).toBe(true);
  });

  it("denies unknown or missing roles", () => {
    expect(isKnownAppRole("administrator")).toBe(false);
    expect(canAccessRole(null, "admin")).toBe(false);
  });
});
