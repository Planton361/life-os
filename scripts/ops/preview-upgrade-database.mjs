import { createRequire } from "node:module";
import { readFileSync, writeFileSync, lstatSync } from "node:fs";
import { join } from "node:path";
import { boundary } from "./preview-cd-host.mjs";
// Native, fixed operator subcommands. Never loaded by HTTP/Next startup.
try {
  if (process.versions.node !== "24.21.0") throw new Error();
  const [release, operation, path, destination] = process.argv.slice(2);
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
  boundary(path);
  const Database = require("better-sqlite3");
  if (operation === "migrate") {
    require(
      join(release, "src/features/real-data/sqlite/preview-upgrade.ts"),
    ).upgradePreviewSchemaV9(path);
    process.stdout.write("MIGRATION_PASS\n");
  } else if (operation === "version") {
    const db = new Database(path, { readonly: true, fileMustExist: true });
    try {
      process.stdout.write(
        `${Number(db.pragma("user_version", { simple: true }))}\n`,
      );
    } finally {
      db.close();
    }
  } else if (operation === "backup") {
    const { acquireWriterLease } = require(
      join(release, "src/features/real-data/sqlite/writer-lease.ts"),
    );
    const unlock = acquireWriterLease(path);
    const db = new Database(path, { readonly: true, fileMustExist: true });
    try {
      writeFileSync(destination, "", { mode: 0o600, flag: "wx" });
      boundary(destination);
      await db.backup(destination);
      const copy = new Database(destination, {
        readonly: true,
        fileMustExist: true,
      });
      try {
        require(
          join(release, "src/features/real-data/sqlite/runtime.ts"),
        ).registerCodecs(copy);
        if (
          copy.pragma("integrity_check", { simple: true }) !== "ok" ||
          copy.pragma("foreign_key_check").length
        )
          throw new Error();
        if (lstatSync(destination).ino === lstatSync(path).ino)
          throw new Error();
      } finally {
        copy.close();
      }
      process.stdout.write("BACKUP_PASS\n");
    } finally {
      db.close();
      unlock();
    }
  } else throw new Error();
} catch {
  process.stderr.write("OPERATOR_DATABASE_OPERATION_FAILED\n");
  process.exitCode = 1;
}
