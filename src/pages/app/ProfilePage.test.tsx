import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProfilePage } from "./ProfilePage";

function renderProfile() {
  return render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>,
  );
}

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  result: vi.fn(),
}));
vi.mock("../../lib/auth/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    profile: { display_name: "Original", phone: "", account_tier: "free" },
    role: "admin",
    refreshProfile: mocks.refresh,
  }),
}));
vi.mock("../../lib/supabase/browserClient", () => ({
  getSupabaseBrowserClient: () => ({
    from: () => ({
      update: () => ({ eq: () => ({ select: () => ({ maybeSingle: mocks.result }) }) }),
    }),
  }),
}));
describe("truthful profile saving", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.refresh.mockResolvedValue(undefined);
  });
  for (const kind of [
    "zero rows",
    "wrong row",
    "update error",
    "refresh error",
    "thrown request",
  ]) {
    it(`does not report success after ${kind}`, async () => {
      mocks.result.mockResolvedValue({ data: { user_id: "user-1" }, error: null });
      if (kind === "zero rows")
        mocks.result.mockResolvedValue({ data: null, error: null });
      if (kind === "wrong row")
        mocks.result.mockResolvedValue({ data: { user_id: "other" }, error: null });
      if (kind === "update error")
        mocks.result.mockResolvedValue({ data: null, error: { message: "denied" } });
      if (kind === "refresh error")
        mocks.refresh.mockRejectedValue(new Error("refresh failed"));
      if (kind === "thrown request")
        mocks.result.mockRejectedValue(new Error("offline"));
      renderProfile();
      fireEvent.change(screen.getByLabelText("Display name"), {
        target: { value: "Keep my input" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
      await screen.findByRole("alert");
      expect(screen.queryByText("Profile updated.")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Display name")).toHaveValue("Keep my input");
      expect(screen.getByRole("button", { name: "Save Profile" })).toBeEnabled();
    });
  }
  it("reports success only after the expected row and profile refresh", async () => {
    mocks.result.mockResolvedValue({ data: { user_id: "user-1" }, error: null });
    renderProfile();
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    await waitFor(() =>
      expect(screen.getByText("Profile updated.")).toBeInTheDocument(),
    );
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });
});
