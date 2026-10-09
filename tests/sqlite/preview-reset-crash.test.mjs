import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, realpathSync, mkdirSync, writeFileSync, lstatSync } from "node:fs";
import { tmpdir, hostname } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { compileRuntime } from "./compile-runtime.mjs";

test("SIGKILL during admitted DELETE rolls back owned data/epoch/receipt and releases the kernel lease", async () => {
  const root = mkdtempSync(join(realpathSync(tmpdir()), "life-os-142-crash-")), release = join(root, "release"), path = join(root, "canonical.db"), owner = randomUUID();
  mkdirSync(release, { mode: 0o700 }); mkdirSync(join(release, ".next"), { mode: 0o700 });
  writeFileSync(join(release, ".next/BUILD_ID"), "disposable-crash");
  writeFileSync(join(release, ".next/life-preview-composition.json"), JSON.stringify({ version: 2, buildId: "disposable-crash" }), { mode: 0o600 });
  const compiled = compileRuntime(["src/features/real-data/sqlite/production-bootstrap.ts"]), require = createRequire(import.meta.url), native = name => require(join(compiled, `${name}.js`));
  native("production-bootstrap").bootstrapProductionDatabase(path, { ownerId: owner, displayName: "Disposable crash proof", timezone: "Europe/Berlin" });
  let store = new (native("runtime").SqliteRuntime)(path), context = native("owner-context").issueOwnerContext(owner);
  store.command(context, "retained.journal", db => db.prepare("INSERT INTO journal_entries(id,user_id,entry_date,title,body,created_at,updated_at) VALUES(?,?,'2026-10-09','Crash fixture','Must survive crash',life_now(),life_now())").run(randomUUID(), owner));
  const snapshot = () => store.read(context, db => JSON.stringify({ rows: native("canonical-catalog").canonicalTableNames.map(t => [t, db.prepare(`SELECT * FROM ${t} ORDER BY rowid`).all()]), metadata: db.prepare("SELECT dataset_epoch,data_revision,reset_receipt FROM runtime_metadata").get() }, (_, v) => typeof v === "bigint" ? String(v) : v));
  const before = snapshot(); store.close();
  const identity = lstatSync(path), grantPath = join(root, "grant.json"), policy = { path, owner, origin: "https://fixture.ts.net", login: "fixture@example.test" };
  writeFileSync(grantPath, JSON.stringify({ version: 2, schema: 10, instance: randomUUID(), host: hostname(), uid: process.getuid(), device: identity.dev, inode: identity.ino, ...{ owner, origin: policy.origin, login: policy.login } }), { mode: 0o600 });
  const script = join(root, "crash-worker.cjs");
  writeFileSync(script, `
process.env.LIFE_OS_BUILD_COMPOSITION='personal-preview-v2';
global.__lifeOsPreviewLaunch={grantPath:${JSON.stringify(grantPath)},releasePath:process.cwd(),buildId:'disposable-crash',pid:process.pid};
const native=n=>require(${JSON.stringify(compiled)}+'/'+n+'.js');
const plan=native('preview-reset-plan'), original=plan.deletePreviewDataset;
plan.deletePreviewDataset=(db,owner)=>{original(db,owner);process.send({event:'RESET_TRANSACTION_OPEN'});Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,30000);};
const store=new (native('runtime').SqliteRuntime)(${JSON.stringify(path)}), context=native('owner-context').issueOwnerContext(${JSON.stringify(owner)}), admission=native('preview-grant').admitPreviewReset(${JSON.stringify(policy)},'crash-session');
const c=store.preparePreviewReset(context,admission);store.executePreviewReset(context,admission,{...c,confirmation:'ZURÜCKSETZEN'});
`, { mode: 0o600 });
  const child = spawn(process.execPath, [script], { cwd: release, env: { PATH: process.env.PATH }, stdio: ["ignore", "ignore", "pipe", "ipc"] });
  let diagnostics = ""; child.stderr.on("data", b => diagnostics += b);
  const exited = new Promise(r => child.once("exit", (code, signal) => r({ code, signal })));
  const timer = setTimeout(() => child.kill("SIGKILL"), 10000);
  try {
    const state = await Promise.race([new Promise(r => child.once("message", r)), exited]);
    assert.equal(state.event, "RESET_TRANSACTION_OPEN", diagnostics);
    child.kill("SIGKILL"); assert.equal((await exited).signal, "SIGKILL");
    store = new (native("runtime").SqliteRuntime)(path);
    assert.equal(snapshot(), before); assert.equal(lstatSync(path).ino, identity.ino);
  } finally { clearTimeout(timer); if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL"); store.close(); }
});
