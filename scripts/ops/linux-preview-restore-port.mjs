import { Server } from "node:net";
import { dirname, join } from "node:path";
import { readJson } from "./preview-cd-host.mjs";
import { databaseIdentity, digest } from "./linux-preview-database.mjs";

// Only a newly created isolated restore is eligible for an alternate port.
// The real Preview launcher remains fixed to 127.0.0.1:3000.
const path = process.env.LIFE_OS_HOSTED_SQLITE_PATH;
const port = Number(process.env.LIFE_OS_LINUX_RESTORE_PORT);
const proof = readJson(join(dirname(path), "restore-launch.json"));
if (
  !Number.isInteger(port) ||
  port < 1024 ||
  port > 65535 ||
  [3000, 3001].includes(port) ||
  proof.restore !== path ||
  !/\/recovery-[a-f0-9-]{36}\/restore\.db$/.test(path) ||
  digest(databaseIdentity(path)) !== digest(proof.identity) ||
  proof.pid !== process.ppid
)
  throw new Error("LINUX_ISOLATED_RESTORE_REQUIRED");
const listen = Server.prototype.listen;
Server.prototype.listen = function (...args) {
  if (typeof args[0] === "object" && Number(args[0]?.port) === 3000)
    args[0] = { ...args[0], port, host: "127.0.0.1" };
  else if (Number(args[0]) === 3000) args[0] = port;
  return listen.apply(this, args);
};
