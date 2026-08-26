export type Json =
  string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = "student" | "admin" | "owner";
export type AccountTier = "free" | "premium";
export type OwnerState =
  | "active"
  | "self_suspended"
  | "inactive_suspended"
  | "governance_suspended"
  | "unavailable";

export type Profile = {
  user_id: string;
  display_name: string | null;
  phone: string | null;
  role: AppRole;
  account_tier: AccountTier;
  owner_state: OwnerState;
  owner_state_updated_at: string;
  last_owner_activity_at: string;
  suspended_until: string | null;
  created_at: string;
  updated_at: string;
};
