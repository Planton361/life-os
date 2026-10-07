import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const pending = new Map();
const serverEmit = http.Server.prototype.emit;
http.Server.prototype.emit = function (event, ...args) {
  if (event === "request") {
    const [request, response] = args;
    pending.set(response, `${request.method} ${request.url?.split("?")[0]}`);
    const finished = () => pending.delete(response);
    response.once("finish", finished);
    response.once("close", finished);
  }
  return serverEmit.call(this, event, ...args);
};
if (process.env.LIFE_OS_APPLICATION_RUNTIME === "sqlite-synthetic")
  process.prependOnceListener("SIGTERM", () => {
    process.stderr.write(
      `SQLITE_PROOF_SHUTDOWN_PENDING ${JSON.stringify([...pending.values()])}\n`,
    );
  });

// Production proof process only. This preload observes server-side fetches too;
// browser request instrumentation alone cannot see Server Component egress.
const originalFetch = globalThis.fetch;
globalThis.fetch = function (input, init) {
  const url = String(input instanceof Request ? input.url : input);
  if (/supabase|\/rest\/v1\/|\/auth\/v1\/|\/storage\/v1\//i.test(url)) {
    process.stderr.write("SQLITE_PROOF_SUPABASE_NETWORK_DENIED\n");
    throw new Error("SQLITE_PROOF_SUPABASE_NETWORK_DENIED");
  }
  return originalFetch.call(this, input, init);
};

function assertProofFile(path, allowMissingRead = false) {
  if (typeof path !== "string" && !(path instanceof URL)) return;
  const value = relative(
    process.cwd(),
    resolve(path instanceof URL ? fileURLToPath(path) : path),
  );
  if (
    /^(?:\.local|private|backups|exports)\/|^\.env(?:\.local|\.[^/]*\.local)?$/.test(
      value,
    ) &&
    (!allowMissingRead || fs.existsSync(path))
  ) {
    process.stderr.write("SQLITE_PROOF_PERSONAL_FILE_ACCESS_DENIED\n");
    throw new Error("SQLITE_PROOF_PERSONAL_FILE_ACCESS_DENIED");
  }
}
for (const method of [
  "readFile",
  "readFileSync",
  "writeFile",
  "writeFileSync",
  "open",
  "openSync",
  "rm",
  "rmSync",
  "unlink",
  "unlinkSync",
]) {
  const original = fs[method];
  fs[method] = function (path, ...args) {
    assertProofFile(
      path,
      method.startsWith("read") ||
        (method.startsWith("open") &&
          (args[0] === "r" || args[0] === undefined)),
    );
    return original.call(this, path, ...args);
  };
}
for (const method of ["readFile", "writeFile", "open", "rm", "unlink"]) {
  const original = fs.promises[method];
  fs.promises[method] = function (path, ...args) {
    assertProofFile(
      path,
      method.startsWith("read") ||
        (method.startsWith("open") &&
          (args[0] === "r" || args[0] === undefined)),
    );
    return original.call(this, path, ...args);
  };
}
syncBuiltinESMExports();
