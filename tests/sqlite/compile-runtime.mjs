import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import ts from "typescript";

// Execute the actual feature source in disposable Node proof workers, without
// shipping a test route or disabling the server-only fence in product code.
export function compileRuntime() {
  const directory = mkdtempSync(
    join(realpathSync(tmpdir()), "life-os-116-compiled-"),
  );
  writeFileSync(join(directory, "package.json"), '{"type":"commonjs"}', {
    mode: 0o600,
  });
  const projectPackage = JSON.stringify(join(process.cwd(), "package.json"));
  const prefix = `const originalRequire = require; const projectRequire = require("node:module").createRequire(${projectPackage}); require = name => name === "server-only" ? {} : name === "../../schemas/project-depth.schemas" ? originalRequire(${JSON.stringify(join(directory, "project-depth.schemas.js"))}) : name === "../../schemas/skill-development.schema" ? originalRequire(${JSON.stringify(join(directory, "skill-development.schema.js"))}) : name === "../../schemas/inbox-workspace.schemas" ? originalRequire(${JSON.stringify(join(directory, "inbox-workspace.schemas.js"))}) : name.startsWith(".") ? originalRequire(name) : projectRequire(name);\n`;
  for (const file of [
    "runtime",
    "writer-lease",
    "owner-context",
    "file-boundary",
    "canonical-catalog",
    "codecs",
    "synthetic-database",
    "core-schema",
    "task-step-schema",
    "commands/inbox-commands",
    "inbox-workspace.schemas",
    "source-schema",
    "source-guards",
    "habit-schema",
    "health-schema",
    "goal-schema",
    "goal-guards",
    "goal-invariants",
    "commands/goal-commands",
    "project-canonical",
    "project-schema",
    "project-guards",
    "project-invariants",
    "repositories/project-depth-read",
    "commands/project-depth-commands",
    "project-depth.schemas",
    "skill-schema",
    "skill-guards",
    "skill-invariants",
    "commands/skill-commands",
    "skill-development.schema",
  ]) {
    const source = readFileSync(
      file === "inbox-workspace.schemas"
        ? "src/features/real-data/schemas/inbox-workspace.schemas.ts"
        : file === "skill-development.schema"
        ? "src/features/real-data/schemas/skill-development.schema.ts"
        : file === "project-depth.schemas"
          ? "src/features/real-data/schemas/project-depth.schemas.ts"
          : join("src/features/real-data/sqlite", `${file}.ts`),
      "utf8",
    );
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    mkdirSync(dirname(join(directory, `${file}.js`)), {
      recursive: true,
      mode: 0o700,
    });
    writeFileSync(join(directory, `${file}.js`), prefix + output, {
      mode: 0o600,
    });
  }
  return directory;
}
