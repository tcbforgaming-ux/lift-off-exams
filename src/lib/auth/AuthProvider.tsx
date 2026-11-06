import type { Session } from "@supabase/supabase-js";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getSupabaseBrowserClient } from "../supabase/browserClient";
import type { Profile } from "../supabase/types";
import { AuthContext, type AuthContextValue, type AuthStatus } from "./AuthContext";
import { isKnownAppRole } from "./roles";
import { withSessionDeadline } from "./sessionDeadline";

type AuthProviderProps = {
  children: ReactNode;
};

async function loadProfile(userId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "user_id,display_name,phone,role,account_tier,owner_state,owner_state_updated_at,last_owner_activity_at,suspended_until,created_at,updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error?.details === "account_recovery_only") return "recovering" as const;
  if (error) throw error;
  return data as Profile | null;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);

  const applySession = useCallback(async (nextSession: Session | null) => {
    const requestRevision = ++revision.current;
    setSession(nextSession);
    setError(null);

    if (!nextSession?.user) {
      setProfile(null);
      setStatus("unauthenticated");
      return;
    }

    setStatus("loading");
    setProfile(null);

    try {
      const nextProfile = await withSessionDeadline(loadProfile(nextSession.user.id));
      if (revision.current !== requestRevision) return;
      if (nextProfile === "recovering") {
        setStatus("recovering");
        return;
      }
      setProfile(nextProfile);
      setStatus(nextProfile ? "authenticated" : "error");
      setError(nextProfile ? null : "Your profile is still being prepared.");
    } catch {
      if (revision.current !== requestRevision) return;
      setProfile(null);
      setStatus("error");
      setError("We could not load your account profile.");
    }
  }, []);

  const retrySession = useCallback(() => {
    const requestRevision = ++revision.current;
    setStatus("loading");
    setProfile(null);
    setError(null);
    void withSessionDeadline(getSupabaseBrowserClient().auth.getSession())
      .then(({ data, error: sessionError }) => {
        if (revision.current !== requestRevision) return;
        if (sessionError) throw sessionError;
        return applySession(data.session);
      })
      .catch(() => {
        if (revision.current !== requestRevision) return;
        setStatus("error");
        setError("We could not verify your session.");
      });
  }, [applySession]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let mounted = true;
    const requestEpoch = revision;
    retrySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // getSession owns bootstrap, including errors and the retry generation.
      if (!mounted || event === "INITIAL_SESSION") return;
      void applySession(nextSession);
    });

    return () => {
      mounted = false;
      ++requestEpoch.current;
      subscription.unsubscribe();
    };
  }, [applySession, retrySession]);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    const requestRevision = revision.current;
    const nextProfile = await withSessionDeadline(loadProfile(session.user.id));
    if (!nextProfile || revision.current !== requestRevision)
      throw new Error("Your profile could not be refreshed.");
    if (nextProfile === "recovering") {
      setProfile(null);
      setStatus("recovering");
      return;
    }
    setProfile(nextProfile);
    setStatus("authenticated");
  }, [session?.user]);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const result = await supabase.auth.signOut();
    if (!result.error) {
      ++revision.current;
      setSession(null);
      setProfile(null);
      setStatus("unauthenticated");
    }
    return result;
  }, []);

  const role =
    !profile || !isKnownAppRole(profile.role)
      ? null
      : profile.suspended_until === "infinity" ||
          (profile.suspended_until && Date.parse(profile.suspended_until) >= Date.now())
        ? "student"
        : profile.role === "owner" &&
            profile.owner_state &&
            profile.owner_state !== "active"
          ? "admin"
          : profile.role;
  useEffect(() => {
    if (role !== "owner" || !session?.user.id) return;
    const record = async () => {
      await getSupabaseBrowserClient().rpc("record_owner_activity");
    };
    void record().catch(() => undefined);
  }, [role, session?.user.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      profile,
      role,
      error,
      retrySession,
      refreshProfile,
      signOut,
    }),
    [error, profile, refreshProfile, retrySession, role, session, signOut, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
