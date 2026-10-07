import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Operator CLI loads the same server-only modules as Next, with real
// react-server conditions. No server-only stub or runtime policy bypass.
const require = createRequire(import.meta.url);
require.extensions[".ts"] = (module, filename) => {
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  module._compile(compiled.outputText, filename);
};
export function productionDatabaseModule() {
  return require(
    fileURLToPath(
      new URL(
        "../../src/features/real-data/sqlite/production-bootstrap.ts",
        import.meta.url,
      ),
    ),
  );
}
