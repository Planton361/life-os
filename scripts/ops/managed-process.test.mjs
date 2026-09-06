import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createProcessScope } from "./managed-process.mjs";
import { acquireRuntimeLock } from "./runtime-lock.mjs";

const moduleUrl = new URL("./managed-process.mjs", import.meta.url).href;
function gone(pid) {
  try {
    process.kill(pid, 0);
    return false;
  } catch (e) {
    return e.code === "ESRCH";
  }
}
async function waitFor(check) {
  const end = Date.now() + 5_000;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 20));
  }
  assert.fail("Expected process lifecycle transition did not occur");
}
test("success, nonzero exit and spawn failure remain visible", async () => {
  const scope = createProcessScope();
  try {
    assert.equal(
      (
        await scope.run(process.execPath, ["-e", "console.log('ready')"])
      ).stdout.trim(),
      "ready",
    );
    assert.equal(
      (await scope.run(process.execPath, ["-e", "process.exit(7)"])).code,
      7,
    );
    assert.equal((await scope.run("/no-such-life-os-command", [])).ok, false);
  } finally {
    await scope.close();
  }
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  test(`${signal} cleans the owned child and grandchild`, async () => {
    const root = await mkdtemp(join(tmpdir(), "life-os-process-test-"));
    const marker = join(root, "pids");
    const childCode = `const {spawn}=require('node:child_process'); const p=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});require('node:fs').writeFileSync(${JSON.stringify(marker)},JSON.stringify([process.pid,p.pid]));setInterval(()=>{},1000)`;
    const wrapper = spawn(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `import {createProcessScope} from '${moduleUrl}';const s=createProcessScope({graceMs:500});try{await s.run(process.execPath,['-e',${JSON.stringify(childCode)}]);}finally{await s.close();}`,
      ],
      { stdio: "ignore" },
    );
    let pids = [];
    try {
      await waitFor(async () => {
        try {
          pids = JSON.parse(await readFile(marker, "utf8"));
          return true;
        } catch {
          return false;
        }
      });
      wrapper.kill(signal);
      await waitFor(() => gone(wrapper.pid));
      await waitFor(() => pids.every(gone));
    } finally {
      wrapper.kill("SIGKILL");
      for (const pid of pids) if (!gone(pid)) process.kill(pid, "SIGKILL");
      await rm(root, { recursive: true, force: true });
    }
  });
}
test("runtime lock rejects duplicates and releases without a stale file", async () => {
  const release = await acquireRuntimeLock("test");
  await assert.rejects(acquireRuntimeLock("test"), /ALREADY_RUNNING/);
  await release();
  await (
    await acquireRuntimeLock("test")
  )();
});
test("partial disposable start failure still stops only its own project", async () => {
  const root = await mkdtemp(join(tmpdir(), "life-os-runner-test-"));
  const marker = join(root, "stopped");
  await mkdir(join(root, "supabase"));
  await writeFile(join(root, "supabase/config.toml"), 'project_id = "test"\n');
  const bin = join(root, "pnpm");
  await writeFile(
    bin,
    `#!${process.execPath}\nconst a=process.argv.slice(2);if(a.includes('start'))process.exit(1);if(a.includes('stop')){require('node:fs').writeFileSync(${JSON.stringify(marker)},JSON.stringify(a));process.exit(0);}process.exit(2);`,
    { mode: 0o700 },
  );
  const scope = createProcessScope();
  try {
    const result = await scope.run(
      process.execPath,
      [
        resolve("scripts/playwright/run-disposable-local-e2e.mjs"),
        "test.spec.ts",
      ],
      {
        cwd: root,
        env: { ...process.env, PATH: `${root}:${process.env.PATH}` },
      },
    );
    assert.equal(result.ok, false);
    const args = JSON.parse(await readFile(marker, "utf8"));
    assert.match(
      args[args.indexOf("--project-id") + 1],
      /^life-os-z1-e2e-\d+-\d+$/,
    );
    assert.ok(!args.includes("--all") && !args.includes("--no-backup"));
  } finally {
    await scope.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("development heap budget prevents Next's half-RAM default without overriding explicit flags", async () => {
  const { developmentEnv } = await import("./next-memory-budget.mjs");
  assert.equal(developmentEnv({}).NODE_OPTIONS, "--max-old-space-size=4096");
  assert.equal(
    developmentEnv({ NODE_OPTIONS: "--enable-source-maps" }).NODE_OPTIONS,
    "--enable-source-maps --max-old-space-size=4096",
  );
  assert.equal(
    developmentEnv({ NODE_OPTIONS: "--max_old_space_size=3072" }).NODE_OPTIONS,
    "--max_old_space_size=3072",
  );
});

test("failed parent does not leave an ordinary long-running grandchild", async () => {
  const scope = createProcessScope({ graceMs: 500 });
  try {
    const result = await scope.run(process.execPath, [
      "-e",
      "const p=require('node:child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});console.log(p.pid);setTimeout(()=>process.exit(7),50)",
    ]);
    assert.equal(result.code, 7);
    await waitFor(() => gone(Number(result.stdout.trim())));
  } finally {
    await scope.close();
  }
});

test("loss of the invoking parent triggers owned-child cleanup", async () => {
  const root = await mkdtemp(join(tmpdir(), "life-os-parent-test-"));
  const marker = join(root, "pids");
  const worker = `require('node:fs').writeFileSync(${JSON.stringify(marker)},JSON.stringify([process.ppid,process.pid]));setInterval(()=>{},1000)`;
  const wrapperCode = `import {createProcessScope} from '${moduleUrl}';const s=createProcessScope({graceMs:500});try{await s.run(process.execPath,['-e',${JSON.stringify(worker)}]);}finally{await s.close();}`;
  const parent = spawn(
    process.execPath,
    [
      "-e",
      `require('node:child_process').spawn(process.execPath,['--input-type=module','-e',${JSON.stringify(wrapperCode)}],{stdio:'ignore'});setInterval(()=>{},1000)`,
    ],
    { stdio: "ignore" },
  );
  let pids = [];
  try {
    await waitFor(async () => {
      try {
        pids = JSON.parse(await readFile(marker, "utf8"));
        return true;
      } catch {
        return false;
      }
    });
    parent.kill("SIGTERM");
    await waitFor(() => pids.every(gone));
  } finally {
    parent.kill("SIGKILL");
    for (const pid of pids) if (!gone(pid)) process.kill(pid, "SIGKILL");
    await rm(root, { recursive: true, force: true });
  }
});

test("disposable browser temp files stay in the owned cache and disappear after success", async () => {
  const root = await mkdtemp(join(tmpdir(), "life-os-temp-test-"));
  const marker = join(root, "browser-temp");
  await mkdir(join(root, "supabase"));
  await writeFile(join(root, "supabase/config.toml"), 'project_id = "test"\n');
  await writeFile(
    join(root, "pnpm"),
    `#!${process.execPath}\nconst a=process.argv.slice(2);if(a.includes('status'))console.log('API_URL="http://127.0.0.1:54321"\\nANON_KEY="public-test-value"');if(a.includes('playwright'))require('node:fs').writeFileSync(${JSON.stringify(marker)},process.env.TMPDIR);`,
    { mode: 0o700 },
  );
  const scope = createProcessScope();
  try {
    const result = await scope.run(
      process.execPath,
      [
        resolve("scripts/playwright/run-disposable-local-e2e.mjs"),
        "test.spec.ts",
      ],
      {
        cwd: root,
        env: { ...process.env, PATH: `${root}:${process.env.PATH}` },
      },
    );
    assert.equal(result.code, 0, result.stderr);
    const location = await readFile(marker, "utf8");
    assert.ok(
      location.startsWith(
        join(root, "node_modules/.cache/life-os-runtime/e2e-"),
      ),
    );
    await assert.rejects(readFile(join(location, "supabase/config.toml")), {
      code: "ENOENT",
    });
  } finally {
    await scope.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("failed disposable cleanup stays visible and retains its owned recovery workdir", async () => {
  const root = await mkdtemp(join(tmpdir(), "life-os-cleanup-test-"));
  const marker = join(root, "recovery-path");
  await mkdir(join(root, "supabase"));
  await writeFile(join(root, "supabase/config.toml"), 'project_id = "test"\n');
  await writeFile(
    join(root, "pnpm"),
    `#!${process.execPath}\nconst a=process.argv.slice(2);if(a.includes('stop'))require('node:fs').writeFileSync(${JSON.stringify(marker)},a[a.indexOf('--workdir')+1]);process.exit(1);`,
    { mode: 0o700 },
  );
  const scope = createProcessScope();
  try {
    const result = await scope.run(
      process.execPath,
      [
        resolve("scripts/playwright/run-disposable-local-e2e.mjs"),
        "test.spec.ts",
      ],
      {
        cwd: root,
        env: { ...process.env, PATH: `${root}:${process.env.PATH}` },
      },
    );
    assert.equal(result.code, 1);
    assert.match(result.stderr, /DISPOSABLE_E2E_CLEANUP_FAILED/);
    const recovery = await readFile(marker, "utf8");
    assert.match(
      await readFile(join(recovery, "supabase/config.toml"), "utf8"),
      /life-os-z1-e2e-/,
    );
  } finally {
    await scope.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("canonical guard keeps identity checks when its command is managed", async () => {
  const { assertCanonicalTargetRuntime, CANONICAL_TARGET_PROJECT } =
    await import("./local-runtime-contract.mjs");
  const inspection = {
    State: { Running: true },
    Config: {
      Labels: {
        "com.docker.compose.project": CANONICAL_TARGET_PROJECT,
        "com.supabase.cli.project": CANONICAL_TARGET_PROJECT,
      },
    },
    NetworkSettings: { Ports: { "5432/tcp": [{ HostPort: "54322" }] } },
  };
  const runCommand = async (command, args) => {
    assert.equal(command, "docker");
    assert.deepEqual(args, [
      "inspect",
      `supabase_db_${CANONICAL_TARGET_PROJECT}`,
    ]);
    return { ok: true, code: 0, stdout: JSON.stringify([inspection]) };
  };
  assert.equal(
    (await assertCanonicalTargetRuntime(runCommand)).projectId,
    CANONICAL_TARGET_PROJECT,
  );
  inspection.Config.Labels["com.supabase.cli.project"] = "wrong-project";
  await assert.rejects(
    assertCanonicalTargetRuntime(runCommand),
    /IDENTITY_MISMATCH/,
  );
});
