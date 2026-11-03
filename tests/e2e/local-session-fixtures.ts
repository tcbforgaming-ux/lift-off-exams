import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
import { fixture } from "./global-setup";

export function localService() {
  if (
    process.env.VITE_SUPABASE_URL !== "http://127.0.0.1:58421" ||
    process.env.E2E_DISPOSABLE_PROJECT !== "liftoff-stabilization-disposable"
  )
    throw new Error("Marked disposable backend required");
  return createClient<Database>(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function createSessionUser(prefix: string) {
  const email = `${prefix}-${crypto.randomUUID()}@example.test`;
  const result = await localService().auth.admin.createUser({
    email,
    password: fixture.password,
    email_confirm: true,
  });
  if (result.error || !result.data.user)
    throw result.error ?? new Error("Missing local user");
  return { email, id: result.data.user.id };
}
