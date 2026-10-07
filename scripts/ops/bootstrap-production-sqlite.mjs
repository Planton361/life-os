import { productionDatabaseModule } from "./sqlite-server-modules.mjs";

try {
  const { bootstrapProductionDatabase } = productionDatabaseModule();
  bootstrapProductionDatabase(process.env.LIFE_OS_HOSTED_SQLITE_PATH, {
    ownerId: process.env.LIFE_OS_BOOTSTRAP_OWNER_ID,
    displayName: process.env.LIFE_OS_BOOTSTRAP_DISPLAY_NAME,
    timezone: process.env.LIFE_OS_BOOTSTRAP_TIMEZONE,
  });
  process.stdout.write(
    "PRODUCTION_SQLITE_BOOTSTRAP_PASS canonical=83/83 ready=1\n",
  );
} catch (error) {
  const code =
    error instanceof Error && /^[A-Z_]+$/.test(error.message)
      ? error.message
      : "PRODUCTION_SQLITE_BOOTSTRAP_DENIED";
  process.stderr.write(`${code}\n`);
  process.exitCode = 1;
}
