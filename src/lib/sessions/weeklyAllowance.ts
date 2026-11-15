import { getSupabaseBrowserClient } from "../supabase/browserClient";
import type { Database } from "../supabase/database.types";

export type WeeklyAllowance =
  Database["public"]["Functions"]["get_my_weekly_activity_allowance"]["Returns"][number];

export async function fetchWeeklyAllowance(): Promise<WeeklyAllowance> {
  const { data, error } = await getSupabaseBrowserClient()
    .rpc("get_my_weekly_activity_allowance")
    .single();
  if (error) throw new Error(error.message);
  return data;
}
