import {
  constants,
  openSync,
  closeSync,
  fstatSync,
  lstatSync,
  fsyncSync,
  writeSync,
} from "node:fs";
import { join } from "node:path";
import { boundary } from "./preview-cd-host.mjs";

// A fixed append-only, bounded private journal. Nothing provided by the child is
// written here; a missing terminal event always means UNKNOWN, not success.
const limit = 262_144;
const reserve = 4096;
const events = new Set([
  "admitted",
  "child_started",
  "operator_signal",
  "child_close",
  "controlled_shutdown",
]);
const signals = new Set(["SIGINT", "SIGTERM", "SIGKILL", "SIGHUP", "OTHER"]);
const categories = new Set([
  "PARENT_REQUIRED",
  "PREVIEW_DENIED",
  "PREVIEW_COMPOSITION",
  "PATH_BOUNDARY",
  "WRITER_BUSY",
  "SCHEMA_MISMATCH",
  "OWNER_INVALID",
  "INTEGRITY_FAILED",
  "COMPATIBILITY_NOT_READY",
  "CATALOG_INVALID",
  "HOSTED_CONFIGURATION",
  "RUNTIME_DENIED",
  "UNCLASSIFIED",
  "SPAWN_FAILED",
]);

export function createLifecycleLog(root) {
  try {
    const dir = boundary(root, { directory: true });
    if ((dir.mode & 0o777) !== 0o700) throw new Error();
    const path = join(root, "linux-lifecycle.jsonl");
    const fd = openSync(
      path,
      constants.O_WRONLY |
        constants.O_APPEND |
        constants.O_CREAT |
        constants.O_NOFOLLOW,
      0o600,
    );
    try {
      const file = fstatSync(fd),
        linked = lstatSync(path);
      if (
        !file.isFile() ||
        file.nlink !== 1 ||
        file.uid !== process.getuid() ||
        (file.mode & 0o777) !== 0o600 ||
        file.dev !== linked.dev ||
        file.ino !== linked.ino ||
        file.size > limit - reserve
      )
        throw new Error();
      const dirFd = openSync(root, constants.O_RDONLY | constants.O_DIRECTORY);
      try {
        fsyncSync(dirFd);
      } finally {
        closeSync(dirFd);
      }
      return {
        record(event, details = {}) {
          try {
            if (!events.has(event)) throw new Error();
            const row = { event, at: new Date().toISOString() };
            if (details.signal !== undefined) {
              if (!signals.has(details.signal)) throw new Error();
              row.signal = details.signal;
            }
            if (details.code !== undefined) {
              if (
                !Number.isInteger(details.code) ||
                details.code < 0 ||
                details.code > 255
              )
                throw new Error();
              row.code = details.code;
            }
            if (details.category !== undefined) {
              if (!categories.has(details.category)) throw new Error();
              row.category = details.category;
            }
            const now = fstatSync(fd),
              current = lstatSync(path);
            if (
              !now.isFile() ||
              now.nlink !== 1 ||
              now.uid !== process.getuid() ||
              (now.mode & 0o777) !== 0o600 ||
              now.dev !== current.dev ||
              now.ino !== current.ino
            )
              throw new Error();
            const data = Buffer.from(`${JSON.stringify(row)}\n`);
            if (
              now.size + data.length > limit ||
              writeSync(fd, data) !== data.length
            )
              throw new Error();
            fsyncSync(fd);
          } catch {
            throw new Error("LINUX_LIFECYCLE_LOG_DENIED");
          }
        },
        close() {
          closeSync(fd);
        },
      };
    } catch (error) {
      closeSync(fd);
      throw error;
    }
  } catch {
    throw new Error("LINUX_LIFECYCLE_LOG_DENIED");
  }
}
