import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import {
  createApplicationFixture,
  releaseApplicationFixture,
} from "./application-fixture.mjs";
import { startApplication } from "./application-process.mjs";

let passed = false;
const fixture = await createApplicationFixture({ resourceWorkload: true });
const app = await startApplication(fixture);
const awake =
  process.platform === "darwin"
    ? spawn("caffeinate", ["-i", "-w", String(process.pid)], {
        stdio: "ignore",
      })
    : undefined;
const browserServer = await chromium.launchServer({ headless: true });
const browser = await chromium.connect(browserServer.wsEndpoint());
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
});
await context.addCookies([
  { name: "life_os_profile", value: "manual", url: app.origin },
]);
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function processes() {
  return execFileSync("ps", ["-axo", "pid=,ppid=,rss=,time="], {
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .map((line) => {
      const [pid, parent, rss, time] = line.trim().split(/\s+/);
      const pieces = time.split(":").map(Number);
      const cpuSeconds = pieces.reduce((sum, part) => sum * 60 + part, 0);
      return {
        pid: Number(pid),
        parent: Number(parent),
        rssMiB: Number(rss) / 1024,
        cpuSeconds,
      };
    });
}
function sample() {
  const all = processes();
  const server = all.find((process) => process.pid === app.child.pid);
  assert.ok(server, "production server process exists");
  const browserPids = new Set([browserServer.process().pid]);
  let previous;
  do {
    previous = browserPids.size;
    for (const process of all)
      if (browserPids.has(process.parent)) browserPids.add(process.pid);
  } while (browserPids.size !== previous);
  return {
    at: Date.now(),
    server,
    browserMiB: all
      .filter((process) => browserPids.has(process.pid))
      .reduce((sum, process) => sum + process.rssMiB, 0),
  };
}
try {
  await page.goto(app.origin + "/dashboard");
  await sleep(15_000);
  const before = sample();
  await sleep(60_000);
  const idle = sample();
  const idleCpuPercent =
    ((idle.server.cpuSeconds - before.server.cpuSeconds) /
      ((idle.at - before.at) / 1000)) *
    100;
  const navigation = [];
  const routes = [
    "/dashboard",
    "/today",
    "/calendar",
    "/portfolio",
    "/inbox",
    `/tasks/${fixture.ids.task}`,
    `/projects/${fixture.ids.project}`,
    `/goals/${fixture.ids.goal}`,
    `/skills/${fixture.ids.skill}`,
    "/review/daily",
    "/nutrition",
    "/health/running",
    "/health/strength",
    "/life/journal",
    "/work",
    "/education",
  ];
  const started = performance.now();
  let index = 0;
  while (index < 24) {
    const route = routes[index++ % routes.length];
    const response = await page.goto(app.origin + route);
    assert.equal(response.status(), 200, route);
    navigation.push({ route, ...sample() });
    process.stdout.write(
      `Navigation ${index} ${route}: ${navigation.at(-1).server.rssMiB.toFixed(1)} MiB server\n`,
    );
    await sleep(25_000);
  }
  const report = {
    platform: `${process.platform}/${process.arch}`,
    startupMs: app.startupMs,
    idleServerMiB: idle.server.rssMiB,
    idleCpuPercent,
    navigationMs: performance.now() - started,
    peakServerMiB: Math.max(
      ...navigation.map((sample) => sample.server.rssMiB),
    ),
    peakBrowserMiB: Math.max(...navigation.map((sample) => sample.browserMiB)),
    errors,
    navigation,
  };
  writeFileSync(
    join(fixture.directory, "resource-evidence.json"),
    JSON.stringify(report, null, 2),
    { mode: 0o600 },
  );
  process.stdout.write(
    JSON.stringify({
      ...report,
      navigation: undefined,
      evidence: fixture.directory,
    }) + "\n",
  );
  assert.ok(
    report.navigationMs >= 600_000 && report.navigationMs <= 660_000,
    "uninterrupted ten-minute navigation window",
  );
  assert.deepEqual(errors, []);
  assert.ok(!app.output().match(/SQLITE_PROOF_.*_DENIED/));
  assert.ok(report.startupMs <= 5000, "startup <= 5 s");
  assert.ok(report.idleServerMiB <= 350, "idle server <= 350 MiB");
  assert.ok(
    report.peakServerMiB <= 600 && report.peakServerMiB <= 700,
    "navigation server + embedded DB budgets",
  );
  assert.ok(report.idleCpuPercent <= 2, "idle <= 2% of one core");
  passed = true;
} finally {
  await browser.close();
  await browserServer.close();
  await app.stop();
  awake?.kill();
  if (passed) releaseApplicationFixture(fixture);
}
