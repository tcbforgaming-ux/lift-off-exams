import { createClient } from "@supabase/supabase-js";
import {
  api as verificationApi,
  project as verificationProject,
} from "../../scripts/verification-target.mjs";
import type { Database } from "../../src/lib/supabase/database.types";
import { fixture } from "./global-setup";

export function localService() {
  if (
    process.env.VITE_SUPABASE_URL !== verificationApi ||
    process.env.E2E_DISPOSABLE_PROJECT !== verificationProject
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
