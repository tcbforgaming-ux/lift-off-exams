import type { SupabaseClient } from "@supabase/supabase-js";

import { getAuthRedirectTo, sanitizeRedirectPath } from "./redirects";

type EmailPasswordInput = {
  email: string;
  password: string;
};

type SignUpInput = EmailPasswordInput & {
  displayName: string;
};

export async function signUpWithEmail(
  supabase: SupabaseClient,
  { displayName, email, password }: SignUpInput,
) {
  return supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName.trim() || undefined,
      },
      emailRedirectTo: getAuthRedirectTo("/auth/callback"),
    },
  });
}

export async function signInWithEmail(
  supabase: SupabaseClient,
  { email, password }: EmailPasswordInput,
) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithGoogle(
  supabase: SupabaseClient,
  destination?: unknown,
) {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getAuthRedirectTo(
        destination === undefined
          ? "/auth/callback"
          : `/auth/callback?next=${encodeURIComponent(sanitizeRedirectPath(destination))}`,
      ),
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
}

export async function requestPasswordRecovery(supabase: SupabaseClient, email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthRedirectTo("/reset-password"),
  });
}

export async function updatePassword(supabase: SupabaseClient, password: string) {
  return supabase.auth.updateUser({ password });
}
