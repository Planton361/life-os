import { DatabaseSync } from "node:sqlite";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = "/private/tmp/life-os-37-proof/";
export const owner = "37000000-0000-4000-8000-000000000001";
export const id = (kind, number) =>
  `37000000-0000-4000-8${String(kind).padStart(3, "0")}-${String(number).padStart(12, "0")}`;

export function proofPath(value) {
  const resolved = resolve(value);
  if (!resolved.startsWith(root) || !resolved.endsWith(".db")) {
    throw new Error(`Proof DB must be a .db file below ${root}`);
  }
  return resolved;
}

export function openDb(path) {
  const db = new DatabaseSync(proofPath(path));
  db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;");
  return db;
}

export function setup(path) {
  const target = proofPath(path);
  if (existsSync(target)) throw new Error("Proof DB already exists; choose a fresh path");
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(target);
  try {
    db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
    const now = new Date().toISOString();
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
    db.exec("BEGIN IMMEDIATE");
    db.prepare("INSERT INTO owners(id) VALUES(?)").run(owner);
    const goal = db.prepare("INSERT INTO goals(id,user_id,title,description,why,horizon,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)");
    const project = db.prepare("INSERT INTO projects(id,user_id,goal_id,title,description,next_step,status,priority,target_date,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)");
    const task = db.prepare("INSERT INTO tasks(id,user_id,project_id,goal_id,title,description,status,priority,planned_date,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)");
    for (let n = 1; n <= 4; n++) {
      goal.run(id(1,n), owner, `Synthetic Goal ${n}`, `Goal ${n} outcome`, `Reason ${n}`, "quarter", "active", now, now);
      project.run(id(2,n), owner, id(1,n), `Synthetic Project ${n}`, `Project ${n} outcome`, `Next Task ${n}`, "active", "P2", today, now, now);
    }
    for (let n = 1; n <= 80; n++) {
      const context = ((n - 1) % 4) + 1;
      task.run(id(3,n), owner, id(2,context), id(1,context), `Synthetic Task ${n}`, `Task ${n} context`, "planned", n % 5 === 0 ? "P1" : "P2", n % 3 === 0 ? today : null, now, now);
    }
    db.prepare("INSERT INTO task_dependencies(id,user_id,project_id,predecessor_task_id,successor_task_id,created_at) VALUES(?,?,?,?,?,?)")
      .run(id(4,1), owner, id(2,1), id(3,1), id(3,5), now);
    db.prepare("INSERT INTO source_records(id,user_id,kind,title) VALUES(?,?,?,?)")
      .run(id(5,1), owner, "meal", "Synthetic Meal");
    db.prepare("INSERT INTO schedule_source_links(task_id,user_id,source_type,source_id) VALUES(?,?,?,?)")
      .run(id(3,5), owner, "meal", id(5,1));
    db.exec("COMMIT");
    return { path: target, owner, today, goals: 4, projects: 4, tasks: 80 };
  } catch (error) {
    if (db.isTransaction) db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const [mode, path] = process.argv.slice(2);
  if (mode !== "setup" || !path) throw new Error("usage: node fixture.mjs setup /private/tmp/life-os-37-proof/NAME.db");
  process.stdout.write(`${JSON.stringify(setup(path))}\n`);
}
