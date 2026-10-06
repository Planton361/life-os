import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";

// Transpile real runtime commands and their runtime imports into disposable Node
// workers. Type-only imports disappear; server-only is stubbed only in proof code.
export function compileRuntime() {
  const directory = mkdtempSync(
    join(realpathSync(tmpdir()), "life-os-116-compiled-"),
  );
  writeFileSync(join(directory, "package.json"), '{"type":"commonjs"}', {
    mode: 0o600,
  });
  const root = resolve("src/features/real-data/sqlite"),
    seen = new Set();
  const outputPath = (source) =>
    source.startsWith(`${root}/`)
      ? join(directory, relative(root, source).replace(/\.ts$/, ".js"))
      : join(
          directory,
          "dependencies",
          relative(process.cwd(), source).replace(/\.ts$/, ".js"),
        );
  function compile(source) {
    if (seen.has(source)) return outputPath(source);
    seen.add(source);
    const output = ts.transpileModule(readFileSync(source, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    }).outputText;
    const imports = {};
    for (const match of output.matchAll(/require\(["']([^"']+)["']\)/g)) {
      const name = match[1];
      if (!name.startsWith(".")) continue;
      const base = resolve(dirname(source), name),
        dependency = [`${base}.ts`, join(base, "index.ts")].find(existsSync);
      if (!dependency || !dependency.startsWith(`${resolve("src")}/`))
        throw new Error(`Unsupported proof import: ${name}`);
      imports[name] = compile(dependency);
    }
    const prefix = `const originalRequire = require; const projectRequire = require("node:module").createRequire(${JSON.stringify(join(process.cwd(), "package.json"))}); const proofImports = ${JSON.stringify(imports)}; require = name => name === "server-only" ? {} : proofImports[name] ? originalRequire(proofImports[name]) : projectRequire(name);\n`;
    const target = outputPath(source);
    mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
    writeFileSync(target, prefix + output, { mode: 0o600 });
    return target;
  }
  for (const file of [
    "runtime",
    "synthetic-database",
    "commands/inbox-commands",
    "commands/goal-commands",
    "commands/project-depth-commands",
    "commands/skill-commands",
    "commands/source-commands",
    "commands/resource-commands",
    "commands/review-commands",
    "commands/nutrition-commands",
    "commands/training-commands",
  ])
    compile(join(root, `${file}.ts`));
  return directory;
}
