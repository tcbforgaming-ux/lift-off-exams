import { getSupabaseBrowserClient } from "../supabase/browserClient";
export type Suspension = {
  id: string;
  user_id: string;
  reason: string;
  created_at: string;
  expires_at: string | null;
  closed_at: string | null;
  version: number;
  appeal: string | null;
  appeal_at: string | null;
  appeal_decision: string | null;
  decision_reason: string | null;
  display_name?: string;
  active?: boolean;
};
export async function moderationRpc<T>(
  name: string,
  args: Record<string, unknown> = {},
) {
  const client = getSupabaseBrowserClient() as unknown as {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
  };
  const r = await client.rpc(name, args);
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}
