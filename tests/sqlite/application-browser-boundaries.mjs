import assert from "node:assert/strict";
import {
  mkdtempSync,
  realpathSync,
  writeFileSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import { expect } from "@playwright/test";
import { startApplication } from "./application-process.mjs";
import http from "node:http";

export async function boundaryAndRecoveryProof({
  page,
  context,
  fixture,
  step,
  getApp,
  setApp,
  resetBrowserContext,
}) {
  const require = createRequire(import.meta.url);
  const { inspectSyntheticDatabase, restoreSyntheticBackup } = require(
    join(fixture.compiled, "recovery.js"),
  );
  const getSnapshot = () => inspectSyntheticDatabase(fixture.path);
  const cookie = "life_os_profile=manual";
  const decode = (value) =>
    value
      .replaceAll("&quot;", '"')
      .replaceAll("&#x27;", "'")
      .replaceAll("&amp;", "&")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">");
  async function rawAction(headers, data) {
    const app = getApp();
    const serialized = new Request(app.origin + "/dashboard", {
      method: "POST",
      body: data,
    });
    const body = Buffer.from(await serialized.arrayBuffer());
    return new Promise((resolve, reject) => {
      const request = http.request(
        {
          hostname: "127.0.0.1",
          port: new URL(app.origin).port,
          method: "POST",
          path: "/dashboard",
          headers: {
            host: new URL(app.origin).host,
            cookie,
            "content-type": serialized.headers.get("content-type"),
            "content-length": body.length,
            ...headers,
          },
        },
        (response) => {
          response.resume();
          response.once("end", () => resolve(response.statusCode));
        },
      );
      request.once("error", reject);
      request.end(body);
    });
  }
  async function stop(signal) {
    await page.waitForLoadState("networkidle");
    await page.goto("about:blank");
    ({ page, context } = await resetBrowserContext());
    return getApp().stop(signal);
  }
  async function actionData(content) {
    const app = getApp();
    const html = await (
      await fetch(app.origin + "/dashboard", { headers: { cookie } })
    ).text();
    const form = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)]
      .map((match) => match[1])
      .find((form) => form.includes('name="content"'));
    assert.ok(form, "normal rendered Quick Thought form");
    const data = new FormData();
    for (const input of form.matchAll(/<input\b([^>]*)>/g)) {
      const name = input[1].match(/name="([^"]*)"/)?.[1];
      if (name)
        data.append(
          decode(name),
          decode(input[1].match(/value="([^"]*)"/)?.[1] ?? ""),
        );
    }
    data.set("content", content);
    return data;
  }
  await step(
    "Browser write Origin/Host/forwarded-host negatives and owner forgery",
    async () => {
      const app = getApp();
      const data = await actionData("SQLite browser forged owner capture");
      data.set("userId", "11600000-0000-4000-8000-000000000099");
      data.set("profileId", "11600000-0000-4000-8000-000000000099");
      data.set("owner", "11600000-0000-4000-8000-000000000099");
      const before = getSnapshot();
      await (
        await fetch(app.origin + "/dashboard?owner=forged&userId=forged", {
          method: "POST",
          headers: { cookie, origin: app.origin },
          body: data,
        })
      ).arrayBuffer();
      await page.goto(app.origin + "/inbox");
      await expect(
        page.locator('[data-inbox-section="queue"]').getByRole("button", {
          name: /^SQLite browser forged owner capture/,
        }),
      ).toBeVisible();
      const written = getSnapshot();
      assert.equal(written.counts.profiles, before.counts.profiles);
      assert.equal(written.counts.inbox_items, before.counts.inbox_items + 1);
      for (const headers of [
        { origin: "http://evil.invalid" },
        { origin: app.origin, host: "evil.invalid" },
        { origin: app.origin, "x-forwarded-host": "evil.invalid" },
        { origin: app.origin, "sec-fetch-site": "cross-site" },
        {},
      ]) {
        const attempt = await actionData("SQLite denied cross-site capture");
        await rawAction(headers, attempt);
        assert.deepEqual(
          getSnapshot(),
          written,
          `invalid boundary cannot write: ${JSON.stringify(headers)}`,
        );
      }
      await page.reload();
      await expect(
        page
          .locator('[data-inbox-section="queue"]')
          .getByRole("button", { name: /^SQLite denied cross-site capture/ }),
      ).toHaveCount(0);
      const cookies = await context.cookies();
      assert.ok(cookies.every((cookie) => cookie.name === "life_os_profile"));
      assert.ok(
        cookies.every((cookie) => !cookie.value.includes(fixture.ownerId)),
      );
      const state = await page.evaluate(() => ({
        local: { ...localStorage },
        session: { ...sessionStorage },
      }));
      assert.ok(!JSON.stringify(state).includes(fixture.ownerId));
      const chunks = [];
      function scan(directory) {
        for (const item of readdirSync(directory, { withFileTypes: true })) {
          const path = join(directory, item.name);
          if (item.isDirectory()) scan(path);
          else if (item.name.endsWith(".js")) chunks.push(path);
        }
      }
      scan(".next/static");
      for (const path of chunks) {
        const code = readFileSync(path, "utf8");
        assert.ok(
          !code.includes("better-sqlite3"),
          "native driver excluded from client JS",
        );
        assert.ok(
          !code.includes(fixture.path),
          "DB path excluded from client JS",
        );
      }
    },
  );
  await step(
    "Demo and Empty isolation, blocked writes and unchanged SQLite",
    async () => {
      const app = getApp();
      const before = getSnapshot();
      for (const mode of ["demo", "empty"]) {
        await context.addCookies([
          { name: "life_os_profile", value: mode, url: app.origin },
        ]);
        for (const route of [
          "/dashboard",
          "/today",
          "/calendar",
          "/portfolio",
          "/inbox",
          "/work",
          "/nutrition",
          "/health/running",
          "/health/strength",
          "/life/journal",
          "/shop",
        ]) {
          await page.goto(app.origin + route);
          await expect(page.locator("#main-content")).not.toContainText(
            "SQLite synthetic",
          );
          await expect(page.locator("#main-content")).not.toContainText(
            "SQLite browser",
          );
        }
        await (
          await fetch(app.origin + "/dashboard", {
            method: "POST",
            headers: { cookie: `life_os_profile=${mode}`, origin: app.origin },
            body: await actionData(`SQLite ${mode} denied capture`),
          })
        ).arrayBuffer();
        assert.deepEqual(getSnapshot(), before, `${mode} never writes SQLite`);
      }
      await context.addCookies([
        { name: "life_os_profile", value: "manual", url: app.origin },
      ]);
    },
  );
  const projectionRoutes = [
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
  ];
  async function projections() {
    const result = [];
    for (const route of projectionRoutes) {
      await page.goto(getApp().origin + route);
      await expect(page.locator(".life-os-canvas")).toBeVisible();
      await page.waitForLoadState("networkidle");
      result.push({
        route,
        text:
          route === "/dashboard"
            ? await page
                .locator(
                  'a[aria-label^="Open agenda item:"], [data-dashboard-section="habit-tracker"], [aria-label="Active Portfolio items"], [aria-label="Meal slots"], [aria-labelledby="mood-board-title"], .daily-control-current',
                )
                .allInnerTexts()
            : await page.locator("#main-content").innerText(),
      });
    }
    return result;
  }
  await step(
    "Browser-created state survives production restart/SIGKILL and restored app",
    async () => {
      process.stdout.write("Recovery: baseline canonical projections\n");
      const baseline = await projections();
      const snapshot = getSnapshot();
      const port = Number(new URL(getApp().origin).port);
      await stop();
      process.stdout.write("Recovery: graceful restart\n");
      setApp(await startApplication(fixture, { port }));
      assert.deepEqual(await projections(), baseline);
      assert.deepEqual(getSnapshot(), snapshot);
      process.stdout.write("Recovery: committed-activity SIGKILL\n");
      await stop("SIGKILL");
      setApp(await startApplication(fixture, { port }));
      assert.deepEqual(await projections(), baseline);
      assert.deepEqual(getSnapshot(), snapshot);
      const directory = mkdtempSync(
        join(realpathSync(tmpdir()), "life-os-116-browser-restore-"),
      );
      fixture.disposableDirectories.push(directory);
      const restored = {
        ...fixture,
        directory,
        path: join(directory, "restored.db"),
      };
      await restoreSyntheticBackup(fixture.path, restored.path);
      assert.deepEqual(inspectSyntheticDatabase(restored.path), snapshot);
      await stop();
      setApp(await startApplication(restored, { port }));
      assert.deepEqual(await projections(), baseline);
      writeFileSync(
        join(fixture.directory, "recovery-projections.json"),
        JSON.stringify(
          {
            baseline,
            snapshot,
            restoredSnapshot: inspectSyntheticDatabase(restored.path),
          },
          null,
          2,
        ),
        { mode: 0o600 },
      );
      await stop();
      setApp(await startApplication(fixture, { port }));
    },
  );
  await step(
    "Manual auth-blocked is server-disabled, has no fallback and no writes",
    async () => {
      const before = getSnapshot();
      const port = Number(new URL(getApp().origin).port);
      const attempt = await actionData("SQLite auth-blocked denied capture");
      await stop();
      setApp(
        await startApplication(fixture, { port, authentication: "blocked" }),
      );
      for (const route of [
        "/dashboard",
        "/today",
        "/calendar",
        "/portfolio",
        "/inbox",
        "/work",
        "/nutrition",
        "/health/running",
        "/health/strength",
        "/life/journal",
        "/shop",
      ]) {
        await page.goto(getApp().origin + route);
        await expect(page.locator("#main-content")).toContainText(
          /gesperrt|auth-blocked|nicht verfügbar|anmelden|Anmeldung|Melde dich an|sign-in/i,
        );
        await expect(page.locator("#main-content")).not.toContainText(
          "SQLite synthetic",
        );
        await expect(page.locator("#main-content")).not.toContainText(
          "SQLite browser",
        );
      }
      await (
        await fetch(getApp().origin + "/dashboard", {
          method: "POST",
          headers: { cookie, origin: getApp().origin },
          body: attempt,
        })
      ).arrayBuffer();
      assert.deepEqual(getSnapshot(), before, "no blocked canonical write");
      await stop();
      setApp(await startApplication(fixture, { port }));
    },
  );
}
