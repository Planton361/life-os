import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NODE } from "./preview-cd-core.mjs";

// The verified built release supplies all modules. The merged source checkout
// supplies the audited operator scripts and need not contain node_modules.
export function upgradeNativeDependencies(release, { legacy = false } = {}) {
  if (process.versions.node !== NODE)
    throw new Error("UPGRADE_TOOLCHAIN_INVALID");
  const require = createRequire(join(release, "package.json")),
    ts = require("typescript");
  require.extensions[".ts"] = (module, filename) =>
    module._compile(
      ts.transpileModule(readFileSync(filename, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
          esModuleInterop: true,
        },
      }).outputText,
      filename,
    );
  const runtime = require(
    join(release, "src/features/real-data/sqlite/runtime.ts"),
  );
  runtime.verifyNodeAndDriver();
  if (!legacy)
    require(join(release, "src/features/real-data/sqlite/preview-upgrade.ts"));
  const Database = require("better-sqlite3"),
    probe = new Database(":memory:");
  try {
    probe.prepare("SELECT 1").get();
  } finally {
    probe.close();
  }
  return { require, Database };
}
