import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";

const [mode, engine, dbPath, durationArg = "600"] = process.argv.slice(2);
if (!["setup", "measure", "idle"].includes(mode) || !["sqlite", "pglite"].includes(engine) || !dbPath) {
  throw new Error("usage: node proof.mjs setup|measure|idle sqlite|pglite DB_PATH [duration_seconds]");
}
const safeRoot = "/private/tmp/life-os-33-proof/";
if (!resolve(dbPath).startsWith(safeRoot)) throw new Error("DB path must be inside the isolated proof directory");
const durationSeconds = Number(durationArg);
if (!Number.isInteger(durationSeconds) || durationSeconds < 0) throw new Error("invalid duration");
const owner = "00000000-0000-4000-8000-000000000033";
const today = "2026-09-24";
const projectIds = Array.from({ length: 20 }, () => randomUUID());
const goalIds = Array.from({ length: 10 }, () => randomUUID());
const taskIds = Array.from({ length: 300 }, () => randomUUID());
const isPg = engine === "pglite";
const p = (n) => isPg ? `$${n}` : "?";
let db;
async function open() {
  if (isPg) {
    const modulePath = process.env.LIFE_OS_PROOF_PGLITE_MODULE || "@electric-sql/pglite";
    const { PGlite } = await import(modulePath);
    db = await PGlite.create(dbPath);
  } else {
    const { DatabaseSync } = await import("node:sqlite");
    db = new DatabaseSync(dbPath);
    db.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  }
}
async function exec(sql) { if (isPg) await db.exec(sql); else db.exec(sql); }
async function query(sql, args = []) {
  if (isPg) return (await db.query(sql, args)).rows;
  return db.prepare(sql).all(...args);
}
async function run(sql, args = []) {
  if (isPg) return db.query(sql, args);
  return db.prepare(sql).run(...args);
}
async function close() { if (isPg) await db.close(); else db.close(); }
async function size(path) {
  const info = await stat(path);
  if (info.isFile()) return info.size;
  let total = 0;
  for (const name of await readdir(path)) total += await size(join(path, name));
  return total;
}
function percentile(samples, fraction) {
  const sorted = [...samples].sort((a, b) => a - b);
  return Number(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))].toFixed(3));
}
function rssMiB() { return Number((process.memoryUsage().rss / 1048576).toFixed(1)); }
const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

async function schema() {
  if (isPg) {
    await exec(`CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT '${owner}'::uuid $$;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE TABLE public.goals(id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id), title text NOT NULL, status text NOT NULL, archived_at timestamptz);
      CREATE TABLE public.projects(id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id), goal_id uuid REFERENCES public.goals(id), title text NOT NULL, status text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(), archived_at timestamptz);
      CREATE TABLE public.tasks(id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth.users(id), project_id uuid REFERENCES public.projects(id), goal_id uuid REFERENCES public.goals(id), title text NOT NULL, status text NOT NULL, planned_date date, completed_at timestamptz, archived_at timestamptz);
      INSERT INTO auth.users(id) VALUES ('${owner}');`);
    const source = await readFile(resolve("supabase/migrations/20260909174436_r2_10_task_dependencies.sql"), "utf8");
    const start = source.indexOf("alter table public.tasks add constraint tasks_graph_identity");
    const end = source.indexOf("revoke all on function public.guard_task_dependency()", start);
    let actual = source.slice(start, end);
    actual = actual.replace(/alter table public.task_dependencies enable row level security;[\s\S]*?(?=create function public.guard_task_dependency\(\))/m, "");
    await exec(actual);
    const lifecycleStart = source.indexOf("create function public.guard_task_dependency_lifecycle()");
    const lifecycleEnd = source.indexOf("revoke all on function public.guard_task_dependency_lifecycle()", lifecycleStart);
    await exec(source.slice(lifecycleStart, lifecycleEnd));
    const graphStart = source.indexOf("create function public.read_task_dependency_graph()");
    const graphEnd = source.indexOf("revoke all on function public.read_task_dependency_graph()", graphStart);
    await exec(source.slice(graphStart, graphEnd));
    await exec("CREATE INDEX tasks_today_idx ON public.tasks(user_id, planned_date, status);");
  } else {
    await exec(`CREATE TABLE goals(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL, status TEXT NOT NULL, archived_at TEXT);
      CREATE TABLE projects(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, goal_id TEXT REFERENCES goals(id), title TEXT NOT NULL, status TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, archived_at TEXT);
      CREATE TABLE tasks(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, project_id TEXT REFERENCES projects(id), goal_id TEXT REFERENCES goals(id), title TEXT NOT NULL, status TEXT NOT NULL, planned_date TEXT, completed_at TEXT, archived_at TEXT);
      CREATE UNIQUE INDEX tasks_graph_identity ON tasks(user_id, project_id, id);
      CREATE TABLE task_dependencies(id TEXT PRIMARY KEY, user_id TEXT NOT NULL, project_id TEXT NOT NULL,
        predecessor_task_id TEXT NOT NULL, successor_task_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CHECK(predecessor_task_id<>successor_task_id), UNIQUE(predecessor_task_id, successor_task_id),
        FOREIGN KEY(user_id,project_id,predecessor_task_id) REFERENCES tasks(user_id,project_id,id),
        FOREIGN KEY(user_id,project_id,successor_task_id) REFERENCES tasks(user_id,project_id,id));
      CREATE INDEX task_dependencies_successors ON task_dependencies(user_id,successor_task_id);
      CREATE INDEX tasks_today_idx ON tasks(user_id, planned_date, status);
      CREATE TRIGGER guard_dependency_insert BEFORE INSERT ON task_dependencies BEGIN
        SELECT RAISE(ABORT,'DEPENDENCY_TARGET') WHERE NOT EXISTS (
          SELECT 1 FROM projects p JOIN tasks a ON a.project_id=p.id AND a.user_id=p.user_id
            JOIN tasks b ON b.project_id=p.id AND b.user_id=p.user_id
          WHERE p.id=NEW.project_id AND p.user_id=NEW.user_id AND p.archived_at IS NULL
            AND a.id=NEW.predecessor_task_id AND b.id=NEW.successor_task_id
            AND a.archived_at IS NULL AND b.archived_at IS NULL);
        SELECT RAISE(ABORT,'DEPENDENCY_CYCLE') WHERE EXISTS (
          WITH RECURSIVE reachable(id) AS (
            SELECT NEW.successor_task_id UNION
            SELECT d.successor_task_id FROM task_dependencies d JOIN reachable r ON d.predecessor_task_id=r.id
            WHERE d.user_id=NEW.user_id AND d.project_id=NEW.project_id)
          SELECT 1 FROM reachable WHERE id=NEW.predecessor_task_id);
        SELECT RAISE(ABORT,'DEPENDENCY_COMPLETED_SUCCESSOR') WHERE EXISTS (
          SELECT 1 FROM tasks a JOIN tasks b ON b.id=NEW.successor_task_id
          WHERE a.id=NEW.predecessor_task_id AND b.status='done' AND (a.status<>'done' OR a.completed_at IS NULL));
      END;
      CREATE TRIGGER guard_task_completion BEFORE UPDATE OF status,completed_at ON tasks BEGIN
        SELECT RAISE(ABORT,'DEPENDENCY_BLOCKED') WHERE NEW.status='done' AND NEW.completed_at IS NOT NULL AND EXISTS (
          SELECT 1 FROM task_dependencies d JOIN tasks a ON a.id=d.predecessor_task_id
          WHERE d.successor_task_id=NEW.id AND d.user_id=NEW.user_id
            AND (a.status<>'done' OR a.completed_at IS NULL OR a.archived_at IS NOT NULL));
      END;
      CREATE TRIGGER guard_project_move BEFORE UPDATE OF project_id,user_id,id ON tasks BEGIN
        SELECT RAISE(ABORT,'DEPENDENCY_PROJECT_MOVE') WHERE EXISTS (
          SELECT 1 FROM task_dependencies d WHERE d.user_id=OLD.user_id
            AND (d.predecessor_task_id=OLD.id OR d.successor_task_id=OLD.id));
      END;`);
  }
}

async function seed() {
  await schema();
  for (let i = 0; i < goalIds.length; i++) await run(`INSERT INTO goals(id,user_id,title,status) VALUES(${p(1)},${p(2)},${p(3)},'active')`, [goalIds[i], owner, `Synthetic Goal ${i}`]);
  for (let i = 0; i < projectIds.length; i++) await run(`INSERT INTO projects(id,user_id,goal_id,title,status) VALUES(${p(1)},${p(2)},${p(3)},${p(4)},'active')`, [projectIds[i], owner, goalIds[i % goalIds.length], `Synthetic Project ${i}`]);
  for (let i = 0; i < taskIds.length; i++) await run(`INSERT INTO tasks(id,user_id,project_id,goal_id,title,status,planned_date) VALUES(${p(1)},${p(2)},${p(3)},${p(4)},${p(5)},'planned',${p(6)})`, [taskIds[i], owner, projectIds[i % projectIds.length], goalIds[i % goalIds.length], `Synthetic Task ${i}`, i % 3 ? today : "2026-09-25"]);
  const [predecessor, successor] = [taskIds[0], taskIds[20]];
  await run(`INSERT INTO task_dependencies(id,user_id,project_id,predecessor_task_id,successor_task_id) VALUES(${p(1)},${p(2)},${p(3)},${p(4)},${p(5)})`, [randomUUID(), owner, projectIds[0], predecessor, successor]);
  let blocked = false;
  try { await run(`UPDATE tasks SET status='done',completed_at=CURRENT_TIMESTAMP WHERE id=${p(1)}`, [successor]); }
  catch (error) { blocked = String(error).includes("DEPENDENCY_BLOCKED"); }
  if (!blocked) throw new Error("blocked successor completion was not rejected");
  let cycle = false;
  try { await run(`INSERT INTO task_dependencies(id,user_id,project_id,predecessor_task_id,successor_task_id) VALUES(${p(1)},${p(2)},${p(3)},${p(4)},${p(5)})`, [randomUUID(), owner, projectIds[0], successor, predecessor]); }
  catch (error) { cycle = String(error).includes("DEPENDENCY_CYCLE"); }
  if (!cycle) throw new Error("dependency cycle was not rejected");
  await run(`UPDATE tasks SET status='done',completed_at=CURRENT_TIMESTAMP WHERE id=${p(1)}`, [predecessor]);
  await run(`UPDATE tasks SET status='done',completed_at=CURRENT_TIMESTAMP WHERE id=${p(1)}`, [successor]);
  console.log(JSON.stringify({phase:"setup",engine,rows:{goals:10,projects:20,tasks:300,dependencies:1},proof:{blocked,cycle,released:true},dbBytes:await size(dbPath)}));
}

async function dashboard() {
  return query(`SELECT t.id,t.title,t.status,p.title AS project_title,g.title AS goal_title,
    (SELECT count(*) FROM task_dependencies d JOIN tasks predecessor ON predecessor.id=d.predecessor_task_id
      WHERE d.successor_task_id=t.id AND (predecessor.status<>'done' OR predecessor.completed_at IS NULL OR predecessor.archived_at IS NOT NULL)) AS blockers
    FROM tasks t LEFT JOIN projects p ON p.id=t.project_id AND p.user_id=t.user_id
      LEFT JOIN goals g ON g.id=t.goal_id AND g.user_id=t.user_id
    WHERE t.user_id=${p(1)} AND t.planned_date=${p(2)} AND t.archived_at IS NULL AND t.status<>'done'
    ORDER BY t.title LIMIT 30`, [owner,today]);
}
async function measure() {
  const started = performance.now();
  await open();
  const first = await dashboard();
  const startupMs = performance.now() - started;
  if (first.length !== 30) throw new Error("initial projection mismatch");
  const [target] = await query(`SELECT p.id AS project_id, p.goal_id FROM projects p WHERE p.user_id=${p(1)} ORDER BY p.title LIMIT 1`,[owner]);
  if (!target?.project_id || !target?.goal_id) throw new Error("project/goal fixture missing");
  for (let i=0;i<50;i++) await dashboard();
  const idleRssMiB = rssMiB();
  const idleCpuBefore = process.cpuUsage();
  await sleep(30000);
  const idleCpu = process.cpuUsage(idleCpuBefore);
  const idleCpuPercentCore = Number(((idleCpu.user+idleCpu.system)/300000).toFixed(2));
  const readMs=[];
  const navStarted=performance.now();
  let peakRssMiB=rssMiB();
  let navCount=0;
  while (performance.now()-navStarted < durationSeconds*1000) {
    const before=performance.now();
    const rows=await dashboard();
    readMs.push(performance.now()-before);
    if (rows.length!==30) throw new Error("navigation projection mismatch");
    const project = await query(`SELECT p.id,p.title,p.status,count(t.id) AS task_count FROM projects p LEFT JOIN tasks t ON t.project_id=p.id AND t.user_id=p.user_id AND t.archived_at IS NULL WHERE p.user_id=${p(1)} AND p.id=${p(2)} GROUP BY p.id,p.title,p.status`,[owner,target.project_id]);
    const goal = await query(`SELECT g.id,g.title,g.status,count(p.id) AS project_count FROM goals g LEFT JOIN projects p ON p.goal_id=g.id AND p.user_id=g.user_id AND p.archived_at IS NULL WHERE g.user_id=${p(1)} AND g.id=${p(2)} GROUP BY g.id,g.title,g.status`,[owner,target.goal_id]);
    if (project.length!==1 || goal.length!==1) throw new Error("detail navigation mismatch");
    navCount++;
    peakRssMiB=Math.max(peakRssMiB,rssMiB());
    await sleep(1000);
  }
  const navigationRssMiB=rssMiB();
  const writeMs=[];
  for (let i=0;i<30;i++) {
    const before=performance.now();
    await run(`INSERT INTO tasks(id,user_id,project_id,goal_id,title,status,planned_date) VALUES(${p(1)},${p(2)},${p(3)},${p(4)},${p(5)},'planned',${p(6)})`, [randomUUID(),owner,target.project_id,target.goal_id,`Synthetic measured write ${i}`,today]);
    writeMs.push(performance.now()-before);
  }
  const result={phase:"measure",engine,pid:process.pid,processCount:1,startupMs:Number(startupMs.toFixed(1)),idleRssMiB,idleCpuPercentCore,navigationSeconds:durationSeconds,navigationSamples:navCount,navigationRssMiB,peakRssMiB,readMs:{p50:percentile(readMs,.5),p95:percentile(readMs,.95)},writeMs:{p50:percentile(writeMs,.5),p95:percentile(writeMs,.95)},dbBytes:await size(dbPath)};
  console.log(JSON.stringify(result));
}

async function idleDiagnostic() {
  await open();
  for (let i=0;i<50;i++) await dashboard();
  const samples=[{second:0,rssMiB:rssMiB()}];
  for (let elapsed=30;elapsed<=durationSeconds;elapsed+=30) {
    await sleep(30000);
    samples.push({second:elapsed,rssMiB:rssMiB()});
  }
  console.log(JSON.stringify({phase:"idle",engine,pid:process.pid,samples}));
}

if (mode==="setup") { await mkdir(resolve(dbPath,".."),{recursive:true}); await open(); await seed(); await close(); }
else if (mode==="measure") { await measure(); await close(); }
else { await idleDiagnostic(); await close(); }
