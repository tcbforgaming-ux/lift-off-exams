import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  assertNoSchemaDrift,
  assertGeneratedTypesMatch,
} from "./verification-contracts.mjs";

const root = process.cwd();
const work = path.join(root, ".tmp", "isolated-verification-backend");
const project = "liftoff-verification-isolated";
const marker = path.join(work, "disposable.json");
const mode = process.argv[2] ?? "database";
const repair = "20261018000100_stabilize_permission_boundaries.sql";
const api = "http://127.0.0.1:58431";
const executable = (name) =>
  process.platform === "win32" && name === "pnpm" ? "pnpm.cmd" : name;

function run(name, args, { capture = false, input, env = process.env } = {}) {
  const result = spawnSync(executable(name), args, {
    cwd: root,
    env,
    encoding: "utf8",
    input,
    stdio: capture || input !== undefined ? ["pipe", "pipe", "pipe"] : "inherit",
    shell: process.platform === "win32" && name === "pnpm",
  });
  if (result.error || result.status !== 0) {
    // Never include status output: it contains local keys.
    if (!capture && result.stderr) process.stderr.write(result.stderr);
    throw new Error(
      `${name} ${args[0]} failed (${result.status ?? result.error?.code})`,
    );
  }
  return result.stdout ?? "";
}
const cli = (...args) => run("supabase", ["--workdir", work, ...args]);
function checkMarker() {
  if (
    !fs.existsSync(marker) ||
    fs.readFileSync(marker, "utf8") !== JSON.stringify({ root, project })
  ) {
    throw new Error("Disposable-stack identity mismatch; no database command was run.");
  }
  if (fs.existsSync(path.join(work, "supabase", ".temp", "project-ref"))) {
    throw new Error("A linked project is forbidden in the verification directory.");
  }
}
function prepare(includeRepair) {
  fs.mkdirSync(work, { recursive: true });
  if (fs.existsSync(marker)) checkMarker();
  else {
    if (fs.existsSync(path.join(work, "supabase")))
      throw new Error("Unidentified stack directory.");
    const containers = run("docker", ["ps", "-a", "--format", "{{.Names}}"], {
      capture: true,
    });
    const volumes = run("docker", ["volume", "ls", "--format", "{{.Name}}"], {
      capture: true,
    });
    if (
      `${containers}\n${volumes}`
        .split(/\r?\n/)
        .some((name) => name.endsWith(`_${project}`))
    ) {
      throw new Error(
        "An unmarked stack or volume already uses the disposable project name; refusing to adopt it.",
      );
    }
    fs.writeFileSync(marker, JSON.stringify({ root, project }));
  }
  const target = path.join(work, "supabase");
  fs.mkdirSync(path.join(target, "migrations"), { recursive: true });
  fs.mkdirSync(path.join(target, "tests", "database"), { recursive: true });
  for (const file of fs.readdirSync(path.join(root, "supabase", "migrations"))) {
    if (!file.endsWith(".sql")) continue;
    const destination = path.join(target, "migrations", file);
    if (file >= repair && !includeRepair) {
      if (fs.existsSync(destination)) fs.unlinkSync(destination);
    } else
      fs.copyFileSync(path.join(root, "supabase", "migrations", file), destination);
  }
  for (const file of fs.readdirSync(path.join(root, "supabase", "tests", "database"))) {
    if (file.endsWith(".sql"))
      fs.copyFileSync(
        path.join(root, "supabase", "tests", "database", file),
        path.join(target, "tests", "database", file),
      );
  }
  // Separate project, volumes, ports and config. Never copy .env, .temp or linked metadata.
  fs.writeFileSync(
    path.join(target, "config.toml"),
    `project_id = "${project}"
[api]
enabled = true
port = 58431
schemas = ["public", "graphql_public"]
extra_search_path = ["public", "extensions"]
[db]
port = 58432
shadow_port = 58439
major_version = 15
[studio]
enabled = false
[local_smtp]
enabled = false
[analytics]
enabled = false
[storage]
enabled = false
[edge_runtime]
enabled = false
[auth]
enabled = true
site_url = "http://127.0.0.1:4175"
additional_redirect_urls = ["http://127.0.0.1:4175/**"]
[auth.email]
enable_signup = true
enable_confirmations = false
`,
  );
  checkMarker();
}
function status() {
  checkMarker();
  const output = run("supabase", ["--workdir", work, "status", "-o", "env"], {
    capture: true,
  });
  const values = Object.fromEntries(
    [...output.matchAll(/^([A-Z_]+)="(.*)"$/gm)].map((match) => [match[1], match[2]]),
  );
  if (values.API_URL !== api)
    throw new Error("Unexpected API target; refusing mutation.");
  const db = new URL(values.DB_URL);
  if (
    db.hostname !== "127.0.0.1" ||
    db.port !== "58432" ||
    db.pathname !== "/postgres"
  ) {
    throw new Error("Unexpected database target; refusing mutation.");
  }
  return values;
}
function start() {
  checkMarker();
  // CLI start prints local credentials on success. Consume, never log them.
  run("supabase", ["--workdir", work, "start"], { capture: true });
  console.log("Disposable Supabase stack started (credentials suppressed).");
  status();
}
function reset() {
  status();
  const nonFixture = run(
    "docker",
    [
      "exec",
      `supabase_db_${project}`,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-At",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      "select count(*) from auth.users where email is null or email not like '%@example.test'",
    ],
    { capture: true },
  ).trim();
  if (nonFixture !== "0")
    throw new Error(
      "Non-fixture accounts found; refusing to reset verification database.",
    );
  cli("db", "reset", "--local");
}
function sql(file) {
  status();
  run(
    "docker",
    [
      "exec",
      "-i",
      `supabase_db_${project}`,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
    ],
    { input: fs.readFileSync(file, "utf8") },
  );
}
try {
  if (mode === "stop") {
    checkMarker();
    cli("stop"); // Keep disposable volumes for failure diagnosis; never stop another stack.
  } else if (mode === "inventory") {
    status();
    const inventory = run(
      "docker",
      [
        "exec",
        "-i",
        `supabase_db_${project}`,
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-At",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      {
        capture: true,
        input: fs.readFileSync(
          path.join(root, "scripts/permission-inventory.sql"),
          "utf8",
        ),
      },
    );
    JSON.parse(inventory);
    fs.mkdirSync(path.join(root, "docs/stabilization"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "docs/stabilization/local-permission-inventory.json"),
      inventory,
    );
    console.log("Wrote read-only local permission inventory (catalogs only).");
  } else if (mode === "upgrade") {
    prepare(true);
    status();
    cli("migration", "up", "--local");
  } else if (mode === "pipeline") {
    const values = status();
    sql(path.join(root, "scripts/pipeline-db-fixtures.sql"));
    try {
      run("node", ["--experimental-vm-modules", "scripts/test-pipeline-db.mjs"], {
        env: {
          ...process.env,
          VITE_SUPABASE_URL: api,
          SUPABASE_SERVICE_ROLE_KEY: values.SERVICE_ROLE_KEY,
          E2E_DISPOSABLE_PROJECT: project,
        },
      });
    } finally {
      sql(path.join(root, "scripts/pipeline-db-cleanup.sql"));
    }
  } else if (mode === "e2e") {
    const values = status();
    run("pnpm", ["exec", "playwright", "test", ...process.argv.slice(3)], {
      env: {
        ...process.env,
        VITE_SUPABASE_URL: api,
        VITE_SUPABASE_ANON_KEY: values.ANON_KEY,
        SUPABASE_SERVICE_ROLE_KEY: values.SERVICE_ROLE_KEY,
        VITE_APP_ENV: "local",
        E2E_LOCAL_ONLY: "true",
        E2E_DISPOSABLE_PROJECT: project,
        E2E_RUN_ID: Date.now().toString(),
      },
    });
  } else if (mode === "database" || mode === "hosted" || mode === "prepare") {
    prepare(mode !== "hosted");
    start();
    reset();
    if (mode === "hosted") {
      sql(path.join(root, "supabase", "tests", "hosted", "baseline.sql"));
      prepare(true);
      cli("migration", "up", "--local");
    }
    if (mode === "prepare") {
      console.log("Disposable backend ready for browser tests.");
      process.exit(0);
    }
    cli("test", "db");
    if (mode === "hosted") {
      cli(
        "test",
        "db",
        path.join(root, "supabase", "tests", "hosted", "contracts.sql"),
      );
    } else {
      const drift = run(
        "supabase",
        ["--workdir", work, "db", "diff", "--local", "--schema", "public"],
        { capture: true },
      );
      fs.writeFileSync(path.join(work, "schema-diff.sql"), drift);
      assertNoSchemaDrift(drift);
      console.log("Public schema drift check: identical.");
      const generated = run(
        "supabase",
        [
          "--workdir",
          work,
          "gen",
          "types",
          "typescript",
          "--local",
          "--schema",
          "public",
        ],
        { capture: true },
      );
      fs.writeFileSync(path.join(work, "database.types.ts"), generated);
      const tracked = fs.readFileSync(
        path.join(root, "src/lib/supabase/database.types.ts"),
        "utf8",
      );
      assertGeneratedTypesMatch(generated, tracked);
      console.log("Generated type comparison: identical.");
    }
  } else throw new Error(`Unknown verification mode: ${mode}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
