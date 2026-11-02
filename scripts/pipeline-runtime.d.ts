declare namespace Deno {
  const env: { get(name: string): string | undefined };
}
declare module "https://deno.land/std@0.224.0/http/server.ts" {
  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void;
}
declare module "npm:@supabase/supabase-js@2" {
  import type * as sdk from "@supabase/supabase-js";
  export const createClient: typeof sdk.createClient;
  export type SupabaseClient = sdk.SupabaseClient;
}
