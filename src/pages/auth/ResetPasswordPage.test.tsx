import { AuthApiError } from "@supabase/supabase-js";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { ResetPasswordPage } from "./ResetPasswordPage";

const state = vi.hoisted(() => ({ updateUser: vi.fn(), getSession: vi.fn() }));
vi.mock("../../lib/supabase/browserClient", () => ({
  getSupabaseBrowserClient: () => ({ auth: state }),
}));

beforeEach(() => {
  vi.resetAllMocks();
  state.getSession.mockResolvedValue({ data: { session: {} } });
});

async function submitPassword() {
  render(
    <MemoryRouter>
      <ResetPasswordPage />
    </MemoryRouter>,
  );
  fireEvent.change(await screen.findByLabelText("New password", { exact: true }), {
    target: { value: "long-test-password" },
  });
  fireEvent.change(screen.getByLabelText("Confirm new password"), {
    target: { value: "long-test-password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Update Password" }));
}

it.each([
  ["same_password", /different from your current password/],
  ["weak_password", /does not meet the account's requirements/],
] as const)("keeps the reset form available on %s", async (code, expected) => {
  state.updateUser.mockResolvedValue({
    error: new AuthApiError("provider details", 422, code),
  });
  await submitPassword();
  expect(await screen.findByRole("alert")).toHaveTextContent(expected);
  expect(screen.getByRole("button", { name: "Update Password" })).toBeEnabled();
  expect(screen.queryByText("Request a new recovery link")).not.toBeInTheDocument();
});

it("offers a fresh link when the recovery session is actually expired", async () => {
  state.updateUser.mockResolvedValue({
    error: new AuthApiError("provider details", 403, "session_expired"),
  });
  await submitPassword();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "recovery session is no longer valid",
  );
  expect(
    screen.getByRole("link", { name: "Request a new recovery link" }),
  ).toHaveAttribute("href", "/forgot-password");
  expect(
    screen.queryByRole("button", { name: "Update Password" }),
  ).not.toBeInTheDocument();
});

it("keeps a failed network request retryable without calling it expiration", async () => {
  state.updateUser.mockRejectedValue(new Error("offline"));
  await submitPassword();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    /couldn't update your password/,
  );
  expect(screen.getByRole("button", { name: "Update Password" })).toBeEnabled();
});
