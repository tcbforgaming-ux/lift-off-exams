import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthCallbackPage } from "./AuthCallbackPage";

const state = vi.hoisted(() => ({
  status: "loading",
  getSession: vi.fn(),
  exchange: vi.fn(),
}));
vi.mock("../../lib/auth/useAuth", () => ({
  useAuth: () => ({ status: state.status }),
}));
vi.mock("../../lib/supabase/browserClient", () => ({
  getSupabaseBrowserClient: () => ({
    auth: { getSession: state.getSession, exchangeCodeForSession: state.exchange },
  }),
}));
function Destination() {
  const l = useLocation();
  return <h1>{l.pathname + l.search + l.hash}</h1>;
}
function Harness({ url }: { url: string }) {
  return (
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="*" element={<Destination />} />
      </Routes>
    </MemoryRouter>
  );
}
describe("callback destination resolution", () => {
  beforeEach(() => {
    state.status = "loading";
    state.getSession.mockResolvedValue({ data: { session: {} } });
    state.exchange.mockResolvedValue({ error: null });
  });
  it("waits for trusted profile resolution before preserving a safe callback next", async () => {
    const url =
      "/auth/callback?code=synthetic&next=" +
      encodeURIComponent("/admin/reports?status=open#queue");
    const { rerender } = render(<Harness url={url} />);
    await waitFor(() => expect(state.exchange).toHaveBeenCalledWith("synthetic"));
    expect(screen.getByText("Signing You In")).toBeInTheDocument();
    state.status = "authenticated";
    rerender(<Harness url={url} />);
    expect(
      await screen.findByText("/admin/reports?status=open#queue"),
    ).toBeInTheDocument();
  });
  it("rejects an external callback next while preserving the existing session callback", async () => {
    state.status = "authenticated";
    render(<Harness url="/auth/callback?next=https%3A%2F%2Fevil.example%2Fadmin" />);
    expect(await screen.findByText("/dashboard")).toBeInTheDocument();
  });
});
