import type { Session } from "@supabase/supabase-js";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./useAuth";

const mocks = vi.hoisted<{
  listener: (event: string, session: Session | null) => void;
  profiles: Map<string, (value: unknown) => void>;
}>(() => ({
  listener: () => {},
  profiles: new Map<string, (value: unknown) => void>(),
}));
vi.mock("../supabase/browserClient", () => ({
  getSupabaseBrowserClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: (fn: typeof mocks.listener) => {
        mocks.listener = fn;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
    from: () => ({
      select: () => ({
        eq: (_column: string, id: string) => ({
          maybeSingle: () =>
            new Promise((resolve) => {
              mocks.profiles.set(id, resolve);
            }),
        }),
      }),
    }),
  }),
}));
function State() {
  const auth = useAuth();
  return (
    <p>
      {auth.status}:{auth.user?.id ?? "none"}:{auth.role ?? "none"}
    </p>
  );
}
const session = (id: string) =>
  ({
    user: { id },
    access_token: "synthetic",
    refresh_token: "synthetic",
    token_type: "bearer",
    expires_in: 3600,
  }) as Session;
describe("session/profile request generations", () => {
  beforeEach(() => {
    mocks.profiles.clear();
  });
  it("late previous-account profiles cannot replace the current trusted role", async () => {
    render(
      <AuthProvider>
        <State />
      </AuthProvider>,
    );
    await screen.findByText("unauthenticated:none:none");
    act(() => {
      mocks.listener("SIGNED_IN", session("old"));
    });
    act(() => {
      mocks.listener("SIGNED_IN", session("new"));
    });
    await act(async () => {
      mocks.profiles.get("new")!({
        data: { user_id: "new", role: "admin" },
        error: null,
      });
      await Promise.resolve();
    });
    expect(screen.getByText("authenticated:new:admin")).toBeInTheDocument();
    await act(async () => {
      mocks.profiles.get("old")!({
        data: { user_id: "old", role: "owner" },
        error: null,
      });
      await Promise.resolve();
    });
    expect(screen.getByText("authenticated:new:admin")).toBeInTheDocument();
  });
  it("logout invalidates a still-pending profile lookup", async () => {
    render(
      <AuthProvider>
        <State />
      </AuthProvider>,
    );
    await screen.findByText("unauthenticated:none:none");
    act(() => {
      mocks.listener("SIGNED_IN", session("old"));
    });
    act(() => {
      mocks.listener("SIGNED_OUT", null);
    });
    await act(async () => {
      mocks.profiles.get("old")!({
        data: { user_id: "old", role: "owner" },
        error: null,
      });
      await Promise.resolve();
    });
    expect(screen.getByText("unauthenticated:none:none")).toBeInTheDocument();
  });
});
