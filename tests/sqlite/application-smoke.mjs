import assert from "node:assert/strict";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import {
  createApplicationFixture,
  releaseApplicationFixture,
} from "./application-fixture.mjs";
import { startApplication } from "./application-process.mjs";

let passed = false;
const fixture = await createApplicationFixture();
let app;
const cookie = "life_os_profile=manual";
const decode = (s) =>
  s
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
async function read(route) {
  const response = await fetch(app.origin + route, { headers: { cookie } });
  assert.equal(response.status, 200, route);
  const html = await response.text();
  assert.ok(!html.includes(fixture.path), "DB path leaked");
  assert.ok(!html.includes('"digest"'), `${route}: RSC error`);
  return html;
}
try {
  app = await startApplication(fixture);
  assert.ok(app.startupMs <= 5000);
  for (const route of [
    "/dashboard",
    "/today",
    "/calendar",
    "/portfolio",
    `/projects/${fixture.ids.project}`,
    `/goals/${fixture.ids.goal}`,
    `/skills/${fixture.ids.skill}`,
    "/nutrition",
    "/health/running",
    "/shop",
  ])
    await read(route);
  const dashboard = await read("/dashboard");
  const form = [...dashboard.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)]
    .map((m) => m[1])
    .find((s) => s.includes('name="content"'));
  assert.ok(form, "normal Quick Thought form");
  const data = new FormData();
  for (const input of form.matchAll(/<input\b([^>]*)>/g)) {
    const name = input[1].match(/name="([^"]*)"/)?.[1];
    const value = input[1].match(/value="([^"]*)"/)?.[1] ?? "";
    if (name) data.append(decode(name), decode(value));
  }
  data.set("content", "SQLite Linux application write");
  data.set("userId", "forged-owner");
  data.set("profileId", "forged-profile");
  const response = await fetch(app.origin + "/dashboard", {
    method: "POST",
    headers: { cookie, origin: app.origin },
    body: data,
  });
  assert.ok(response.ok || response.status === 303);
  await response.arrayBuffer();
  assert.ok((await read("/inbox")).includes("SQLite Linux application write"));
  await app.stop();
  app = await startApplication(fixture);
  assert.ok((await read("/inbox")).includes("SQLite Linux application write"));
  await app.stop("SIGKILL");
  app = await startApplication(fixture);
  assert.ok((await read("/inbox")).includes("SQLite Linux application write"));
  const require = createRequire(import.meta.url);
  const { restoreSyntheticBackup, inspectSyntheticDatabase } = require(
    join(fixture.compiled, "recovery.js"),
  );
  const directory = mkdtempSync(
    join(realpathSync(tmpdir()), "life-os-116-restored-"),
  );
  fixture.disposableDirectories.push(directory);
  const restored = {
    ...fixture,
    directory,
    path: join(directory, "restored.db"),
  };
  await restoreSyntheticBackup(fixture.path, restored.path);
  assert.deepEqual(
    inspectSyntheticDatabase(fixture.path),
    inspectSyntheticDatabase(restored.path),
  );
  await app.stop();
  app = await startApplication(restored);
  assert.ok((await read("/inbox")).includes("SQLite Linux application write"));
  for (const route of [
    "/dashboard",
    "/today",
    `/tasks/${fixture.ids.task}`,
    `/projects/${fixture.ids.project}`,
    `/goals/${fixture.ids.goal}`,
    `/skills/${fixture.ids.skill}`,
    "/review/daily",
    "/nutrition",
    "/health/running",
    "/health/strength",
    "/shop",
  ])
    await read(route);
  await app.stop();
  app = await startApplication(fixture, { authentication: "blocked" });
  const blocked = await read("/dashboard");
  assert.ok(blocked.includes("Manual-Daten gesperrt"));
  assert.ok(!blocked.includes("SQLite synthetic Task"));
  process.stdout.write(
    `SQLITE_PRODUCTION_APPLICATION_SMOKE_PASS ${process.platform}/${process.arch}; sealed runtime, server reads/action, owner forgery ignored, restart/SIGKILL, online backup/restored app, auth-blocked; no Supabase prerequisites\n`,
  );
  passed = true;
} finally {
  if (app && app.child.exitCode === null && app.child.signalCode === null)
    await app.stop();
  if (passed) releaseApplicationFixture(fixture);
}
