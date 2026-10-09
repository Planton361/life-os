import { createRequire } from "node:module";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { NODE } from "./preview-cd-core.mjs";

// No JSON, owner, row, credential or path output, including on native errors.
try {
  if (process.versions.node !== NODE) throw new Error();
  const release = process.argv[2],
    require = createRequire(join(release, "package.json"));
  const ts = require("typescript");
  require.extensions[".ts"] = (module, filename) => {
    const code = ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    });
    module._compile(code.outputText, filename);
  };
  const { verifyProductionApplicationDatabase } = require(
    join(release, "src/features/real-data/sqlite/production-bootstrap.ts"),
  );
  verifyProductionApplicationDatabase(process.env.LIFE_OS_HOSTED_SQLITE_PATH);
  process.stdout.write("DATABASE_PREFLIGHT_PASS\n");
} catch {
  process.stderr.write("DATABASE_COMPATIBILITY_FAILED\n");
  process.exitCode = 1;
}
