#!/usr/bin/env node
import { createProcessScope } from "./managed-process.mjs";
import { acquireRuntimeLock } from "./runtime-lock.mjs";
const scope = createProcessScope();
let release;
try {
  release = await acquireRuntimeLock("heavy");
  for (const [command, args] of [
    ["pnpm", ["typecheck"]],
    ["pnpm", ["lint"]],
    [process.execPath, ["--test", "scripts/ops/managed-process.test.mjs"]],
    [
      "pnpm",
      [
        "exec",
        "vitest",
        "run",
        ...(process.argv.length > 2
          ? process.argv.slice(2)
          : [
              "src/features/entities/workbench/task-step-progress.test.ts",
              "src/features/real-data/schemas/skill.schema.test.ts",
              "src/features/real-data/domain/task-goal-alignment.test.ts",
            ]),
      ],
    ],
    ["pnpm", ["build"]],
  ]) {
    console.log(`LOCAL_VALIDATION_STEP ${args.join(" ")}`);
    const result = await scope.run(command, args, { inherit: true });
    if (!result.ok) {
      process.exitCode = result.code;
      break;
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await scope.close();
  await release?.();
}
