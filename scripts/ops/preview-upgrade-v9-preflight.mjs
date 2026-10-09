import { join } from "node:path";
import { upgradeNativeDependencies } from "./preview-upgrade-native-loader.mjs";
// Fixed read-only v9 verifier; module source was sealed by validateV9Release.
try {
  const release = process.argv[2];
  const { require, Database } = upgradeNativeDependencies(release, {
    legacy: true,
  });
  const result = require(
    join(release, "src/features/real-data/sqlite/production-bootstrap.ts"),
  ).verifyProductionApplicationDatabase(process.env.LIFE_OS_HOSTED_SQLITE_PATH);
  if (result.schemaVersion !== 9) throw new Error();
  const actual = new Database(process.env.LIFE_OS_HOSTED_SQLITE_PATH, {
    readonly: true,
    fileMustExist: true,
  });
  const expected = new Database(":memory:");
  try {
    require(
      join(release, "src/features/real-data/sqlite/runtime.ts"),
    ).registerCodecs(expected);
    require(
      join(release, "src/features/real-data/sqlite/canonical-schema.ts"),
    ).initializeCanonicalSchema(expected);
    const schema = (db) =>
      JSON.stringify(
        db
          .prepare(
            "SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name",
          )
          .all(),
      );
    if (schema(actual) !== schema(expected)) throw new Error();
  } finally {
    actual.close();
    expected.close();
  }

  process.stdout.write("UPGRADE_V9_PREFLIGHT_PASS\n");
} catch {
  process.stderr.write("UPGRADE_V9_PREFLIGHT_DENIED\n");
  process.exitCode = 1;
}
