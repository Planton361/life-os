import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { chromium } from "@playwright/test";

const baseURL = process.argv[2] ?? "http://127.0.0.1:37337";
const token = process.env.LIFE_OS_37_OWNER_TOKEN;
if (!token || !baseURL.startsWith("http://127.0.0.1:")) {
  throw new Error("Loopback base URL and synthetic proof token required");
}
const ids = {
  goal: "37000000-0000-4000-8001-000000000001",
  project: "37000000-0000-4000-8002-000000000001",
  task: "37000000-0000-4000-8003-000000000001",
};
const runId = Date.now().toString(36);
const taskTitle = `Synthetic Browser Flow Task 37 ${runId}`;
const projectTaskTitle = `Synthetic Project Linked Task 37 ${runId}`;
const goalTaskTitle = `Synthetic Goal Linked Task 37 ${runId}`;
const routes = [
  "/dashboard", "/today", "/calendar", "/portfolio",
  `/tasks/${ids.task}`, `/projects/${ids.project}`, `/goals/${ids.goal}`,
];
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const anonymous = await browser.newContext({ baseURL });
  const anonymousPage = await anonymous.newPage();
  for (const route of routes) {
    const response = await anonymousPage.goto(route);
    assert.equal(response.status(), 200, route);
    await anonymousPage.waitForFunction(() => !document.body.innerText.includes("wird geladen"));
    assert.equal((await anonymousPage.locator("body").innerText()).includes("Synthetic "), false, `anonymous leak: ${route}`);
  }
  await anonymousPage.goto("/tasks/new");
  assert.equal(await anonymousPage.locator('form[aria-label="Task erstellen"]').count(), 0);
  const fileResponse = await anonymousPage.goto("/private/tmp/life-os-37-proof/synthetic.db");
  assert.equal(fileResponse.status(), 404);
  await anonymous.close();

  const context = await browser.newContext({ baseURL });
  await context.addCookies([{
    name: "life_os_37_proof_owner", value: token,
    url: baseURL, httpOnly: true, sameSite: "Strict",
  }]);
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" || /hydration|hydrated|mismatch/i.test(message.text()))
      errors.push(`console: ${message.text()}`);
  });
  const routeResults = [];
  for (const route of routes) {
    const response = await page.goto(route);
    assert.equal(response.status(), 200, route);
    await page.waitForFunction(() => document.body.innerText.includes("Synthetic "), null, { timeout: 10000 });
    assert.equal((await response.text()).includes("/private/tmp/life-os-37-proof/"), false, `DB path leaked: ${route}`);
    routeResults.push(route);
  }

  await page.goto("/tasks/new");
  await page.locator('form[aria-label="Task erstellen"]').evaluate((form) => {
    const forged = document.createElement("input");
    forged.type = "hidden";
    forged.name = "userId";
    forged.value = "37000000-0000-4000-8000-000000009999";
    form.append(forged);
  });
  await page.getByRole("textbox", { name: "Titel", exact: true }).fill(taskTitle);
  await page.getByRole("button", { name: "Task erstellen" }).click();
  await page.waitForURL(/\/tasks\/[0-9a-f-]{36}$/);
  const createdTask = page.url().split("/").pop();
  const dbPath = process.env.LIFE_OS_37_SQLITE_DB;
  if (dbPath) {
    assert.ok(dbPath.startsWith("/private/tmp/life-os-37-proof/"));
    const db = new DatabaseSync(dbPath);
    assert.equal(db.prepare("SELECT user_id FROM tasks WHERE id=?").get(createdTask).user_id,
      "37000000-0000-4000-8000-000000000001");
    db.close();
  }
  await page.getByRole("textbox", { name: "Titel", exact: true }).fill(`${taskTitle} Updated`);
  await page.getByRole("button", { name: "Änderungen speichern" }).click();
  await page.getByRole("heading", { name: `${taskTitle} Updated` }).waitFor();
  await page.getByRole("button", { name: "Task abschließen" }).click();
  await page.getByRole("button", { name: "Task wieder öffnen" }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Task wieder öffnen" }).waitFor();
  await page.getByRole("button", { name: "Task wieder öffnen" }).click();
  await page.getByRole("button", { name: "Task abschließen" }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Task abschließen" }).waitFor();

  await page.goto(`/projects/${ids.project}`);
  await page.getByRole("link", { name: "+ Task" }).first().click();
  assert.equal(await page.locator("select[name=projectId]").inputValue(), ids.project);
  await page.getByRole("textbox", { name: "Titel", exact: true }).fill(projectTaskTitle);
  await page.getByRole("button", { name: "Task erstellen" }).click();
  await page.getByRole("link", { name: projectTaskTitle, exact: true }).waitFor();
  const projectTask = (await page.getByRole("link", { name: projectTaskTitle, exact: true }).getAttribute("href")).split("/").pop();
  assert.ok((await page.locator("body").innerText()).includes(projectTaskTitle));

  await page.goto(`/tasks/new?goal=${ids.goal}`);
  assert.equal(await page.locator("select[name=goalId]").inputValue(), ids.goal);
  await page.getByRole("textbox", { name: "Titel", exact: true }).fill(goalTaskTitle);
  await page.getByRole("button", { name: "Task erstellen" }).click();
  await page.waitForURL(/\/tasks\/[0-9a-f-]{36}$/);
  const goalTask = page.url().split("/").pop();
  await page.goto(`/goals/${ids.goal}?area=arbeit`);
  assert.ok((await page.locator("body").innerText()).includes(goalTaskTitle));
  await page.reload();
  assert.ok((await page.locator("body").innerText()).includes(goalTaskTitle));
  assert.deepEqual(errors, [], errors.join("\n"));
  console.log(JSON.stringify({
    status: "PASS", routes: routeResults, anonymousBlocked: true,
    taskFlow: { createdTask, projectTask, goalTask, update: true, complete: true, reopen: true, reload: true },
    browserErrors: errors.length,
  }));
  await context.close();
} finally {
  await browser.close();
}
