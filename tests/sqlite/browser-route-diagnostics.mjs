import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Only finite categories leave the disposable browser. No message, URL, header,
// body, owner, path segment or application output is ever persisted.
const maxEvents = 350;
const maxJsonBytes = 64 * 1024;
const maxScreenshotBytes = 12 * 1024 * 1024;
const maxCount = 999;
const names = new Set([
  "Error",
  "AssertionError",
  "ExpectError",
  "TimeoutError",
]);
const matchers = new Set(["toBeVisible", "toContainText"]);
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
    synthetic === "matcher"
      ? "synthetic-injection/matcher"
      : synthetic
        ? "synthetic-injection"
        : "route-diagnostics",
  );
  const started = performance.now();
  const events = [];
  const requests = new WeakMap();
  const rscRoutes = new Map();
  let sequence = 0,
    target = "other",
    content = "unknown",
    page,
    origin,
    currentApp,
    phase = "not_started",
    failureCategory = "unknown",
    assertion = null,
    failureDetails = null,
    rscAtFailure = null,
    observerReady = false;
  const bounded = (n) => Math.min(maxCount, Math.max(0, n));
  function counters(route) {
    if (!rscRoutes.has(route))
      rscRoutes.set(route, {
        direct: { pending: 0, finished: 0, failed: 0 },
        prefetch: { pending: 0, finished: 0, failed: 0 },
      });
    return rscRoutes.get(route);
  }
  function finishRequest(request, outcome) {
    const req = requests.get(request);
    if (!req || req.terminal) return req;
    req.terminal = true;
    if (req.rsc) {
      const counts = counters(req.route)[req.prefetch ? "prefetch" : "direct"];
      counts.pending = Math.max(0, counts.pending - 1);
      counts[outcome] += 1;
    }
    return req;
  }
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
    observerReady = true;
    page.on("request", (request) => {
      try {
        const details = classifyRequest(request, app.origin);
        if (details.route === "other") return;
        const id = (sequence = (sequence % 1_000_000) + 1);
        requests.set(request, { id, ...details, terminal: false });
        if (details.rsc) {
          const counts = counters(details.route)[
            details.prefetch ? "prefetch" : "direct"
          ];
          counts.pending += 1;
        }
        record("request", { id, ...details });
      } catch {
        observerReady = false;
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
      const req = finishRequest(request, "finished");
      if (req) record("request_finished", { id: req.id });
    });
    page.on("requestfailed", (request) => {
      const req = finishRequest(request, "failed");
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
    assertion = null;
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
  function assertionStart(matcher, timeoutMs) {
    assertion =
      matchers.has(matcher) && timeoutMs === 5000
        ? { matcher, timeoutMs, started: performance.now() }
        : null;
  }
  function assertionPassed() {
    assertion = null;
  }
  function matched() {
    phase = "url_matched";
    record("url_matched", { route: target });
  }
  function failure(error) {
    try {
      const name = names.has(error?.name) ? error.name : "other";
      const constructor = names.has(error?.constructor?.name)
        ? error.constructor.name
        : "other";
      const result = error?.matcherResult;
      const matcher = matchers.has(result?.name) ? result.name : "unknown";
      const matcherFailed = Boolean(result && result.pass === false);
      const elapsedMs = assertion
        ? Math.min(
            3_600_000,
            Math.max(0, Math.round(performance.now() - assertion.started)),
          )
        : null;
      const timedOut = Boolean(
        assertion &&
        matcherFailed &&
        constructor === "ExpectError" &&
        matcher === assertion.matcher &&
        elapsedMs >= assertion.timeoutMs,
      );
      failureCategory = timedOut
        ? "matcher_timeout"
        : matcherFailed ||
            name === "AssertionError" ||
            constructor === "AssertionError"
          ? "assertion"
          : "harness_or_browser";
      failureDetails = {
        name,
        constructor,
        matcherResult: Boolean(result),
        matcher,
        matcherFailed,
        assertion: assertion?.matcher ?? "unknown",
        elapsedMs,
        timeoutMs: assertion?.timeoutMs ?? null,
        originalPhase: phase,
      };
    } catch {
      failureCategory = "harness_or_browser";
      failureDetails = null;
    }
    const counts = rscRoutes.get(target);
    const snapshotCounts = (entry) => ({
      pending: bounded(entry?.pending ?? 0),
      finished: bounded(entry?.finished ?? 0),
      failed: bounded(entry?.failed ?? 0),
      truncated: [entry?.pending, entry?.finished, entry?.failed].some(
        (n) => n > maxCount,
      ),
    });
    rscAtFailure = observerReady
      ? {
          scope: "target_since_attach",
          direct: snapshotCounts(counts?.direct),
          prefetch: snapshotCounts(counts?.prefetch),
        }
      : null;
  }
  async function captureDom() {
    // Only fixed selectors and fixed boundary labels are used in the browser;
    // no DOM content, attributes, user text or exception is returned.
    const dom = await page.evaluate((route) => {
      const max = 999;
      const main = document.querySelector("#main-content");
      if (!main) return null;
      const names = {
        "/goals/new": "Ziel erstellen",
        "/projects/new": "Project erstellen",
        "/skills/new": "Skill erstellen",
      };
      const name = names[route];
      const formNodes = name
        ? [...main.querySelectorAll("form")].filter(
            (e) => e.getAttribute("aria-label") === name,
          )
        : [...main.querySelectorAll("form")];
      const headingNodes = [...main.querySelectorAll("h1")];
      const state = (nodes) => {
        const visible = nodes.some((element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return (
            style.visibility !== "hidden" &&
            style.visibility !== "collapse" &&
            rect.width > 0 &&
            rect.height > 0
          );
        });
        return {
          count: Math.min(max, nodes.length),
          truncated: nodes.length > max,
          state: nodes.length === 0 ? "absent" : visible ? "visible" : "hidden",
        };
      };
      const loading = [...main.querySelectorAll('p[role="status"]')].filter(
        (e) => e.textContent.trim() === "Entity wird geladen …",
      );
      const error = [...main.querySelectorAll('section[role="alert"]')].filter(
        (e) =>
          e.querySelector("h1")?.textContent.trim() ===
          "Entity konnte nicht geladen werden",
      );
      return {
        form: state(formNodes),
        heading: state(headingNodes),
        loading: state(loading),
        error: state(error),
      };
    }, target);
    if (!dom) return null;
    const formNames = {
      "/goals/new": "Ziel erstellen",
      "/projects/new": "Project erstellen",
      "/skills/new": "Skill erstellen",
    };
    const name = formNames[target];
    try {
      const main = page.locator("#main-content");
      const form = main.getByRole("form", name ? { name, exact: true } : {});
      const heading = main.getByRole(
        "heading",
        name ? { name, exact: true, level: 1 } : { level: 1 },
      );
      const [formCount, headingCount] = await Promise.all([
        form.count(),
        heading.count(),
      ]);
      dom.accessible = {
        form: bounded(formCount),
        heading: bounded(headingCount),
        formTruncated: formCount > maxCount,
        headingTruncated: headingCount > maxCount,
      };
    } catch {
      dom.accessible = null;
    }
    return dom;
  }
  async function finish({ failed, app }) {
    let screenshot = "not_requested";
    let visibleAtFailure = content;
    let currentRoute = "unknown";
    let dom = null;
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
          if (currentRoute === target) {
            try {
              dom = await captureDom();
            } catch {
              dom = null;
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
      failure: failed ? failureDetails : null,
      dom,
      rscAtFailure: failed ? rscAtFailure : null,
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
  return {
    attach,
    begin,
    matched,
    visible,
    assertionStart,
    assertionPassed,
    failure,
    finish,
  };
}
