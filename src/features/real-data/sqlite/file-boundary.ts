import "server-only";
import { closeSync, lstatSync, openSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, resolve, join } from "node:path";

export function privateDatabasePath(path: string): string {
  if (!isAbsolute(path) || resolve(path) !== path || !path.endsWith(".db")) throw new Error("SQLITE_PATH_INVALID");
  if (path.startsWith(`${join(process.cwd(), "public")}/`)) throw new Error("SQLITE_PUBLIC_PATH_DENIED");
  const directory = dirname(path);
  const parent = lstatSync(directory);
  if (!parent.isDirectory() || realpathSync(directory) !== directory || (parent.mode & 0o077) !== 0)
    throw new Error("SQLITE_DIRECTORY_BOUNDARY_INVALID");
  if (process.getuid && parent.uid !== process.getuid()) throw new Error("SQLITE_DIRECTORY_OWNER_INVALID");
  return path;
}

export function reserveFreshDatabase(path: string) {
  privateDatabasePath(path);
  const descriptor = openSync(path, "wx", 0o600);
  closeSync(descriptor);
}
