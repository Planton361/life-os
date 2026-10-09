import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import { deny } from "./preview-cd-core.mjs";
import {
  boundary,
  atomicJson,
  command,
  cleanEnvironment,
  verifyDatabaseIdentity,
} from "./preview-cd-host.mjs";
import {
  validateV9Release,
  validateV9WorkerSource,
} from "./preview-v9-contract.mjs";
import { assertConfirmedOperatorPrefix } from "./preview-upgrade-state.mjs";

// Explicit v9-only call sites. Generic v10 databasePreflight is never relaxed.
export async function v9DatabasePreflight(config, release) {
  validateV9Release(release);
  verifyDatabaseIdentity(config);
  const result = await command(
    config.node,
    [
      "--conditions=react-server",
      fileURLToPath(
        new URL("./preview-upgrade-v9-preflight.mjs", import.meta.url),
      ),
      release.path,
    ],
    {
      env: {
        ...cleanEnvironment(config.node),
        LIFE_OS_HOSTED_SQLITE_PATH: config.database,
      },
      timeout: 60_000,
    },
  );
  if (result !== "UPGRADE_V9_PREFLIGHT_PASS")
    deny("UPGRADE_V9_PREFLIGHT_DENIED");
}
export async function restoreV9Worker({
  root,
  checkpoint,
  plist,
  env,
  releaseWorkerLease,
  bootstrap,
}) {
  assertConfirmedOperatorPrefix(root, checkpoint);
  const config = checkpoint.originalConfig;
  boundary(plist);
  validateV9WorkerSource(config.workerSource);
  // All historical source, schema, owner, identity and data checks precede writes
  // or bootstrap. In particular this helper cannot restore v9 after v10 commit.
  await v9DatabasePreflight(config, checkpoint.originalState.lastGood);
  atomicJson(join(root, "config.json"), config);
  atomicJson(join(root, "state.json"), checkpoint.originalState);
  writeFileSync(plist, checkpoint.originalPlist, { mode: 0o600 });
  await releaseWorkerLease();
  await bootstrap(plist, env);
}
