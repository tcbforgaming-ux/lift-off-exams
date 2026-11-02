import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assertNoSchemaDrift,
  assertGeneratedTypesMatch,
} from "./verification-contracts.mjs";

test("an empty or comment-only schema diff passes", () => {
  assertNoSchemaDrift("");
  assertNoSchemaDrift("-- no changes\r\n/* diagnostic */\n");
});
test("DDL drift fails rather than only reporting success", () => {
  assert.throws(
    () => assertNoSchemaDrift("-- drift\ncreate table public.unexpected(id int);"),
    /schema drift/,
  );
  assert.throws(
    () => assertNoSchemaDrift("drop function public.example();"),
    /schema drift/,
  );
});
test("CLI structured empty diff passes", () => {
  assertNoSchemaDrift(JSON.stringify({ diff: "\n", message: "Diff complete." }));
});
test("CLI structured DDL fails", () => {
  assert.throws(
    () =>
      assertNoSchemaDrift(
        JSON.stringify({ diff: "create table public.unexpected(id int);" }),
      ),
    /schema drift/,
  );
});
test("malformed or unrecognized CLI responses fail closed", () => {
  assert.throws(() => assertNoSchemaDrift("{invalid}"));
  assert.throws(() => assertNoSchemaDrift('{"message":"complete"}'), /Unrecognized/);
});
test("type comparison normalizes only line endings and trailing whitespace", () => {
  assertGeneratedTypesMatch("type A = string;\r\n", "type A = string;\n\n");
});
test("type changes fail without exposing generated content", () => {
  assert.throws(
    () => assertGeneratedTypesMatch("type A = string;", "type A = number;"),
    /types differ/,
  );
});
