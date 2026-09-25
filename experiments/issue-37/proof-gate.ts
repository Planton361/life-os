import { resolve } from "node:path";

// The default product runtime never opens or imports the SQLite driver.
export function isSqliteProofRuntime() {
  const path = process.env.LIFE_OS_37_SQLITE_DB;
  return process.env.LIFE_OS_37_PROOF === "1" &&
    process.env.NODE_ENV === "production" &&
    typeof path === "string" &&
    resolve(path).startsWith("/private/tmp/life-os-37-proof/") &&
    resolve(path).endsWith(".db") &&
    Boolean(process.env.LIFE_OS_37_OWNER_TOKEN);
}
