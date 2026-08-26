import type { Session } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { getSupabaseBrowserClient } from "../supabase/browserClient";
import type { Profile } from "../supabase/types";
import { AuthContext, type AuthContextValue, type AuthStatus } from "./AuthContext";
import { isKnownAppRole } from "./roles";

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

  if (error) throw error;
  return data as Profile | null;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applySession = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    setError(null);

    if (!nextSession?.user) {
      setProfile(null);
      setStatus("unauthenticated");
      return;
    }

    try {
      const nextProfile = await loadProfile(nextSession.user.id);
      setProfile(nextProfile);
      setStatus(nextProfile ? "authenticated" : "error");
      setError(
        nextProfile ? null : "Your profile is still being prepared. Try refreshing.",
      );
    } catch {
      setProfile(null);
      setStatus("error");
      setError("We could not load your account profile.");
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let mounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        void applySession(data.session);
      })
      .catch(() => {
        if (!mounted) return;
        setStatus("error");
        setError("We could not read your session.");
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      void applySession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    const nextProfile = await loadProfile(session.user.id);
    setProfile(nextProfile);
  }, [session?.user]);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const result = await supabase.auth.signOut();
    if (!result.error) {
      setSession(null);
      setProfile(null);
      setStatus("unauthenticated");
    }
    return result;
  }, []);

  const role = isKnownAppRole(profile?.role) ? profile.role : null;
  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      profile,
      role,
      error,
      refreshProfile,
      signOut,
    }),
    [error, profile, refreshProfile, role, session, signOut, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
