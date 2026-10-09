import { readFileSync, writeFileSync } from "node:fs";
import { createProcessScope } from "./managed-process.mjs";
import { NODE } from "./preview-cd-core.mjs";
import { isAbsolute, join } from "node:path";
import { operationalLock } from "./preview-cd-host.mjs";

// Build-only scope: no app environment, DB or service. The existing process
// wrapper cleans this exact build group on timeout/signal/invoking-parent loss.
// Its forceful fallback applies to disposable compiler children, never Next's
// serving SQLite writer (which has a separate graceful shutdown path).
const [pnpm, operation, root, source] = process.argv.slice(2);
if (
  process.versions.node !== NODE ||
  !isAbsolute(pnpm ?? "") ||
  !isAbsolute(root ?? "") ||
  !isAbsolute(source ?? "") ||
  !["install", "build"].includes(operation)
) {
  process.stderr.write("BUILD_COMMAND_DENIED\n");
  process.exitCode = 1;
} else {
  // Survive daemon-group loss until the parent watcher drains this compiler
  // group. A separate kernel lease serializes builds during crash recovery.
  let unlock;
  const scope = createProcessScope();
  try {
    unlock = operationalLock(join(root, "build-lease.db"), source);
    const args =
      operation === "install" ? ["install", "--frozen-lockfile"] : ["build"];
    const result = await scope.run(pnpm, args);
    if (!result.ok) throw new Error();
    if (
      operation === "build" &&
      process.env.LIFE_OS_BUILD_COMPOSITION === "personal-preview-v2"
    ) {
      writeFileSync(
        join(process.cwd(), ".next/life-preview-composition.json"),
        JSON.stringify({
          version: 2,
          buildId: readFileSync(
            join(process.cwd(), ".next/BUILD_ID"),
            "utf8",
          ).trim(),
        }),
        { mode: 0o600, flag: "wx" },
      );
    }
    process.stdout.write("BUILD_OPERATION_PASS\n");
  } catch {
    process.stderr.write("BUILD_OPERATION_FAILED\n");
    process.exitCode = 1;
  } finally {
    await scope.close();
    unlock?.();
  }
}
