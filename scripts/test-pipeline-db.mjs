import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { loadPipeline, request } from "./pipeline-test-runtime.mjs";

const url = process.env.VITE_SUPABASE_URL;
if (
  url !== "http://127.0.0.1:58421" ||
  process.env.E2E_DISPOSABLE_PROJECT !== "liftoff-stabilization-disposable"
)
  throw new Error("Marked disposable backend required");
const api = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (target, init) => {
      if (new URL(target).origin !== url)
        throw new Error("External database traffic forbidden");
      return fetch(target, { ...init, redirect: "error" });
    },
  },
});
const { importer } = await loadPipeline();
const results = [];
async function check(name, run) {
  try {
    await run();
    results.push({ name, passed: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error: error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  }
}
async function must(query) {
  const { data, error } = await query;
  assert.equal(
    error?.code,
    undefined,
    `Local database request failed (${error?.code})`,
  );
  return data;
}
const hash = (text) => createHash("sha256").update(text).digest("hex");
async function scenario(count = 1) {
  const id = randomUUID();
  const ids = Array.from({ length: count }, () => randomUUID());
  await must(
    api.from("deca_batch_jobs").insert({
      id,
      status: "completed",
      openai_batch_id: `synthetic-${id}`,
      metadata: { custom_ids: ids },
    }),
  );
  await must(
    api.from("generation_queue_v3").insert(
      ids.map((qid) => ({
        id: qid,
        indicator_code: `P2-${qid}`,
        performance_indicator: "Local fixture indicator",
        partition_key: "Finance",
        category: "Business Law",
        status: "locked",
        locked_by_batch_id: id,
        scenario_needed: 20,
        definition_needed: 20,
        fill_needed: 20,
        all_except_needed: 20,
      })),
    ),
  );
  const questions = ids.map((qid, i) => [
    {
      t: "S",
      q: `Local phase2 ${id} scenario ${i}`,
      o: ["A", "B", "C", "D"],
      a: 0,
      e: "Synthetic explanation",
      d: "E",
    },
    {
      t: "D",
      q: `Local phase2 ${id} definition ${i}`,
      o: ["A", "B", "C", "D"],
      a: 1,
      e: "Synthetic explanation",
      d: "M",
    },
  ]);
  const records = ids.map((qid, i) => ({
    custom_id: qid,
    response: { body: { output_text: JSON.stringify({ questions: questions[i] }) } },
  }));
  let output = records.map((r) => JSON.stringify(r)).join("\n");
  let errorOutput = null;
  let fault = null;
  let reconciles = 0;
  const clients = {
    env: { batchSecret: "synthetic-secret", openAiApiKey: "never-a-real-key" },
    fetch: async (target) =>
      String(target).includes("/batches/")
        ? Response.json({
            status: "completed",
            output_file_id: `file-${id}`,
            error_file_id: errorOutput === null ? null : `errors-${id}`,
          })
        : new Response(String(target).includes(`errors-${id}`) ? errorOutput : output),
    supabase: {
      from: (...args) => api.from(...args),
      async rpc(name, args) {
        if (name === "reconcile_generation_output") {
          reconciles++;
          if (fault === "checkpoint" && reconciles === 2) {
            fault = null;
            return { error: { code: "synthetic" } };
          }
        }
        const result = await api.rpc(name, args);
        if (
          name === "commit_generation_output_line" &&
          !result.error &&
          fault === "ambiguous"
        ) {
          fault = null;
          return { error: { code: "synthetic" } };
        }
        return result;
      },
    },
  };
  return {
    id,
    ids,
    records,
    questions,
    clients,
    setOutput(value) {
      output = value;
    },
    setErrorOutput(value) {
      errorOutput = value;
    },
    setFault(value) {
      fault = value;
    },
    run: (chunk_size = 25) =>
      importer.handleImportDecaBatch(
        request({ batch_job_id: id, chunk_size }),
        clients,
      ),
    job: async () =>
      must(api.from("deca_batch_jobs").select("*").eq("id", id).single()),
    lines: async () =>
      must(
        api
          .from("generation_output_lines")
          .select("*")
          .eq("batch_job_id", id)
          .order("position"),
      ),
    candidates: async () =>
      must(
        api.from("generated_question_candidates").select("id").eq("batch_job_id", id),
      ),
  };
}
await check(
  "actual handler imports valid/malformed/valid across chunk boundaries",
  async () => {
    const s = await scenario(2);
    s.setOutput(
      `\r\n${JSON.stringify(s.records[0])}\r\n\r\n{bad}\n${JSON.stringify(s.records[1])}\n`,
    );
    const first = await (await s.run(1)).json();
    const bad = await (await s.run(1)).json();
    const last = await (await s.run(1)).json();
    assert.equal(first.batches[0].imported_count, 2);
    assert.equal(bad.batches[0].failed_count, 1);
    assert.equal(last.batches[0].imported_count, 2);
    assert.equal(last.batches[0].batch_totals.imported_count, 4);
    const job = await s.job();
    const lines = await s.lines();
    assert.equal(job.imported_count, 4);
    assert.equal(job.failed_count, 1);
    assert.equal(job.metadata.import_outcome, "partial");
    assert.equal(job.metadata.output_processed, true);
    assert.deepEqual(
      lines.map((l) => l.source_line),
      [2, 4, 5],
    );
    assert.equal(lines[1].source_custom_id, null);
    assert.equal(lines[1].failure_code, "invalid_json");
    assert.equal((await s.candidates()).length, 4);
  },
);
await check(
  "candidate commit then checkpoint failure retains original receipt and totals",
  async () => {
    const s = await scenario();
    s.setFault("checkpoint");
    await assert.rejects(s.run(), /checkpoint failure/);
    assert.equal((await s.candidates()).length, 2);
    assert.equal((await s.job()).import_offset, 0);
    const receipt = await must(
      api
        .from("generation_import_receipts")
        .select("id,imported_count,status")
        .eq("batch_job_id", s.id)
        .single(),
    );
    assert.equal(receipt.imported_count, 2);
    await s.run();
    await s.run();
    assert.equal((await s.job()).imported_count, 2);
    assert.equal((await s.candidates()).length, 2);
    const after = await must(
      api
        .from("generation_import_receipts")
        .select("id,imported_count,status")
        .eq("id", receipt.id)
        .single(),
    );
    assert.deepEqual(after, receipt);
  },
);
await check(
  "ambiguous successful candidate response safely reconciles on retry",
  async () => {
    const s = await scenario();
    s.setFault("ambiguous");
    await assert.rejects(s.run());
    assert.equal((await s.candidates()).length, 2);
    await s.run();
    assert.equal((await s.job()).imported_count, 2);
    assert.equal((await s.lines()).length, 1);
  },
);
for (const kind of ["candidate", "line", "quarantine"])
  await check(
    `real ${kind} persistence failure rolls back before checkpoint`,
    async () => {
      const s = await scenario();
      if (kind === "quarantine") s.setOutput(`{bad}\n${JSON.stringify(s.records[0])}`);
      await must(
        api.from("stabilization_pipeline_faults").insert({ job_id: s.id, kind }),
      );
      try {
        await assert.rejects(s.run());
        assert.equal((await s.job()).import_offset, 0);
        assert.equal((await s.lines()).length, 0);
        assert.equal((await s.candidates()).length, 0);
      } finally {
        await must(
          api.from("stabilization_pipeline_faults").delete().eq("job_id", s.id),
        );
      }
      await s.run();
      assert.equal((await s.job()).imported_count, 2);
    },
  );
await check(
  "overlapping actual importer transactions do not double count or duplicate",
  async () => {
    const s = await scenario(2);
    await Promise.all([s.run(), s.run(), s.run()]);
    const job = await s.job();
    assert.equal(job.imported_count, 4);
    assert.equal(job.import_offset, 2);
    assert.equal(job.status, "imported");
    assert.equal((await s.candidates()).length, 4);
    assert.equal((await s.lines()).length, 2);
    const receipts = await must(
      api.from("generation_import_receipts").select("id").eq("batch_job_id", s.id),
    );
    assert.equal(receipts.length, 2);
  },
);
await check(
  "duplicate responses are skipped, while replaying a position preserves counts",
  async () => {
    const s = await scenario();
    const text = JSON.stringify(s.records[0]);
    s.setOutput(`${text}\n${text}`);
    await s.run();
    const job = await s.job();
    assert.equal(job.imported_count, 2);
    assert.equal(job.failed_count, 0);
    assert.equal(job.metadata.skipped_count, 2);
    assert.equal((await s.lines())[1].outcome, "Duplicate");
    const manifest = {
      p_batch_job_id: s.id,
      p_output_file_id: `file-${s.id}`,
      p_record_count: 2,
    };
    const a = await must(api.rpc("reconcile_generation_output", manifest));
    const b = await must(api.rpc("reconcile_generation_output", manifest));
    assert.deepEqual(a, b);
  },
);
await check(
  "stale workers cannot change source identity, counters or terminal progress",
  async () => {
    const s = await scenario();
    await s.run();
    const stale = await api
      .from("deca_batch_jobs")
      .update({ import_offset: 0, imported_count: 0, status: "completed" })
      .eq("id", s.id);
    assert.equal(
      stale.error?.code,
      "PT409",
      `Stale update HTTP ${stale.status}: ${stale.error?.message}`,
    );
    const replay = await api.rpc("commit_generation_output_line", {
      p_batch_job_id: s.id,
      p_output_file_id: `file-${s.id}`,
      p_position: 0,
      p_source_line: 1,
      p_content_hash: hash("changed"),
    });
    assert.equal(
      replay.error?.code,
      "PT409",
      `Stale replay HTTP ${replay.status}: ${replay.error?.message}`,
    );
    assert.equal((await s.job()).imported_count, 2);
  },
);
await check(
  "legacy durable offset is replayed without reinterpretation or duplicate candidates",
  async () => {
    const s = await scenario();
    await must(
      api.rpc("insert_generated_questions", {
        p_queue_id: s.ids[0],
        p_questions: s.questions[0],
        p_import_identity: `${s.id}:${s.ids[0]}`,
      }),
    );
    assert.equal((await s.job()).import_offset, 1);
    await s.run();
    const job = await s.job();
    assert.equal(job.metadata.legacy_checkpoint, 1);
    assert.equal(job.import_offset, 1);
    assert.equal(job.imported_count, 2);
    assert.equal((await s.candidates()).length, 2);
  },
);
await check("partial legacy receipt preserves committed original counts", async () => {
  const s = await scenario();
  await must(
    api.from("generation_import_receipts").insert({
      batch_job_id: s.id,
      queue_id: s.ids[0],
      import_identity: `${s.id}:${s.ids[0]}`,
      source_custom_id: s.ids[0],
      status: "Partial",
      imported_count: 1,
      failed_count: 1,
      skipped_count: 1,
    }),
  );
  await s.run();
  const job = await s.job();
  assert.equal(job.imported_count, 1);
  assert.equal(job.failed_count, 1);
  assert.equal(job.metadata.skipped_count, 1);
  assert.equal(job.metadata.import_outcome, "partial");
});
await check(
  "unknown IDs and question validation failures are durable without partial candidates",
  async () => {
    const s = await scenario();
    const invalid = {
      ...s.records[0],
      response: {
        body: {
          output_text: JSON.stringify({ questions: [s.questions[0][0], { t: "bad" }] }),
        },
      },
    };
    const unknown = { ...s.records[0], custom_id: randomUUID() };
    s.setOutput(`${JSON.stringify(invalid)}\n${JSON.stringify(unknown)}`);
    await s.run();
    assert.equal((await s.candidates()).length, 0);
    const lines = await s.lines();
    assert.deepEqual(
      lines.map((l) => l.failure_code),
      ["question_validation", "unknown_custom_id"],
    );
    const job = await s.job();
    assert.equal(job.status, "failed");
    assert.equal(job.metadata.output_processed, true);
    assert.equal(job.failed_count, 2);
  },
);
await check(
  "completed output and provider error files both receive durable outcomes",
  async () => {
    const s = await scenario(2);
    s.setOutput(JSON.stringify(s.records[0]));
    s.setErrorOutput(
      JSON.stringify({
        custom_id: s.ids[1],
        error: { message: "Sanitized provider failure" },
      }),
    );
    await s.run(1);
    assert.equal((await s.job()).status, "completed");
    await s.run(1);
    const job = await s.job();
    assert.equal(job.imported_count, 2);
    assert.equal(job.failed_count, 1);
    assert.equal(job.metadata.output_sources.length, 2);
    assert.equal(job.metadata.import_outcome, "partial");
    assert.equal((await s.lines())[1].failure_code, "record_error");
    const changed = await api.rpc("register_generation_output_sources", {
      p_batch_job_id: s.id,
      p_sources: [{ file_id: `file-${s.id}`, record_count: 1 }],
    });
    assert.equal(changed.error?.code, "PT409");
    const omitted = await api.rpc("reconcile_generation_output", {
      p_batch_job_id: s.id,
      p_output_file_id: `file-${s.id}`,
      p_record_count: 1,
    });
    assert.equal(omitted.error?.code, "PT409");
  },
);
await check(
  "corrupt legacy offset fails closed without guessing historical totals",
  async () => {
    const s = await scenario();
    await must(
      api.from("deca_batch_jobs").update({ import_offset: 99 }).eq("id", s.id),
    );
    await assert.rejects(s.run(), /checkpoint failure/);
    assert.equal((await s.job()).import_offset, 99);
    assert.equal((await s.candidates()).length, 0);
  },
);
await check(
  "conflicting duplicate content preserves the original receipt and reports a new failure",
  async () => {
    const s = await scenario();
    const changed = {
      ...s.records[0],
      response: {
        body: {
          output_text: JSON.stringify({
            questions: [
              { ...s.questions[0][0], q: "Different synthetic source content" },
              s.questions[0][1],
            ],
          }),
        },
      },
    };
    s.setOutput(`${JSON.stringify(s.records[0])}\n${JSON.stringify(changed)}`);
    const body = await (await s.run()).json();
    assert.equal(body.batches[0].imported_count, 2);
    assert.equal(body.batches[0].failed_count, 1);
    assert.equal((await s.job()).imported_count, 2);
    assert.equal((await s.job()).failed_count, 1);
    assert.equal((await s.candidates()).length, 2);
    assert.equal((await s.lines())[1].failure_code, "duplicate_conflict");
  },
);
await check(
  "partial candidate insertion preserves a pre-existing candidate and original skip counts",
  async () => {
    const s = await scenario();
    const q = s.questions[0][0];
    await must(
      api.from("generated_question_candidates").insert({
        batch_job_id: s.id,
        source_custom_id: s.ids[0],
        import_identity: `${s.id}:${s.ids[0]}:1`,
        question_type: "Scenario",
        question_text: q.q,
        options: q.o.map((text, i) => ({ id: "ABCD"[i], text })),
        correct_option_id: "A",
        explanation: q.e,
        difficulty: "Easy",
        partition_keys: ["Finance"],
        question_hash: hash(q.q.toLowerCase().trim()),
        validation_status: "Valid",
      }),
    );
    const response = await (await s.run()).json();
    const job = await s.job();
    assert.equal(response.batches[0].imported_count, 1);
    assert.equal(response.batches[0].skipped_count, 1);
    assert.equal(job.imported_count, 1);
    assert.equal(job.metadata.skipped_count, 1);
    assert.equal((await s.candidates()).length, 2);
    assert.equal((await s.lines())[0].outcome, "Partial");
  },
);
fs.mkdirSync("test-results", { recursive: true });
fs.writeFileSync(
  "test-results/pipeline-db-results.json",
  JSON.stringify(
    { environment: "real disposable local Supabase; mocked vendor transport", results },
    null,
    2,
  ) + "\n",
);
process.exitCode = results.some((r) => !r.passed) ? 1 : 0;
