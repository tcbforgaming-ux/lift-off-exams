import assert from "node:assert/strict";
import fs from "node:fs";
import { loadPipeline, request } from "./pipeline-test-runtime.mjs";

const { shared, importer, starter } = await loadPipeline();
const fixture = (name) =>
  fs.readFileSync(`supabase/functions/fixtures/deca-batch/${name}`, "utf8");
const valid = fixture("valid-completed.jsonl");
const firstRecord = shared.parseBatchOutputJsonl(valid)[0];
const fixtureQuestionCount = shared.parseGeneratedQuestions(
  shared.extractResponseText(firstRecord.response.body),
).length;
const firstId = firstRecord.custom_id;
const secondId = "70000000-0000-0000-0000-000000000002";
const second = valid.trim().replaceAll(firstId, secondId);
const results = [];
async function check(id, expected, run) {
  try {
    await run();
    results.push({ id, verdict: "VERIFIED", expected });
  } catch (error) {
    results.push({ id, verdict: "BROKEN", expected, observed: error.message });
  }
}

// In-memory transport model, not proof of DB atomicity. Separate integration
// tests invoke these same handlers against the marked local PostgreSQL backend.
function model(output = valid, options = {}) {
  const job = {
    id: "00000000-0000-4000-8000-000000000201",
    openai_batch_id: "batch-synthetic",
    output_file_id: "file-synthetic",
    status: "completed",
    metadata: {},
    import_offset: 0,
    imported_count: 0,
    failed_count: 0,
  };
  const lines = new Map();
  const receipts = new Map();
  let fail = options.fail;
  let attempts = 0;
  const reconcile = () => {
    job.import_offset = lines.size;
    job.imported_count = [...receipts.values()].reduce(
      (n, r) => n + r.imported_count,
      0,
    );
    job.failed_count = [...lines.values()].filter((l) => l.outcome === "Failed").length;
    const total = shared.parseBatchOutputJsonl(output).length;
    job.status =
      lines.size < total
        ? "completed"
        : job.failed_count && job.imported_count === 0
          ? "failed"
          : "imported";
    job.metadata = { output_ledger_version: 1 };
    return {
      ...job,
      skipped_count: [...lines.values()].reduce((n, l) => n + l.skipped_count, 0),
      processed_count: lines.size,
      remaining_count: total - lines.size,
      import_outcome:
        lines.size < total ? "pending" : job.failed_count ? "partial" : "success",
    };
  };
  const clients = {
    env: { batchSecret: "synthetic-secret", openAiApiKey: "not-a-real-key" },
    fetch: async (url) =>
      String(url).includes("/batches/")
        ? Response.json({ status: "completed", output_file_id: job.output_file_id })
        : new Response(output),
    supabase: {
      from() {
        const q = {
          select() {
            return q;
          },
          not() {
            return q;
          },
          in() {
            return q;
          },
          order() {
            return q;
          },
          limit() {
            return q;
          },
          eq() {
            return q;
          },
          then(resolve, reject) {
            return Promise.resolve({ data: [{ ...job }], error: null }).then(
              resolve,
              reject,
            );
          },
        };
        return q;
      },
      async rpc(name, args) {
        if (name === "register_generation_output_sources")
          return { data: null, error: null };
        if (name === "reconcile_generation_output") {
          if (fail === "checkpoint" && lines.size) {
            fail = null;
            return { error: { message: "checkpoint failure" } };
          }
          return { data: reconcile(), error: null };
        }
        assert.equal(name, "commit_generation_output_line");
        attempts++;
        if (
          fail === "before_commit" ||
          (fail === "quarantine" && args.p_failure_code)
        ) {
          fail = null;
          return { error: { message: "simulated persistence failure" } };
        }
        if (lines.has(args.p_position))
          return { data: lines.get(args.p_position), error: null };
        assert.equal(args.p_position, lines.size);
        let failure = args.p_failure_code;
        if (!failure && ![firstId, secondId].includes(args.p_custom_id))
          failure = "unknown_custom_id";
        if (
          !failure &&
          (!Array.isArray(args.p_questions) || args.p_questions.some((q) => !q.t))
        )
          failure = "question_validation";
        const prior = receipts.get(args.p_custom_id);
        const count = args.p_questions?.length ?? 0;
        const line = {
          outcome: failure ? "Failed" : prior ? "Duplicate" : "Imported",
          failure_code: failure,
          imported_count: failure || prior ? 0 : count,
          skipped_count: prior && !failure ? count : 0,
        };
        if (!failure && !prior)
          receipts.set(args.p_custom_id, { imported_count: count });
        lines.set(args.p_position, line);
        if (fail === "ambiguous_commit") {
          fail = null;
          return { error: { message: "response lost after commit" } };
        }
        return { data: line, error: null };
      },
    },
  };
  return {
    job,
    lines,
    receipts,
    clients,
    get attempts() {
      return attempts;
    },
    run: (chunk_size = 25) =>
      importer.handleImportDecaBatch(request({ chunk_size }), clients),
  };
}
await check("P1", "valid repository output fixture parses", () =>
  assert.ok(shared.parseBatchOutputJsonl(valid).length > 0),
);
await check("P2", "duplicate input custom IDs are rejected", () =>
  assert.throws(() =>
    shared.validateJsonl('{"custom_id":"fixture"}\n{"custom_id":"fixture"}'),
  ),
);
await check("P3", "batch authorization rejects a missing scheduler secret", () =>
  assert.equal(
    shared.authorizeBatchRequest(
      new Request("http://audit.invalid"),
      "synthetic-secret",
    ).status,
    401,
  ),
);
await check(
  "P4",
  "one malformed output line does not discard otherwise valid output records",
  () =>
    assert.doesNotThrow(() =>
      shared.parseBatchOutputJsonl(valid + "\n{malformed-json}"),
    ),
);
const retry = model(valid, { fail: "checkpoint" });
await check("P5", "a simulated failed job checkpoint is surfaced", async () =>
  assert.rejects(retry.run(), /checkpoint failure/),
);
await check(
  "P6",
  "retry after a successful candidate commit preserves imported counters",
  async () => {
    await retry.run();
    assert.equal(
      retry.job.imported_count,
      fixtureQuestionCount,
      "Durable committed work was lost during replay",
    );
    assert.equal(retry.receipts.size, 1);
  },
);
await check(
  "P7",
  "partial-success fixture retains successful and failed records",
  () => {
    const records = shared.parseBatchOutputJsonl(fixture("partial-success.jsonl"));
    assert.equal(records.length, 2);
    assert.ok(records[1].error);
  },
);
await check("P8", "missing-model-text fixture is recognized as missing text", () =>
  assert.equal(
    shared.extractResponseText(
      shared.parseBatchOutputJsonl(fixture("missing-model-text.jsonl"))[0].response
        .body,
    ),
    null,
  ),
);
await check("P9", "malformed model JSON fixture is rejected", () =>
  assert.throws(() =>
    shared.parseGeneratedQuestions(
      shared.extractResponseText(
        shared.parseBatchOutputJsonl(fixture("malformed-json.jsonl"))[0].response.body,
      ),
    ),
  ),
);
await check("P10", "duplicate output fixture retains stable receipt identity", () => {
  const records = shared.parseBatchOutputJsonl(fixture("duplicate-custom-id.jsonl"));
  assert.equal(records.length, 2);
  assert.equal(records[0].custom_id, records[1].custom_id);
});
const forbidden = {
  env: { batchSecret: "synthetic-secret" },
  supabase: new Proxy(
    {},
    {
      get() {
        throw new Error("Unauthorized database access");
      },
    },
  ),
  fetch() {
    throw new Error("Live network forbidden");
  },
};
await check(
  "P11",
  "actual starter denies unauthorized requests before any side effect",
  async () =>
    assert.equal(
      (
        await starter.handleStartDecaBatch(
          new Request("http://audit.invalid", { method: "POST" }),
          forbidden,
        )
      ).status,
      401,
    ),
);
await check(
  "P12",
  "actual importer denies unauthorized requests before any side effect",
  async () =>
    assert.equal(
      (
        await importer.handleImportDecaBatch(
          new Request("http://audit.invalid", { method: "POST" }),
          forbidden,
        )
      ).status,
      401,
    ),
);
for (const [id, output, failures] of [
  ["mixed", `${valid.trim()}\n{broken}\n${second}`, 1],
  ["first-last", `{bad}\n${valid.trim()}\n{bad}`, 2],
  ["boundary", `{bad}\n${valid.trim()}\n{bad}\n${second}\n{bad}`, 3],
  ["blank-crlf", `\r\n ${valid.trim()} \r\n\r\n${second}\r\n`, 0],
  ["envelope", `${valid.trim()}\nnull\n[]\n{}\n${second}`, 3],
  ["missing-id", `${JSON.stringify({ response: firstRecord.response })}\n${second}`, 1],
  [
    "unknown-id",
    `${valid.trim().replaceAll(firstId, "90000000-0000-0000-0000-000000000099")}\n${second}`,
    1,
  ],
  ["duplicates", `${valid.trim()}\n${valid.trim()}`, 0],
  ["record-error", fixture("partial-success.jsonl"), 1],
  ["model-error", `${fixture("malformed-json.jsonl")}\n${second}`, 1],
])
  await check(
    `L-${id}`,
    "actual importer processes bounded surrounding records and stable outcomes",
    async () => {
      const m = model(output);
      const total = shared.parseBatchOutputJsonl(output).length;
      for (let n = 0; n < total; n++) await m.run(1);
      const prior = JSON.stringify([...m.lines]);
      await m.run(1);
      assert.equal(m.lines.size, total);
      assert.equal(m.job.failed_count, failures);
      assert.equal(JSON.stringify([...m.lines]), prior);
      assert.ok(m.job.imported_count > 0);
    },
  );
for (const failure of ["before_commit", "quarantine", "ambiguous_commit"])
  await check(
    `R-${failure}`,
    "persistence failure retries without losing committed work or counting twice",
    async () => {
      const m = model(failure === "quarantine" ? `{broken}\n${valid.trim()}` : valid, {
        fail: failure,
      });
      await assert.rejects(m.run());
      await m.run();
      const count = m.job.imported_count;
      await m.run();
      assert.equal(m.job.imported_count, fixtureQuestionCount);
      assert.equal(m.job.imported_count, count);
      assert.equal(m.receipts.size, 1);
    },
  );
await check(
  "positions",
  "offsets retain nonblank ordinal while source positions retain physical lines",
  () => {
    const lines = shared.parseBatchOutputJsonl(`\n${valid.trim()}\r\n\n{broken}\n`);
    assert.equal(lines[0].position, 0);
    assert.equal(lines[0].source_line, 2);
    assert.equal(lines[1].position, 1);
    assert.equal(lines[1].source_line, 4);
  },
);
fs.mkdirSync("test-results", { recursive: true });
fs.writeFileSync(
  "test-results/pipeline-results.json",
  JSON.stringify(
    {
      environment: "isolated VM; injected clients; NO real backend atomicity claim",
      results,
    },
    null,
    2,
  ) + "\n",
);
for (const row of results) console.log(`${row.id}: ${row.verdict} - ${row.expected}`);
process.exitCode = results.some((r) => r.verdict === "BROKEN") ? 1 : 0;
