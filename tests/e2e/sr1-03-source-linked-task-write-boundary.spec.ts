import { expect, test, type Page } from "@playwright/test";

const baseUrl = `http://${process.env.PLAYWRIGHT_HOST ?? "127.0.0.1"}:${process.env.PLAYWRIGHT_PORT ?? "3000"}`;

async function authenticatedApiToken(page: Page) {
  const cookie = (await page.context().cookies()).find((item) =>
    item.name.includes("auth-token"),
  );
  if (!cookie) throw new Error("Missing isolated Supabase auth cookie.");

  const encoded = cookie.value.startsWith("base64-")
    ? cookie.value.slice("base64-".length)
    : cookie.value;
  const session = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
    access_token?: string;
  };
  if (!session.access_token) throw new Error("Missing isolated Supabase access token.");
  return session.access_token;
}

async function authenticatedUserId(page: Page) {
  const token = await authenticatedApiToken(page);
  const payload = token.split(".")[1];
  if (!payload) throw new Error("Malformed isolated Supabase access token.");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
    sub?: string;
  };
  if (!claims.sub) throw new Error("Missing isolated Supabase user id.");
  return claims.sub;
}

async function authenticatedApi(
  page: Page,
  path: string,
  body?: unknown,
) {
  const token = await authenticatedApiToken(page);
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}${path}`;
  const headers = {
    apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    Authorization: `Bearer ${token}`,
    Prefer: "return=representation",
  };
  const response = body === undefined
    ? await page.request.get(url, { headers })
    : await page.request.post(url, { data: body, headers });
  if (!response.ok()) {
    throw new Error(`Authenticated fixture request failed (${response.status()}): ${await response.text()}`);
  }
  return response.json() as Promise<unknown>;
}

async function openManual(page: Page, stamp: number) {
  await page.context().addCookies([{
    httpOnly: true,
    name: "life_os_profile",
    sameSite: "Lax",
    url: baseUrl,
    value: "manual",
  }]);
  await page.goto("/settings#supabase-session");
  const auth = page.locator("#supabase-session");
  await auth.getByLabel("Email").fill(`sr103-${stamp}@example.local`);
  await auth.getByLabel("Password").fill(`SR103proof-${stamp}`);
  await auth.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/inbox$/);
}

async function openPortfolioTask(page: Page, title: string) {
  await page.goto("/portfolio?view=tasks");
  const row = page.locator("a").filter({ hasText: title }).first();
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.locator("#selected-entity-heading")).toHaveText(title);
}

async function createPortfolioTask(page: Page, title: string) {
  await page.goto("/portfolio?view=tasks");
  const form = page.locator('form[aria-label="Task erstellen"]');
  await form.getByLabel("Task-Titel").fill(title);
  await form.getByRole("button", { name: "Task erstellen" }).click();
  await expect(page.locator("#selected-entity-heading")).toHaveText(title);
}

test("SR1-03 keeps normal task writes intact and reconciles Meal scheduling through the active Task UI", async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  const normalTitle = `SR1-03 normal ${stamp}`;
  const mealTitle = `SR1-03 Meal ${stamp}`;

  await openManual(page, stamp);
  await createPortfolioTask(page, normalTitle);
  await page.getByRole("button", { name: "Heute planen" }).click();
  await expect(page.getByRole("button", { name: "Heute terminieren" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Heute terminieren" })).toBeVisible();
  await page.getByRole("button", { name: "Heute terminieren" }).click();
  await expect(page.getByRole("button", { name: "Entterminieren" })).toBeVisible();
  await page.reload();
  const normalReschedule = page.locator('form[aria-label="Task umplanen"]');
  await expect(normalReschedule).toBeVisible();
  await normalReschedule.locator('input[name="plannedDate"]').fill("2026-09-12");
  await normalReschedule.locator('input[name="scheduledTime"]').fill("10:30");
  await normalReschedule.getByRole("button", { name: "Umplanen" }).click();
  await expect(page.getByRole("button", { name: "Entterminieren" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Entterminieren" }).click();
  await expect(page.getByRole("button", { name: "Heute terminieren" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Heute terminieren" })).toBeVisible();
  await page.getByRole("button", { name: "Abschließen" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Wieder öffnen" })).toBeVisible();

  const userId = await authenticatedUserId(page);
  const mealRows = await authenticatedApi(page, "/rest/v1/meals", [{
    date: "2026-09-02",
    meal_type: "lunch",
    title: mealTitle,
    user_id: userId,
  }]) as Array<{ id: string }>;
  const mealId = mealRows[0]?.id;
  expect(mealId).toBeTruthy();
  const linkedTask = await authenticatedApi(page, "/rest/v1/rpc/schedule_linked_source", {
    p_duration_minutes: 30,
    p_planned_date: "2026-09-02",
    p_scheduled_start_at: "2026-09-02T10:00:00.000Z",
    p_source_id: mealId,
    p_source_type: "meal",
  }) as { id: string };
  expect(linkedTask.id).toBeTruthy();

  await openPortfolioTask(page, mealTitle);
  const mealReschedule = page.locator('form[aria-label="Task umplanen"]');
  await mealReschedule.locator('input[name="plannedDate"]').fill("2026-09-03");
  await mealReschedule.locator('input[name="scheduledTime"]').fill("13:15");
  await mealReschedule.getByRole("button", { name: "Umplanen" }).click();
  await expect(page.getByRole("button", { name: "Entterminieren" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Entterminieren" }).click();
  await expect(page.getByRole("button", { name: "Heute terminieren" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Heute terminieren" })).toBeVisible();

  const metadata = page.locator('form[aria-label="Task bearbeiten"]');
  await metadata.getByLabel("Priorität").selectOption("P1");
  await metadata.getByRole("button", { name: "Task speichern" }).click();
  await expect(page.locator("#selected-entity-heading")).toHaveText(mealTitle);

  await page.getByRole("button", { name: "Heute terminieren" }).click();
  await expect(page.getByRole("button", { name: "Entterminieren" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Abschließen" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Wieder öffnen" })).toBeVisible();
  const completion = await authenticatedApi(page, `/rest/v1/meals?id=eq.${mealId}&select=date,planned_at,completed_at`);
  expect(completion).toEqual([
    expect.objectContaining({
      completed_at: expect.any(String),
      planned_at: expect.any(String),
    }),
  ]);
});

test("SR1-03 rejects generic completion of open Review, Running and Strength source tasks", async ({ page }) => {
  test.setTimeout(150_000);
  const stamp = Date.now();
  const runTitle = `SR1-03 run ${stamp}`;
  const strengthPlan = `SR1-03 strength ${stamp}`;

  await openManual(page, stamp);

  await page.goto("/review/daily");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Daily Review gespeichert.")).toBeVisible();
  const reviewPlan = page.locator('form[aria-label="Daily Review als Zeitblock planen"]');
  await reviewPlan.getByRole("button", { name: "Im Calendar planen" }).click();
  await openPortfolioTask(page, "Daily Review");
  await page.getByRole("button", { name: "Abschließen" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Abschließen" })).toBeVisible();

  await page.goto("/health/running");
  const runningPlans = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Running plans" }),
  });
  const createRun = runningPlans.locator("form").first();
  await createRun.getByLabel("Plan name").fill(`SR1-03 running plan ${stamp}`);
  await createRun.getByLabel("Goal").fill("Guard proof");
  await createRun.getByRole("button", { name: "Create plan" }).click();
  await page.waitForLoadState("networkidle");
  const runPlanCard = runningPlans.locator('[data-testid^="running-plan-"]');
  await runPlanCard.getByText("Add planned unit").click();
  const addRun = runPlanCard.locator("details").filter({ hasText: "Add planned unit" }).locator("form");
  await addRun.getByLabel("Title").fill(runTitle);
  await addRun.getByLabel("Distance km").fill("5");
  await addRun.getByLabel("Duration min").fill("30");
  await addRun.getByRole("button", { name: "Add unit" }).click();
  await page.waitForLoadState("networkidle");
  const runningSchedule = page.locator('[data-testid^="schedule-running_plan_item-"]');
  await runningSchedule.getByRole("button", { name: "Schedule / reschedule" }).click();
  await openPortfolioTask(page, `Run: ${runTitle}`);
  await page.getByRole("button", { name: "Abschließen" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Abschließen" })).toBeVisible();

  await page.goto("/health/strength");
  const strengthPlans = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Strength plans" }),
  });
  const createStrength = strengthPlans.locator("form").first();
  await createStrength.getByLabel("Plan name").fill(strengthPlan);
  await createStrength.getByLabel("Goal").fill("Guard proof");
  await createStrength.getByRole("button", { name: "Create plan" }).click();
  await page.waitForLoadState("networkidle");
  const strengthCard = strengthPlans.locator('[data-testid^="strength-plan-"]');
  await strengthCard.locator('[data-testid^="schedule-strength_plan-"]').getByRole("button", { name: "Schedule / reschedule" }).click();
  await openPortfolioTask(page, `Strength: ${strengthPlan}`);
  await page.getByRole("button", { name: "Abschließen" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Abschließen" })).toBeVisible();

  await expect(authenticatedApi(page, "/rest/v1/running_sessions?select=id")).resolves.toEqual([]);
  await expect(authenticatedApi(page, "/rest/v1/strength_sessions?select=id")).resolves.toEqual([]);
  await expect(authenticatedApi(page, "/rest/v1/strength_set_logs?select=id")).resolves.toEqual([]);
});
