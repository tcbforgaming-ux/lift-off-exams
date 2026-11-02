import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RouteGate } from "./RouteGate";

const auth = vi.hoisted(() => ({ status: "unauthenticated", role: "student" }));
vi.mock("../lib/auth/useAuth", () => ({ useAuth: () => auth }));
function Location() {
  const l = useLocation();
  return <p>{l.pathname + l.search + l.hash}</p>;
}
function Admin() {
  return <h1>Protected administration</h1>;
}
function Customer() {
  return <h1>Customer content</h1>;
}
function Login() {
  return <h1>Login form</h1>;
}
function Harness({ entry = "/admin/reports?status=open#queue" }: { entry?: string }) {
  return (
    <MemoryRouter initialEntries={[entry]}>
      <Location />
      <Routes>
        <Route
          path="/admin/reports"
          element={
            <RouteGate component={Admin} auth="protected" requiredRole="admin" />
          }
        />
        <Route
          path="/profile"
          element={<RouteGate component={Customer} auth="protected" />}
        />
        <Route path="/login" element={<RouteGate component={Login} auth="guest" />} />
        <Route path="/dashboard" element={<h1>Default dashboard</h1>} />
        <Route path="/unauthorized" element={<h1>Denied</h1>} />
      </Routes>
    </MemoryRouter>
  );
}
describe("single post-login destination policy", () => {
  beforeEach(() => {
    auth.status = "unauthenticated";
    auth.role = "student";
  });
  it("waits for profile resolution, then preserves admin destination without a guest default race", () => {
    const { rerender } = render(<Harness />);
    expect(screen.getByText("Login form")).toBeInTheDocument();
    act(() => {
      auth.status = "loading";
    });
    rerender(<Harness />);
    expect(screen.queryByText("Protected administration")).not.toBeInTheDocument();
    act(() => {
      auth.status = "authenticated";
      auth.role = "admin";
    });
    rerender(<Harness />);
    expect(screen.getByText("Protected administration")).toBeInTheDocument();
    expect(screen.getByText("/admin/reports?status=open#queue")).toBeInTheDocument();
  });
  it("saved destinations do not authorize a student", () => {
    const { rerender } = render(<Harness />);
    auth.status = "authenticated";
    rerender(<Harness />);
    expect(screen.getByText("Denied")).toBeInTheDocument();
    expect(screen.queryByText("Protected administration")).not.toBeInTheDocument();
  });
  it("returns a student to a customer route", () => {
    const { rerender } = render(<Harness entry="/profile?tab=basic#name" />);
    auth.status = "authenticated";
    rerender(<Harness entry="/profile?tab=basic#name" />);
    expect(screen.getByText("Customer content")).toBeInTheDocument();
    expect(screen.getByText("/profile?tab=basic#name")).toBeInTheDocument();
  });
  it("uses default for an authenticated user opening login directly", () => {
    auth.status = "authenticated";
    render(<Harness entry="/login" />);
    expect(screen.getByText("Default dashboard")).toBeInTheDocument();
  });
});
