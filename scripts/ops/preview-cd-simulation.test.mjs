import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  mkdtempSync,
  realpathSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  initialState,
  deploy,
  launchAgent,
  LABEL,
} from "./preview-cd-core.mjs";
import {
  portOccupied,
  leaseFree,
  pause,
  operationalLock,
} from "./preview-cd-host.mjs";
import { fileURLToPath } from "node:url";

const source = process.cwd(),
  temporary = realpathSync(tmpdir());
const digest = (file) =>
  createHash("sha256").update(readFileSync(file)).digest("hex");
async function eventually(predicate, timeout = 15_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await pause(100);
  }
  assert.fail("FIXTURE_READINESS_TIMEOUT");
}

test("isolated compiler drains after invoking worker loss and serializes replacement builds", async () => {
  const root = mkdtempSync(join(temporary, "life-os-139-build-parent-")),
    ids = join(root, "ids.json");
  const fake = join(root, "pnpm-fixture.cjs"),
    parent = join(root, "parent.cjs");
  writeFileSync(
    fake,
    `#!/usr/bin/env node\nconst fs=require('fs'),{spawn}=require('child_process');const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});fs.writeFileSync(${JSON.stringify(ids)},JSON.stringify({compiler:process.pid,child:child.pid}),{mode:0o600});setInterval(()=>{},1000);`,
    { mode: 0o700 },
  );
  const runner = fileURLToPath(
    new URL("./preview-cd-build-command.mjs", import.meta.url),
  );
  writeFileSync(
    parent,
    `const {spawn}=require('child_process');spawn(process.execPath,${JSON.stringify([runner, fake, "build", root, source])},{detached:true,stdio:'ignore'});setInterval(()=>{},1000);`,
    { mode: 0o600 },
  );
  const invoking = spawn(process.execPath, [parent], { stdio: "ignore" });
  const exit = new Promise((r) => invoking.once("exit", r));
  const alive = (pid) => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  try {
    await eventually(() => {
      try {
        return JSON.parse(readFileSync(ids)).child > 1;
      } catch {
        return false;
      }
    });
    assert.throws(
      () => operationalLock(join(root, "build-lease.db"), source),
      /ALREADY_RUNNING/,
    );
    const owned = JSON.parse(readFileSync(ids));
    invoking.kill("SIGTERM");
    await exit;
    await eventually(() => !alive(owned.compiler) && !alive(owned.child));
    const unlock = operationalLock(join(root, "build-lease.db"), source);
    unlock();
  } finally {
    if (invoking.exitCode === null && invoking.signalCode === null) {
      invoking.kill("SIGTERM");
      await exit;
    }
  }
});

test("macOS-compatible real port/SQLite lease switch, failed health rollback and crash recovery", async () => {
  const root = mkdtempSync(join(temporary, "life-os-139-service-")),
    database = join(root, "fixture.db");
  const Database = createRequire(import.meta.url)("better-sqlite3"),
    db = new Database(database);
  db.exec(
    "CREATE TABLE fixture(id INTEGER PRIMARY KEY); INSERT INTO fixture VALUES(1)",
  );
  db.close();
  const before = digest(database),
    helper = join(root, "server.mjs");
  writeFileSync(
    helper,
    `import {createServer} from 'node:http';
import {operationalLock} from ${JSON.stringify(new URL("./preview-cd-host.mjs", import.meta.url).href)};
const [lease,source,port,build]=process.argv.slice(2),unlock=operationalLock(lease,source);
const server=createServer((q,r)=>r.end(build));server.listen(Number(port),'127.0.0.1',()=>console.log(JSON.stringify({port:server.address().port})));
process.once('SIGTERM',()=>server.close(()=>{unlock();process.exit(0)}));`,
    { mode: 0o600 },
  );
  const config = { database },
    state = initialState({ sha: "a".repeat(40), buildId: "A" });
  let child,
    port = 0,
    main = "b".repeat(40),
    rejectHealth = true,
    exit;
  async function stop() {
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    child.kill("SIGTERM");
    await exit;
  }
  async function start(release) {
    assert(!(await portOccupied(port || 1)));
    if (port) assert(leaseFree(config, source));
    child = spawn(
      process.execPath,
      [
        helper,
        `${database}.writer-lease.db`,
        source,
        String(port),
        release.buildId,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    exit = new Promise((r) => child.once("exit", r));
    const info = await new Promise((r, reject) => {
      child.stdout.once("data", (d) => r(JSON.parse(d.toString())));
      child.once("exit", () => reject(new Error("FIXTURE_SERVER_FAILED")));
    });
    port = info.port;
    assert.equal(leaseFree(config, source), false);
  }
  const io = {
    latest: async () => main,
    gate: async () => {},
    save: async () => {},
    commands: async () => {},
    prepare: async (sha) => ({ sha, buildId: sha[0].toUpperCase() }),
    preflight: async () => {},
    stop,
    free: async () => {
      await eventually(
        async () => !(await portOccupied(port)) && leaseFree(config, source),
      );
    },
    start,
    health: async (release) => {
      const served = await (await fetch(`http://127.0.0.1:${port}`)).text();
      assert.equal(served, release.buildId);
      if (rejectHealth && release.sha === "b".repeat(40))
        throw new Error("HEALTH_AUTH_BUILD_FAILED");
    },
  };
  try {
    await start(state.lastGood);
    await deploy(state, io);
    assert.equal(state.lastGood.buildId, "A");
    assert.equal(state.status, "failed");
    assert.equal(await (await fetch(`http://127.0.0.1:${port}`)).text(), "A");
    rejectHealth = false;
    main = "c".repeat(40);
    await deploy(state, io);
    assert.equal(state.lastGood.buildId, "C");
    assert.equal(state.status, "succeeded");
    child.kill("SIGKILL");
    await exit;
    await io.free();
    await start(state.lastGood);
    await io.health(state.lastGood);
    assert.equal(digest(database), before);
    writeFileSync(
      join(root, "evidence.json"),
      JSON.stringify({
        rollback: true,
        crashRecovery: true,
        singleWriter: true,
        databaseUnchanged: true,
        ephemeralPort: true,
      }),
      { mode: 0o600 },
    );
  } finally {
    await stop();
  }
});

test(
  "actual disposable launchd login/crash supervision cleans its owned child group",
  { skip: process.platform !== "darwin", timeout: 90_000 },
  async () => {
    const root = mkdtempSync(join(temporary, "life-os-139-launchd-"));
    const label = `${LABEL}.fixture.${randomUUID()}`,
      domain = `gui/${process.getuid()}`,
      file = join(root, "fixture.plist");
    const worker = join(root, "worker.cjs"),
      identity = join(root, "identity.json");
    writeFileSync(
      worker,
      `const fs=require('fs'),{spawn}=require('child_process');
const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});
fs.writeFileSync(${JSON.stringify(identity)},JSON.stringify({pid:process.pid,child:child.pid}),{mode:0o600});
process.on('SIGTERM',()=>child.kill('SIGTERM'));child.on('exit',()=>process.exit(0));`,
      { mode: 0o600 },
    );
    writeFileSync(
      file,
      launchAgent(process.execPath, worker, root).replace(LABEL, label),
      { mode: 0o600 },
    );
    const launchctl = (...args) =>
      execFileSync("/bin/launchctl", args, { stdio: "pipe" });
    const alive = (pid) => {
      try {
        process.kill(pid, 0);
        return true;
      } catch {
        return false;
      }
    };
    let installed = false;
    try {
      execFileSync("/usr/bin/plutil", ["-lint", file]);
      launchctl("bootstrap", domain, file);
      installed = true;
      await eventually(() => {
        try {
          return JSON.parse(readFileSync(identity)).child > 1;
        } catch {
          return false;
        }
      });
      const first = JSON.parse(readFileSync(identity));
      assert(alive(first.child));
      process.kill(first.pid, "SIGKILL");
      await eventually(() => !alive(first.child));
      await eventually(
        () => JSON.parse(readFileSync(identity)).pid !== first.pid,
        45_000,
      );
      const restarted = JSON.parse(readFileSync(identity));
      assert(alive(restarted.child));
      launchctl("bootout", `${domain}/${label}`);
      installed = false;
      await eventually(() => !alive(restarted.pid) && !alive(restarted.child));
      writeFileSync(
        join(root, "evidence.json"),
        JSON.stringify({
          runAtLoad: true,
          keepAlive: true,
          crashGroupCleanup: true,
          gracefulUnload: true,
          fixtureUnregistered: true,
        }),
        { mode: 0o600 },
      );
    } finally {
      if (installed) launchctl("bootout", `${domain}/${label}`);
    }
  },
);
