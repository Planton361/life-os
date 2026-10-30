import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Only finite categories leave the disposable browser. No message, URL, header,
// body, owner, path segment or application output is ever persisted.
const maxEvents = 350;
const maxJsonBytes = 64 * 1024;
const maxScreenshotBytes = 12 * 1024 * 1024;
const signals = new Set(["SIGINT", "SIGTERM", "SIGKILL", "SIGHUP"]);
const errors = new Set([
  "net::ERR_ABORTED",
  "net::ERR_CONNECTION_REFUSED",
  "net::ERR_CONNECTION_RESET",
  "net::ERR_CONNECTION_CLOSED",
  "net::ERR_TIMED_OUT",
  "net::ERR_FAILED",
]);

export function routeTemplate(value) {
  try {
    const path = new URL(value, "http://127.0.0.1").pathname;
    if (
      ["/dashboard", "/goals/new", "/projects/new", "/skills/new"].includes(
        path,
      )
    )
      return path;
    if (
      /^\/projects\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        path,
      )
    )
      return "/projects/[id]";
  } catch {
    /* Invalid inputs have no persisted text. */
  }
  return "other";
}
function errorCategory(value) {
  if (/hydrat/i.test(value)) return "hydration";
  if (/network|fetch/i.test(value)) return "network";
  return "other";
}
function contentType(value) {
  const type = String(value).split(";", 1)[0].toLowerCase();
  return ["text/html", "text/x-component"].includes(type) ? type : "other";
}
function childState(app) {
  if (!app?.child) return { state: "unavailable", code: null, signal: null };
  const { exitCode, signalCode } = app.child;
  return {
    state:
      exitCode === null && signalCode === null ? "observed_running" : "exited",
    code:
      Number.isInteger(exitCode) && exitCode >= 0 && exitCode <= 255
        ? exitCode
        : null,
    signal: signals.has(signalCode) ? signalCode : signalCode ? "other" : null,
  };
}

export function createRouteDiagnostics({ output, synthetic = false }) {
  const directory = join(
    output,
    synthetic ? "synthetic-injection" : "route-diagnostics",
  );
  const started = performance.now();
  const events = [];
  const requests = new WeakMap();
  let sequence = 0,
    target = "other",
    content = "unknown",
    page,
    origin,
    currentApp,
    phase = "not_started",
    failureCategory = "unknown";
  function record(event, fields = {}) {
    const ms = Math.min(3_600_000, Math.round(performance.now() - started));
    if (events.length === maxEvents) events.shift();
    events.push({ ms, event, ...fields });
  }
  function classifyRequest(request, pageOrigin) {
    const url = new URL(request.url());
    if (url.origin !== pageOrigin)
      return { route: "external", kind: "other", rsc: false, prefetch: false };
    const type = request.resourceType();
    const headers = request.headers();
    return {
      route: routeTemplate(url.href),
      kind: ["document", "fetch", "xhr"].includes(type) ? type : "other",
      rsc: headers.rsc === "1",
      prefetch: Boolean(headers["next-router-prefetch"]),
    };
  }
  function attach(nextPage, app) {
    page = nextPage;
    origin = app.origin;
    currentApp = app;
    page.on("request", (request) => {
      try {
        const details = classifyRequest(request, app.origin);
        if (details.route === "other") return;
        const id = ++sequence;
        requests.set(request, { id, ...details });
        record("request", { id, ...details });
      } catch {
        record("observer_error");
      }
    });
    page.on("response", (response) => {
      try {
        const req = requests.get(response.request());
        if (!req) return;
        const status = response.status();
        record("response", {
          id: req.id,
          status:
            Number.isInteger(status) && status >= 100 && status <= 599
              ? status
              : null,
          contentType: contentType(response.headers()["content-type"] ?? ""),
        });
      } catch {
        record("observer_error");
      }
    });
    page.on("requestfinished", (request) => {
      const req = requests.get(request);
      if (req) record("request_finished", { id: req.id });
    });
    page.on("requestfailed", (request) => {
      const req = requests.get(request);
      if (!req) return;
      const value = request.failure()?.errorText;
      record("request_failed", {
        id: req.id,
        category: errors.has(value) ? value : "other",
      });
    });
    page.on("framenavigated", (frame) => {
      try {
        if (frame === nextPage.mainFrame())
          record("url_commit", { route: routeTemplate(frame.url()) });
      } catch {
        record("observer_error");
      }
    });
    page.on("pageerror", (error) =>
      record("pageerror", { category: errorCategory(error.message) }),
    );
    page.on("console", (message) => {
      const text = message.text();
      if (message.type() === "error" || /hydrat/i.test(text))
        record("console_error", { category: errorCategory(text) });
    });
  }
  function begin(route, kind) {
    target = routeTemplate(route);
    content = "unknown";
    phase = "navigation_started";
    record("navigation_begin", {
      route: target,
      kind: kind === "keyboard" ? "keyboard" : "click",
      process: childState(currentApp),
    });
  }
  function visible() {
    content = "visible";
    phase = "content_visible";
    record("content_visible", { route: target });
  }
  function matched() {
    phase = "url_matched";
    record("url_matched", { route: target });
  }
  function failure(error) {
    failureCategory = ["AssertionError", "ExpectError"].includes(error?.name)
      ? "assertion"
      : "harness_or_browser";
  }
  async function finish({ failed, app }) {
    let screenshot = "not_requested";
    let visibleAtFailure = content;
    let currentRoute = "unknown";
    try {
      if (failed && page && !page.isClosed()) {
        if (new URL(page.url()).origin === origin) {
          currentRoute = routeTemplate(page.url());
          const selector =
            target === "/projects/[id]"
              ? "h1"
              : target === "/goals/new"
                ? 'form[aria-label="Ziel erstellen"]'
                : target === "/projects/new"
                  ? 'form[aria-label="Project erstellen"]'
                  : target === "/skills/new"
                    ? 'form[aria-label="Skill erstellen"]'
                    : null;
          if (currentRoute !== target) visibleAtFailure = "different_route";
          else if (selector) {
            try {
              visibleAtFailure = (await page
                .locator(selector)
                .first()
                .isVisible())
                ? "visible"
                : "not_visible";
            } catch {
              visibleAtFailure = "unknown";
            }
          }
          const image = await page.screenshot({ fullPage: false });
          mkdirSync(directory, { recursive: true, mode: 0o700 });
          if (image.length <= maxScreenshotBytes) {
            writeFileSync(join(directory, "failure.png"), image, {
              mode: 0o600,
            });
            screenshot = "captured";
          } else screenshot = "too_large";
        } else screenshot = "origin_denied";
      } else if (failed) screenshot = "page_unavailable";
    } catch {
      screenshot = "capture_failed";
    }
    const summary = {
      version: 1,
      result: failed ? "failed" : "passed",
      failureCategory: failed ? failureCategory : "none",
      phase,
      target,
      currentRoute,
      content: visibleAtFailure,
      screenshot,
      process: childState(app),
      events,
    };
    const json = JSON.stringify(summary);
    if (Buffer.byteLength(json) > maxJsonBytes)
      throw new Error("ROUTE_DIAGNOSTIC_SIZE_LIMIT");
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    writeFileSync(join(directory, "diagnostic.json"), `${json}\n`, {
      mode: 0o600,
    });
    return summary;
  }
  return { attach, begin, matched, visible, failure, finish };
}
