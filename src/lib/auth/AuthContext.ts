import { createContext } from "react";
import type { AuthError, Session, User } from "@supabase/supabase-js";

import type { AppRole, Profile } from "../supabase/types";

export type AuthStatus =
  | "loading"
  | "authenticated"
  | "recovering"
  | "suspended"
  | "unauthenticated"
  | "error";

export type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  error: string | null;
  retrySession: () => void;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<{ error: AuthError | null }>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
