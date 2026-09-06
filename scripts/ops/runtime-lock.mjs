import { createServer } from "node:net";
import { createHash } from "node:crypto";
import { realpath } from "node:fs/promises";

// Linux abstract Unix socket: kernel-owned lifetime, no stale PID/lock files
// after crashes, no TCP port and no signalling of an existing runtime.
export async function acquireRuntimeLock(kind, cwd = process.cwd()) {
  const identity = `${process.getuid()}:${await realpath(cwd)}:${kind}`;
  const key = createHash("sha256").update(identity).digest("hex").slice(0, 32);
  const server = createServer((socket) => socket.destroy());
  await new Promise((resolve, reject) => {
    server.once("error", () =>
      reject(new Error(`LIFE_OS_${kind.toUpperCase()}_ALREADY_RUNNING`)),
    );
    server.listen(`\0life-os-${key}`, resolve);
  });
  server.unref();
  return () => new Promise((resolve) => server.close(resolve));
}
