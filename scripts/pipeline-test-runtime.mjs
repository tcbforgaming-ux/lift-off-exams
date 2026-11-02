import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import ts from "typescript";

export async function loadPipeline() {
  const context = vm.createContext({
    Request,
    Response,
    Headers,
    FormData,
    Blob,
    URL,
    TextEncoder,
    TextDecoder,
    crypto: webcrypto,
    fetch() {
      throw new Error("Live network forbidden in pipeline fixtures");
    },
    Deno: {
      env: {
        get() {
          return undefined;
        },
      },
    },
  });
  const modules = new Map();
  async function load(file) {
    if (modules.has(file)) return modules.get(file);
    const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const module = new vm.SourceTextModule(source, { context, identifier: file });
    modules.set(file, module);
    await module.link(async (specifier) => {
      if (specifier.startsWith("https://deno.land/"))
        return new vm.SyntheticModule(
          ["serve"],
          function () {
            this.setExport("serve", () => undefined);
          },
          { context },
        );
      if (specifier.startsWith("npm:"))
        return new vm.SyntheticModule(
          ["createClient"],
          function () {
            this.setExport("createClient", () => {
              throw new Error("Real client construction forbidden");
            });
          },
          { context },
        );
      return load(path.resolve(path.dirname(file), specifier));
    });
    return module;
  }
  const shared = await load(
    path.resolve("supabase/functions/_shared/deca-pipeline.ts"),
  );
  await shared.evaluate();
  const importer = await load(
    path.resolve("supabase/functions/import-deca-batch/index.ts"),
  );
  await importer.evaluate();
  const starter = await load(
    path.resolve("supabase/functions/start-deca-batch/index.ts"),
  );
  await starter.evaluate();
  return {
    shared: shared.namespace,
    importer: importer.namespace,
    starter: starter.namespace,
  };
}
export const request = (body = {}) =>
  new Request("http://fixture.invalid", {
    method: "POST",
    headers: {
      "x-batch-secret": "synthetic-secret",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
