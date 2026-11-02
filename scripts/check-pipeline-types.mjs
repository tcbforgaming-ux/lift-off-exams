import ts from "typescript";
const program = ts.createProgram(
  [
    "scripts/pipeline-runtime.d.ts",
    "supabase/functions/_shared/deca-pipeline.ts",
    "supabase/functions/start-deca-batch/index.ts",
    "supabase/functions/import-deca-batch/index.ts",
  ],
  {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
    types: ["node"],
    strict: true,
    skipLibCheck: true,
    allowImportingTsExtensions: true,
    noEmit: true,
  },
);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => process.cwd(),
      getCanonicalFileName: (file) => file,
      getNewLine: () => "\n",
    }),
  );
  process.exitCode = 1;
} else
  console.log("Pipeline TypeScript contracts passed (offline runtime declarations).");
