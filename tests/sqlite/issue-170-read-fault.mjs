// Process-local fault injection for disposable browser proof only. Not imported
// by the app or production launcher. Other domain reads continue normally.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");
const prepare = Database.prototype.prepare;
const mode = new URL(import.meta.url).searchParams.get("table");
if (
  ![
    "tasks",
    "task_dependencies",
    "schedule_source_links",
    "project_milestones",
  ].includes(mode)
)
  throw new Error("Invalid proof fault");
Database.prototype.prepare = function (sql, ...args) {
  if (
    sql.startsWith("SELECT ") &&
    sql.includes(` FROM ${mode} WHERE user_id=? AND `) &&
    / AND (project_id|task_id) IN \(/.test(sql)
  )
    throw new Error("Disposable #170 read failure");
  return prepare.call(this, sql, ...args);
};
