import { createHash } from "node:crypto";

export function assertNoSchemaDrift(sql) {
  if (sql.trimStart().startsWith("{")) {
    const result = JSON.parse(sql);
    if (typeof result.diff !== "string")
      throw new Error("Unrecognized schema-diff response; refusing a false pass.");
    sql = result.diff;
  }
  const statements = sql
    .replace(/--[^\r\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();
  if (statements)
    throw new Error(
      "Public schema drift detected; review the local schema-diff.sql artifact.",
    );
}

export function assertGeneratedTypesMatch(generated, tracked) {
  const hash = (value) =>
    createHash("sha256").update(value.replaceAll("\r\n", "\n").trimEnd()).digest("hex");
  if (hash(generated) !== hash(tracked))
    throw new Error(
      "Generated database types differ; review the local database.types.ts artifact (source preserved).",
    );
}
