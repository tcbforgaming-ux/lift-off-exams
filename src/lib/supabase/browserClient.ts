import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getClientEnv } from "../env";
import { SESSION_BOOTSTRAP_TIMEOUT_MS } from "../auth/sessionDeadline";
import type { Database } from "./database.types";

let browserClient: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const env = getClientEnv();
  browserClient = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    global: {
      fetch: (input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        if (!url.includes("/auth/v1/token?grant_type=refresh_token"))
          return fetch(input, init);
        // Release the SDK's refresh lock even if the network never responds.
        const deadline = AbortSignal.timeout(SESSION_BOOTSTRAP_TIMEOUT_MS);
        const callerSignal =
          init?.signal ?? (input instanceof Request ? input.signal : null);
        return fetch(input, {
          ...init,
          signal: callerSignal ? AbortSignal.any([callerSignal, deadline]) : deadline,
        });
      },
    },
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });

  return browserClient;
}
