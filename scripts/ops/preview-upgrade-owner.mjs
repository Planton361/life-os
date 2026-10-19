import { boundary } from "./preview-cd-host.mjs";
import { upgradeNativeDependencies } from "./preview-upgrade-native-loader.mjs";
// Private pipe only: the caller consumes this owner identifier; never a CLI log.
try {
  const [release, path] = process.argv.slice(2);
  boundary(path);
  const { Database } = upgradeNativeDependencies(release),
    db = new Database(path, { readonly: true, fileMustExist: true });
  try {
    const row = db
      .prepare(
        "SELECT owner_id FROM runtime_metadata WHERE singleton=1 AND schema_version=10 AND dataset_kind='canonical'",
      )
      .get();
    if (!row) throw new Error();
    process.stdout.write(row.owner_id);
  } finally {
    db.close();
  }
} catch {
  process.stderr.write("UPGRADE_OWNER_DENIED\n");
  process.exitCode = 1;
}
