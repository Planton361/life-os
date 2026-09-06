#!/usr/bin/env node
import { createRequire } from "node:module";
import { createProcessScope } from "./managed-process.mjs";
import { acquireRuntimeLock } from "./runtime-lock.mjs";
import { developmentEnv } from "./next-memory-budget.mjs";
const scope = createProcessScope();
let release;
try {
  // Disposable runner owns a separate build output and its own E2E lock.
  release = await acquireRuntimeLock(
    process.env.LIFE_OS_E2E_RUNTIME === "DISPOSABLE" ? "e2e-dev" : "dev",
  );
  const result = await scope.run(
    process.execPath,
    [
      createRequire(import.meta.url).resolve("next/dist/bin/next"),
      "dev",
      ...process.argv.slice(2),
    ],
    { env: developmentEnv(), inherit: true },
  );
  process.exitCode = result.code;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await scope.close();
  await release?.();
}
