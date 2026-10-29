import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { readFileSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
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
  const result = await diagnostics.finish({
    failed: true,
    app: { child: { exitCode: 17, signalCode: null } },
  });
  assert.equal(result.result, "failed");
  assert.equal(result.content, "unknown");
  assert.equal(result.screenshot, "capture_failed");
  assert.deepEqual(result.process, { state: "exited", code: 17, signal: null });
  assert.doesNotMatch(
    readFileSync(join(output, "route-diagnostics", "diagnostic.json"), "utf8"),
    /PRIVATE/,
  );
});
