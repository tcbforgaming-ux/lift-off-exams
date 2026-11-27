import fs from "node:fs";
import {
  workDirectory,
  api as verificationApi,
  project as verificationProject,
} from "./verification-target.mjs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const api = process.env.ACCOUNT_ERASURE_LOCAL_API;
const key = process.env.ACCOUNT_ERASURE_LOCAL_SERVICE_KEY;
const work = path.join(process.cwd(), ".tmp", workDirectory);
const marker = JSON.parse(fs.readFileSync(path.join(work, "disposable.json"), "utf8"));
if (
  api !== verificationApi ||
  !key ||
  marker.root !== process.cwd() ||
  marker.project !== verificationProject ||
  fs.existsSync(path.join(work, "supabase", ".temp", "project-ref"))
) {
  throw new Error("Account erasure only runs on the marked local verification stack.");
}

const db = createClient(api, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: jobs, error } = await db.rpc("list_due_account_erasure_jobs");
if (error) throw new Error("Could not list local erasure jobs.");
const results = {};
for (const job of jobs ?? []) {
  for (let step = 0; step < 4; step++) {
    const { data, error: failure } = await db.rpc("advance_account_erasure", {
      p_job: job,
    });
    const result = failure ? "blocked" : data;
    results[result] = (results[result] ?? 0) + 1;
    if (!["claimed", "billing_captured", "billing_checkpointed"].includes(result))
      break;
  }
}
console.log("Local synthetic account erasure results:", results);
if (Object.keys(results).some((name) => name === "blocked" || name.endsWith("_failed")))
  process.exitCode = 1;
