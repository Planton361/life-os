import { createServer } from "node:net";
import { createHash } from "node:crypto";
import { realpath } from "node:fs/promises";

function portableLockPort(key) {
  return 49_152 + (Number.parseInt(key.slice(0, 8), 16) % 16_384);
}

// Linux uses an abstract Unix socket: kernel-owned lifetime, no stale
// PID/lock files and no TCP port. macOS has no Linux abstract namespace, so it
// uses a deterministic loopback TCP port with the same kernel-owned lifetime.
// A collision fails closed as an existing lock rather than guessing.
export async function acquireRuntimeLock(
  kind,
  cwd = process.cwd(),
  { platform = process.platform } = {},
) {
  const uid = typeof process.getuid === "function" ? process.getuid() : "unknown-user";
  const identity = `${uid}:${await realpath(cwd)}:${kind}`;
  const key = createHash("sha256").update(identity).digest("hex").slice(0, 32);
  const server = createServer((socket) => socket.destroy());
  const address =
    platform === "linux"
      ? `\0life-os-${key}`
      : { host: "127.0.0.1", port: portableLockPort(key) };
  await new Promise((resolve, reject) => {
    server.once("error", () =>
      reject(new Error(`LIFE_OS_${kind.toUpperCase()}_ALREADY_RUNNING`)),
    );
    server.listen(address, resolve);
  });
  server.unref();
  return () => new Promise((resolve) => server.close(resolve));
}
