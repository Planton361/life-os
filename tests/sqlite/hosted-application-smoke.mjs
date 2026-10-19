import { freePort } from "./application-process.mjs";
import assert from "node:assert/strict";
import { mkdtempSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { request as httpRequest } from "node:http";
import { fileURLToPath } from "node:url";
import { productionDatabaseModule } from "../../scripts/ops/sqlite-server-modules.mjs";

// Disposable production-classified database. No synthetic initializer/authentication.
const directory = mkdtempSync(
  join(realpathSync(tmpdir()), "life-os-118-production-smoke-"),
);
const path = join(directory, "canonical.db");
const ownerId = "11800000-0000-4000-8000-000000000001";
const ownerLogin = "owner@example.invalid";
const privateOrigin = "https://life-os.owner-tailnet.ts.net";
const port = await freePort();
const backend = `http://127.0.0.1:${port}`;
const environment = {
  PATH: process.env.PATH,
  LIFE_OS_DISPOSABLE_HOSTED_PORT: String(port),
  TMPDIR: realpathSync(tmpdir()),
  NODE_ENV: "production",
  LIFE_OS_APPLICATION_RUNTIME: "sqlite-hosted",
  LIFE_OS_HOSTED_SQLITE_PATH: path,
  LIFE_OS_HOSTED_ORIGIN: privateOrigin,
  LIFE_OS_HOSTED_OWNER_LOGIN: ownerLogin,
};
const gateway = {
  host: new URL(privateOrigin).host,
  "tailscale-user-login": ownerLogin,
  cookie: "life_os_profile=manual",
};
const { bootstrapProductionDatabase, verifyProductionApplicationDatabase } =
  productionDatabaseModule();
const bootstrap = spawnSync(
  process.execPath,
  ["--conditions=react-server", "scripts/ops/bootstrap-production-sqlite.mjs"],
  {
    env: {
      ...environment,
      LIFE_OS_BOOTSTRAP_OWNER_ID: ownerId,
      LIFE_OS_BOOTSTRAP_DISPLAY_NAME: "Disposable production owner",
      LIFE_OS_BOOTSTRAP_TIMEZONE: "Europe/Berlin",
    },
    encoding: "utf8",
  },
);
assert.equal(bootstrap.status, 0, bootstrap.stderr);
assert.ok(bootstrap.stdout.includes("canonical=83/83 ready=1"));
assert.equal(
  verifyProductionApplicationDatabase(path).datasetKind,
  "canonical",
);
assert.throws(() =>
  bootstrapProductionDatabase(path, {
    ownerId,
    displayName: "Duplicate",
    timezone: "Europe/Berlin",
  }),
);

// Node 24 fetch ignores a custom Host header. Use HTTP transport to model the
// accepted gateway forwarding the private Host to the loopback backend.
async function gatewayFetch(url, init = {}) {
  const headers = { ...init.headers };
  let body;
  if (init.body) {
    const encoded = new Request(url, { method: init.method, body: init.body });
    headers["content-type"] = encoded.headers.get("content-type");
    body = Buffer.from(await encoded.arrayBuffer());
    headers["content-length"] = String(body.length);
  }
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      url,
      { method: init.method ?? "GET", headers },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () =>
          resolve(
            new Response(Buffer.concat(chunks), {
              status: response.statusCode,
            }),
          ),
        );
        response.on("error", reject);
      },
    );
    request.on("error", reject);
    request.end(body);
  });
}

let app;
async function start() {
  const child = spawn(
    process.execPath,
    [
      "--import",
      fileURLToPath(new URL("./disposable-hosted-port.mjs", import.meta.url)),
      "--import",
      fileURLToPath(new URL("./no-supabase-network.mjs", import.meta.url)),
      "scripts/ops/run-production.mjs",
    ],
    { env: environment, stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  child.stdout.on("data", (b) => (output += b));
  child.stderr.on("data", (b) => (output += b));
  const exited = new Promise((resolve) =>
    child.once("exit", (code, signal) => resolve({ code, signal })),
  );
  const current = { child, exited, output: () => output };
  app = current;
  const deadline = performance.now() + 15_000;
  while (performance.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null)
      throw new Error(output);
    try {
      const response = await gatewayFetch(backend + "/today", {
        headers: gateway,
      });
      const html = await response.text();
      if (
        response.ok &&
        html.includes("life-os-canvas") &&
        !html.includes('"digest"')
      )
        return current;
    } catch {
      /* listener still starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`HOSTED_START_TIMEOUT\n${output}`);
}
async function stop() {
  if (!app || app.child.exitCode !== null || app.child.signalCode !== null)
    return;
  app.child.kill("SIGTERM");
  let timer;
  try {
    const result = await Promise.race([
      app.exited,
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("HOSTED_SHUTDOWN_TIMEOUT")),
          10_000,
        );
      }),
    ]);
    assert.equal(result.code, 143, app.output());
  } finally {
    clearTimeout(timer);
    if (app.child.exitCode === null && app.child.signalCode === null)
      app.child.kill("SIGKILL");
  }
}
async function read(route, headers = gateway) {
  const response = await gatewayFetch(backend + route, { headers });
  assert.equal(response.status, 200, route);
  const html = await response.text();
  assert.ok(!html.includes('"digest"'), route + ": RSC error");
  assert.ok(!html.includes(path), "DB path leaked");
  assert.ok(!html.includes(ownerId), "owner identity leaked");
  return html;
}
const decode = (s) =>
  s
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
function actionForm(html, content) {
  const form = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)]
    .map((m) => m[1])
    .find((s) => s.includes('name="content"'));
  assert.ok(form, "normal Quick Thought Server Action");
  const data = new FormData();
  for (const input of form.matchAll(/<input\b([^>]*)>/g)) {
    const name = input[1].match(/name="([^"]*)"/)?.[1];
    const value = input[1].match(/value="([^"]*)"/)?.[1] ?? "";
    if (name) data.append(decode(name), decode(value));
  }
  data.set("content", content);
  data.set("userId", "forged-owner");
  data.set("profileId", "forged-profile");
  return data;
}
try {
  await start();
  const dashboard = await read("/dashboard");
  assert.ok(!dashboard.includes("Manual-Daten gesperrt"));
  const marker = `Fresh hosted restart ${Date.now()}`;
  const write = await gatewayFetch(backend + "/dashboard", {
    method: "POST",
    headers: { ...gateway, origin: privateOrigin },
    body: actionForm(dashboard, marker),
    redirect: "manual",
  });
  assert.ok(write.ok || write.status === 303, `write ${write.status}`);
  await write.arrayBuffer();
  assert.ok((await read("/inbox")).includes(marker), "real write readback");
  for (const override of [
    { "tailscale-user-login": "" },
    { "tailscale-user-login": "other@example.invalid" },
    { "tailscale-user-login": `${ownerLogin}, ${ownerLogin}` },
    { host: "attacker.invalid" },
    { "x-forwarded-host": "attacker.invalid" },
  ]) {
    const headers = { ...gateway, ...override };
    const blocked = await read("/inbox?userId=forged-browser-owner", headers);
    assert.ok(
      blocked.includes("Manual-Daten gesperrt"),
      "read auth fail closed",
    );
    assert.ok(!blocked.includes(marker), "unauthenticated data leaked");
  }
  for (const override of [
    { "tailscale-user-login": "" },
    { origin: "https://evil.invalid" },
    { "x-forwarded-host": "evil.invalid" },
    { "sec-fetch-site": "cross-site" },
  ]) {
    const rejected = `Denied hosted write ${JSON.stringify(override)}`;
    const response = await gatewayFetch(backend + "/dashboard", {
      method: "POST",
      headers: { ...gateway, origin: privateOrigin, ...override },
      body: actionForm(dashboard, rejected),
      redirect: "manual",
    });
    await response.arrayBuffer();
    assert.ok(
      !(await read("/inbox")).includes(rejected),
      "denied request wrote data",
    );
  }
  await read("/settings");
  await stop();
  await start();
  assert.ok((await read("/inbox")).includes(marker), "restart persistence");
  await stop();
  assert.equal(
    verifyProductionApplicationDatabase(path).datasetKind,
    "canonical",
  );
  process.stdout.write(
    "HOSTED_PRODUCTION_SMOKE_PASS: canonical 83/83, regular runtime, gateway Manual read/action write, owner forgery ignored, auth/origin negatives, restart; owned ephemeral loopback port; no Supabase/Postgres/Docker\n",
  );
} finally {
  await stop();
}
