import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  role: "admin",
  status: "authenticated",
}));
vi.mock("../../lib/auth/useAuth", () => ({
  useAuth: () => ({ ...auth, profile: { display_name: "Example" }, signOut: vi.fn() }),
}));
import { AppShell } from "./AppShell";

function renderShell(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell>
        <p>Page content</p>
      </AppShell>
    </MemoryRouter>,
  );
}

describe("separate dashboard shells", () => {
  beforeEach(() => {
    auth.role = "admin";
    auth.status = "authenticated";
  });
  it("shows only administrative tools in the admin sidebar", () => {
    renderShell("/admin/reports");
    const navigation = screen.getByRole("navigation", { name: "Admin navigation" });
    expect(within(navigation).getByRole("link", { name: "Report Queue" })).toHaveClass(
      "active",
    );
    expect(within(navigation).getByRole("link", { name: "Overview" })).not.toHaveClass(
      "active",
    );
    expect(
      within(navigation).queryByRole("link", { name: "Generate" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "User Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });
  it.each(["admin", "owner"])(
    "offers dashboard switching to a signed-in %s",
    (role) => {
      auth.role = role;
      renderShell("/dashboard");
      expect(
        screen.queryByRole("navigation", { name: "Admin navigation" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("link", { name: "Report Queue" }),
      ).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Admin Dashboard" })).toHaveAttribute(
        "href",
        "/admin",
      );
    },
  );
  it("does not expose staff navigation to students", () => {
    auth.role = "student";
    renderShell("/admin");
    expect(
      screen.queryByRole("navigation", { name: "Admin navigation" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Admin Dashboard" }),
    ).not.toBeInTheDocument();
  });
  it.each([
    ["/", "unauthenticated"],
    ["/login", "unauthenticated"],
    ["/signup", "unauthenticated"],
    ["/", "loading"],
    ["/", "error"],
  ])("hides the admin link on %s when the session is %s", (path, status) => {
    auth.status = status;
    renderShell(path);
    expect(
      screen.queryByRole("link", { name: "Admin Dashboard" }),
    ).not.toBeInTheDocument();
  });
});
