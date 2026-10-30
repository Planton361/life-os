import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFileSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { chromium } from "@playwright/test";
import {
  createRouteDiagnostics,
  routeTemplate,
} from "./browser-route-diagnostics.mjs";

test("route diagnostics allow only bounded, finite, redacted events and protected files", async () => {
  const output = resolve("test-results/issue-160", `privacy-${randomUUID()}`);
  const diagnostics = createRouteDiagnostics({ output });
  const page = new EventEmitter();
  const origin = "http://127.0.0.1:12345";
  page.isClosed = () => false;
  page.url = () => `${origin}/goals/new?cookie=PRIVATE_SECRET`;
  page.locator = () => ({ first: () => ({ isVisible: async () => false }) });
  page.screenshot = async () => Buffer.from("DISPOSABLE_SCREENSHOT");
  const app = { origin, child: { exitCode: null, signalCode: null } };
  diagnostics.attach(page, app);
  diagnostics.begin("/goals/new?token=PRIVATE_SECRET", "keyboard");
  const request = {
    url: () => `${origin}/goals/new?token=PRIVATE_SECRET`,
    resourceType: () => "fetch",
    headers: () => ({
      rsc: "1",
      authorization: "PRIVATE_SECRET",
      cookie: "PRIVATE_SECRET",
    }),
    failure: () => ({ errorText: "PRIVATE_SECRET" }),
  };
  page.emit("request", request);
  page.emit("response", {
    request: () => request,
    status: () => 200,
    headers: () => ({
      "content-type": "text/x-component; private=PRIVATE_SECRET",
    }),
  });
  page.emit("requestfailed", request);
  page.emit("pageerror", { message: "PRIVATE_SECRET hydration" });
  page.emit("console", { type: () => "error", text: () => "PRIVATE_SECRET" });
  const result = await diagnostics.finish({ failed: true, app });
  const path = join(output, "route-diagnostics", "diagnostic.json");
  const json = readFileSync(path, "utf8");
  assert.doesNotMatch(
    json,
    /PRIVATE_SECRET|127\.0\.0\.1|12345|authorization|cookie|token/i,
  );
  assert.equal(result.result, "failed");
  assert.equal(result.target, "/goals/new");
  assert.equal(result.content, "not_visible");
  assert.equal(result.process.state, "observed_running");
  assert.equal(result.screenshot, "captured");
  assert.equal(
    result.events.find((e) => e.event === "request_failed").category,
    "other",
  );
  assert.equal(
    result.events.find((e) => e.event === "response").contentType,
    "text/x-component",
  );
  assert.equal(statSync(path).mode & 0o777, 0o600);
  assert.equal(
    statSync(join(output, "route-diagnostics", "failure.png")).mode & 0o777,
    0o600,
  );
  assert.ok(Buffer.byteLength(json) < 64 * 1024);
  assert.equal(
    routeTemplate(
      "https://secret.invalid/projects/123e4567-e89b-12d3-a456-426614174000?key=private",
    ),
    "/projects/[id]",
  );
  assert.equal(routeTemplate("/projects/PRIVATE_SECRET"), "other");
});

test("event ring stays bounded and a missing page remains unknown", async () => {
  const output = resolve("test-results/issue-170", `privacy-${randomUUID()}`);
  const diagnostics = createRouteDiagnostics({ output });
  for (let i = 0; i < 5000; i++)
    diagnostics.begin("/dashboard?secret=PRIVATE", "click");
  const result = await diagnostics.finish({ failed: true });
  assert.equal(result.events.length, 350);
  assert.equal(result.screenshot, "page_unavailable");
  assert.equal(result.process.state, "unavailable");
  assert.doesNotMatch(
    readFileSync(join(output, "route-diagnostics", "diagnostic.json"), "utf8"),
    /PRIVATE|secret/i,
  );
});

test("a screenshot or visibility failure is categorized without masking the original failure", async () => {
  const output = resolve("test-results/issue-160", `capture-${randomUUID()}`);
  const diagnostics = createRouteDiagnostics({ output });
  const page = new EventEmitter();
  const origin = "http://127.0.0.1:12345";
  page.isClosed = () => false;
  page.url = () => `${origin}/goals/new`;
  page.locator = () => ({
    first: () => ({
      isVisible: async () => {
        throw new Error("PRIVATE_VISIBILITY");
      },
    }),
  });
  page.screenshot = async () => {
    throw new Error("PRIVATE_SCREENSHOT");
  };
  diagnostics.attach(page, {
    origin,
    child: { exitCode: 17, signalCode: null },
  });
  diagnostics.begin("/goals/new", "click");
  diagnostics.failure(
    new assert.AssertionError({ message: "PRIVATE_ORIGINAL" }),
  );
  const result = await diagnostics.finish({
    failed: true,
    app: { child: { exitCode: 17, signalCode: null } },
  });
  assert.equal(result.result, "failed");
  assert.equal(result.content, "unknown");
  assert.equal(result.failureCategory, "assertion");
  assert.equal(result.dom, null);
  assert.equal(result.screenshot, "capture_failed");
  assert.deepEqual(result.process, { state: "exited", code: 17, signal: null });
  assert.doesNotMatch(
    readFileSync(join(output, "route-diagnostics", "diagnostic.json"), "utf8"),
    /PRIVATE/,
  );
});

test("matcher metadata and target RSC counters are finite, redacted and fixed at failure", async () => {
  const output = resolve("test-results/issue-160", `matcher-${randomUUID()}`);
  const d = createRouteDiagnostics({ output });
  const page = new EventEmitter();
  const origin = "http://127.0.0.1:12345";
  page.isClosed = () => true;
  d.attach(page, { origin, child: { exitCode: null, signalCode: null } });
  d.begin("/goals/new", "keyboard");
  d.matched();
  d.assertionStart("toBeVisible", 5000);
  const request = (prefetch = false) => ({
    url: () => `${origin}/goals/new?PRIVATE_SECRET`,
    resourceType: () => "fetch",
    headers: () => ({
      rsc: "1",
      ...(prefetch ? { "next-router-prefetch": "1" } : {}),
    }),
    failure: () => ({ errorText: "PRIVATE_SECRET" }),
  });
  const pending = request(),
    finished = request(),
    failed = request(true);
  for (const item of [pending, finished, failed]) page.emit("request", item);
  page.emit("requestfinished", finished);
  page.emit("requestfailed", failed);
  class ExpectError extends Error {}
  const error = new ExpectError("PRIVATE_SECRET");
  error.matcherResult = {
    name: "toBeVisible",
    pass: false,
    message: "PRIVATE_SECRET",
  };
  d.failure(error);
  page.emit("requestfinished", pending);
  const result = await d.finish({ failed: true });
  assert.equal(result.failureCategory, "assertion");
  assert.deepEqual(result.failure, {
    name: "Error",
    constructor: "ExpectError",
    matcherResult: true,
    matcher: "toBeVisible",
    matcherFailed: true,
    assertion: "toBeVisible",
    elapsedMs: result.failure.elapsedMs,
    timeoutMs: 5000,
    originalPhase: "url_matched",
  });
  assert.ok(Number.isInteger(result.failure.elapsedMs));
  assert.deepEqual(result.rscAtFailure, {
    scope: "target_since_attach",
    direct: { pending: 1, finished: 1, failed: 0, truncated: false },
    prefetch: { pending: 0, finished: 0, failed: 1, truncated: false },
  });
  const json = readFileSync(
    join(output, "route-diagnostics", "diagnostic.json"),
    "utf8",
  );
  assert.doesNotMatch(json, /PRIVATE_SECRET|127\.0\.0\.1|12345/);
  assert.ok(Buffer.byteLength(json) <= 64 * 1024);
});

test("RSC counts are capped with explicit truncation; an unattached observer is unknown", async () => {
  const output = resolve("test-results/issue-170", `rsc-${randomUUID()}`);
  const d = createRouteDiagnostics({ output });
  const page = new EventEmitter();
  const origin = "http://127.0.0.1:12345";
  page.isClosed = () => true;
  d.attach(page, { origin });
  d.begin("/goals/new", "click");
  for (let i = 0; i < 1005; i++) {
    page.emit("request", {
      url: () => `${origin}/goals/new`,
      resourceType: () => "fetch",
      headers: () => ({ rsc: "1" }),
    });
  }
  d.failure(new Error());
  const result = await d.finish({ failed: true });
  assert.equal(result.rscAtFailure.direct.pending, 999);
  assert.equal(result.rscAtFailure.direct.truncated, true);
  assert.equal(result.events.length, 350);
  assert.ok(Buffer.byteLength(JSON.stringify(result)) <= 64 * 1024);

  const unknown = createRouteDiagnostics({
    output: resolve("test-results/issue-170", `rsc-unknown-${randomUUID()}`),
  });
  unknown.failure(new Error());
  const missing = await unknown.finish({ failed: true });
  assert.equal(missing.rscAtFailure, null);
});

test("DOM snapshots distinguish missing, hidden and visible targets and real workbench boundaries", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route("**/*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<main id='main-content'></main>",
      }),
    );
    await page.goto("http://fixture.invalid/goals/new");
    for (const scenario of [
      {
        html: '<p role="status">Entity wird geladen …</p>',
        form: "absent",
        heading: "absent",
        loading: "visible",
        error: "absent",
        accessible: 0,
      },
      {
        html: '<form aria-label="Ziel erstellen" hidden></form><h1 hidden>Ziel erstellen</h1>',
        form: "hidden",
        heading: "hidden",
        loading: "absent",
        error: "absent",
        accessible: 0,
      },
      {
        html: '<section role="alert"><h1>Entity konnte nicht geladen werden</h1></section>',
        form: "absent",
        heading: "visible",
        loading: "absent",
        error: "visible",
        accessible: 0,
      },
      {
        html: '<h1>Ziel erstellen</h1><form aria-label="Ziel erstellen"><input value="PRIVATE_SECRET"></form>',
        form: "visible",
        heading: "visible",
        loading: "absent",
        error: "absent",
        accessible: 1,
      },
    ]) {
      await page.locator("#main-content").evaluate((main, html) => {
        main.innerHTML = html;
      }, scenario.html);
      const output = resolve("test-results/issue-160", `dom-${randomUUID()}`);
      const d = createRouteDiagnostics({ output });
      const app = {
        origin: "http://fixture.invalid",
        child: { exitCode: null, signalCode: null },
      };
      d.attach(page, app);
      d.begin("/goals/new", "keyboard");
      d.matched();
      d.failure(new Error("PRIVATE_SECRET"));
      const result = await d.finish({ failed: true, app });
      assert.equal(result.dom.form.state, scenario.form);
      assert.equal(result.dom.heading.state, scenario.heading);
      assert.equal(result.dom.loading.state, scenario.loading);
      assert.equal(result.dom.error.state, scenario.error);
      assert.equal(result.dom.accessible.form, scenario.accessible);
      assert.doesNotMatch(
        JSON.stringify(result),
        /PRIVATE_SECRET|fixture\.invalid/,
      );
      assert.equal(result.screenshot, "captured");
    }
    await page.close();
  } finally {
    await browser.close();
  }
});
