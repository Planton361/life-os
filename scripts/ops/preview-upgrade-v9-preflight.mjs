import { join } from "node:path";
import { upgradeNativeDependencies } from "./preview-upgrade-native-loader.mjs";
// Fixed read-only v9 verifier; module source was sealed by validateV9Release.
try {
  const release = process.argv[2];
  const { require } = upgradeNativeDependencies(release, { legacy: true });
  const result = require(
    join(release, "src/features/real-data/sqlite/production-bootstrap.ts"),
  ).verifyProductionApplicationDatabase(process.env.LIFE_OS_HOSTED_SQLITE_PATH);
  if (result.schemaVersion !== 9) throw new Error();
  process.stdout.write("UPGRADE_V9_PREFLIGHT_PASS\n");
} catch {
  process.stderr.write("UPGRADE_V9_PREFLIGHT_DENIED\n");
  process.exitCode = 1;
}
