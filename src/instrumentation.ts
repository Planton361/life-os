export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertNoRetiredProofConfiguration } = await import("./features/real-data/sqlite/runtime-configuration");
    try { assertNoRetiredProofConfiguration(); }
    catch {
      process.stderr.write("LIFE_OS_RUNTIME_STARTUP_DENIED\n");
      process.exit(1);
    }
  }
}
