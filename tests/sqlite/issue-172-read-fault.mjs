// Disposable process-local fault only; never imported by application code.
import { createRequire } from "node:module";
const Database = createRequire(import.meta.url)("better-sqlite3");
const prepare = Database.prototype.prepare;
Database.prototype.prepare = function (sql, ...args) {
  if (
    sql.startsWith(
      "SELECT task_id,archived_at,completed_at FROM task_steps WHERE user_id=? AND task_id=?",
    )
  )
    throw new Error("Disposable #172 step read failure");
  return prepare.call(this, sql, ...args);
};
