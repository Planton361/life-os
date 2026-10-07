import { createRequire } from "node:module";

// Next prepares instrumentation after announcing its HTTP listener. Validate
// configuration before loading its CLI so a retired proof cannot become a
// partially prepared production process or fall through to profile data.
if (["LIFE_OS_37_PROOF", "LIFE_OS_37_SQLITE_DB", "LIFE_OS_37_OWNER_TOKEN"].some(key => process.env[key] !== undefined)) {
  process.stderr.write("RETIRED_SQLITE_PROOF_CONFIGURATION_DENIED\n");
  process.exit(1);
}
if (process.versions.node !== "24.21.0") {
  process.stderr.write("PRODUCTION_NODE_VERSION_MISMATCH\n");
  process.exit(1);
}
const require = createRequire(import.meta.url);
// The supported production shutdown path belongs to Next; bypassing its signal
// handlers would leave request draining and the runtime exit boundary unproven.
if (process.env.NEXT_MANUAL_SIG_HANDLE) {
  process.stderr.write("PRODUCTION_MANUAL_SIGNAL_HANDLER_DENIED\n");
  process.exit(1);
}
const cli = require.resolve("next/dist/bin/next");
process.argv = [process.execPath, cli, "start", ...process.argv.slice(2)];
await import(cli);
