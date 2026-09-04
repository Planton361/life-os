import { expect, test, type Page } from "@playwright/test";

import { signUpTechnicalManualUser } from "./support/local-manual-auth";

type ApiResult<T> = {
  body: T | null;
  ok: boolean;
  status: number;
};

type TaskRow = {
  completed_at: string | null;
  id: string;
  planned_date: string | null;
  scheduled_start_at: string | null;
  status: string;
};

const sourceDate = "2026-09-18";

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

async function authenticatedApi<T>(
  page: Page,
  method: "GET" | "PATCH" | "POST",
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const token = await authenticatedApiToken(page);
  const response = await page.request.fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}${path}`, {
    data: body,
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
      Authorization: `Bearer ${token}`,
      Prefer: "return=representation",
    },
    method,
  });

  const text = await response.text();
  let parsed: T | null = null;
  if (text) {
    try {
      parsed = JSON.parse(text) as T;
    } catch {
      parsed = null;
    }
  }

  return { body: parsed, ok: response.ok(), status: response.status() };
}

async function insertOne<T>(page: Page, table: string, row: Record<string, unknown>) {
  const result = await authenticatedApi<T[]>(page, "POST", `/rest/v1/${table}`, [row]);
  expect(result.ok).toBeTruthy();
  const value = result.body?.[0];
  expect(value).toBeTruthy();
  return value as T;
}

async function scheduleSource(
  page: Page,
  sourceType: "meal" | "review" | "running_plan_item" | "strength_plan",
  sourceId: string,
): Promise<TaskRow> {
  const result = await authenticatedApi<TaskRow>(page, "POST", "/rest/v1/rpc/schedule_linked_source", {
    p_duration_minutes: 30,
    p_planned_date: sourceDate,
    p_scheduled_start_at: `${sourceDate}T10:00:00.000Z`,
    p_source_id: sourceId,
    p_source_type: sourceType,
  });
  expect(result.ok).toBeTruthy();
  expect(result.body?.id).toBeTruthy();
  return result.body as TaskRow;
}

test("Z1 blocks direct source-linked Task writes while preserving canonical completion flows", async ({ page }) => {
  test.setTimeout(120_000);
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, "z1-source-api-audit", stamp);
  const userId = await authenticatedUserId(page);

  const meal = await insertOne<{ id: string; completed_at: string | null; planned_at: string | null }>(
    page,
    "meals",
    { date: sourceDate, meal_type: "lunch", title: `Z1 meal ${stamp}`, user_id: userId },
  );
  const review = await insertOne<{ id: string; status: string }>(page, "review_records", {
    kind: "daily",
    period_end: sourceDate,
    period_start: sourceDate,
    status: "draft",
    timezone: "Europe/Berlin",
    user_id: userId,
  });
  const runningPlan = await insertOne<{ id: string }>(page, "running_plans", {
    goal: "Z1 direct API audit",
    name: `Z1 running ${stamp}`,
    user_id: userId,
  });
  const runningItem = await insertOne<{ id: string }>(page, "running_plan_items", {
    plan_id: runningPlan.id,
    sort_order: 0,
    title: `Z1 run item ${stamp}`,
    user_id: userId,
  });
  const strengthPlan = await insertOne<{ id: string }>(page, "strength_plans", {
    goal: "Z1 direct API audit",
    name: `Z1 strength ${stamp}`,
    user_id: userId,
  });

  const mealTask = await scheduleSource(page, "meal", meal.id);
  const reviewTask = await scheduleSource(page, "review", review.id);
  const runningTask = await scheduleSource(page, "running_plan_item", runningItem.id);
  const strengthTask = await scheduleSource(page, "strength_plan", strengthPlan.id);

  const schedule = await authenticatedApi<TaskRow[]>(page, "PATCH", `/rest/v1/tasks?id=eq.${mealTask.id}`, {
    planned_date: "2026-09-19",
    scheduled_start_at: "2026-09-19T11:00:00.000Z",
  });
  const reschedule = await authenticatedApi<TaskRow[]>(page, "PATCH", `/rest/v1/tasks?id=eq.${mealTask.id}`, {
    planned_date: "2026-09-20",
    scheduled_start_at: "2026-09-20T12:00:00.000Z",
  });
  const unschedule = await authenticatedApi<TaskRow[]>(page, "PATCH", `/rest/v1/tasks?id=eq.${mealTask.id}`, {
    scheduled_start_at: null,
  });
  const completeMeal = await authenticatedApi<TaskRow[]>(page, "PATCH", `/rest/v1/tasks?id=eq.${mealTask.id}`, {
    completed_at: "2026-09-20T12:30:00.000Z",
    status: "done",
  });
  const completeReview = await authenticatedApi<TaskRow[]>(page, "PATCH", `/rest/v1/tasks?id=eq.${reviewTask.id}`, {
    completed_at: "2026-09-20T12:30:00.000Z",
    status: "done",
  });
  const completeRunning = await authenticatedApi<TaskRow[]>(page, "PATCH", `/rest/v1/tasks?id=eq.${runningTask.id}`, {
    completed_at: "2026-09-20T12:30:00.000Z",
    status: "done",
  });
  const completeStrength = await authenticatedApi<TaskRow[]>(page, "PATCH", `/rest/v1/tasks?id=eq.${strengthTask.id}`, {
    completed_at: "2026-09-20T12:30:00.000Z",
    status: "done",
  });

  expect({
    completeMeal: completeMeal.ok,
    completeReview: completeReview.ok,
    completeRunning: completeRunning.ok,
    completeStrength: completeStrength.ok,
    reschedule: reschedule.ok,
    schedule: schedule.ok,
    unschedule: unschedule.ok,
  }).toEqual({
    completeMeal: false,
    completeReview: false,
    completeRunning: false,
    completeStrength: false,
    reschedule: false,
    schedule: false,
    unschedule: false,
  });

  await page.reload();
  const taskState = await authenticatedApi<TaskRow[]>(
    page,
    "GET",
    `/rest/v1/tasks?id=in.(${mealTask.id},${reviewTask.id},${runningTask.id},${strengthTask.id})&select=id,status,completed_at,planned_date,scheduled_start_at`,
  );
  const mealState = await authenticatedApi<Array<{ completed_at: string | null; planned_at: string | null }>>(
    page,
    "GET",
    `/rest/v1/meals?id=eq.${meal.id}&select=completed_at,planned_at`,
  );
  const reviewState = await authenticatedApi<Array<{ status: string }>>(
    page,
    "GET",
    `/rest/v1/review_records?id=eq.${review.id}&select=status`,
  );
  const linkState = await authenticatedApi<Array<{ source_type: string; task_id: string }>>(
    page,
    "GET",
    "/rest/v1/schedule_source_links?select=source_type,task_id",
  );
  expect(taskState.body).toEqual(expect.arrayContaining([
    expect.objectContaining({
      completed_at: null,
      id: mealTask.id,
      planned_date: sourceDate,
      scheduled_start_at: `${sourceDate}T10:00:00+00:00`,
      status: "planned",
    }),
    expect.objectContaining({ completed_at: null, id: reviewTask.id, status: "planned" }),
    expect.objectContaining({ completed_at: null, id: runningTask.id, status: "planned" }),
    expect.objectContaining({ completed_at: null, id: strengthTask.id, status: "planned" }),
  ]));
  expect(mealState.body).toEqual([{ completed_at: null, planned_at: `${sourceDate}T10:00:00+00:00` }]);
  expect(reviewState.body).toEqual([{ status: "draft" }]);
  expect(linkState.body).toEqual(expect.arrayContaining([
    { source_type: "meal", task_id: mealTask.id },
    { source_type: "review", task_id: reviewTask.id },
    { source_type: "running_plan_item", task_id: runningTask.id },
    { source_type: "strength_plan", task_id: strengthTask.id },
  ]));

  const mealReschedule = await authenticatedApi<TaskRow>(page, "POST", "/rest/v1/rpc/schedule_linked_source", {
    p_duration_minutes: 45,
    p_planned_date: "2026-09-21",
    p_scheduled_start_at: "2026-09-21T13:00:00.000Z",
    p_source_id: meal.id,
    p_source_type: "meal",
  });
  expect(mealReschedule.ok).toBeTruthy();
  const mealUnschedule = await authenticatedApi<TaskRow>(page, "POST", "/rest/v1/rpc/unschedule_linked_meal_task", {
    p_task_id: mealTask.id,
  });
  expect(mealUnschedule.ok).toBeTruthy();
  const mealScheduleAgain = await authenticatedApi<TaskRow>(page, "POST", "/rest/v1/rpc/schedule_linked_source", {
    p_duration_minutes: 30,
    p_planned_date: "2026-09-21",
    p_scheduled_start_at: "2026-09-21T13:30:00.000Z",
    p_source_id: meal.id,
    p_source_type: "meal",
  });
  expect(mealScheduleAgain.ok).toBeTruthy();
  const mealCompletion = await authenticatedApi<TaskRow>(page, "POST", "/rest/v1/rpc/complete_linked_task", {
    p_completed_at: "2026-09-21T14:00:00.000Z",
    p_task_id: mealTask.id,
  });
  expect(mealCompletion.ok).toBeTruthy();
  const reopenMeal = await authenticatedApi<TaskRow[]>(page, "PATCH", `/rest/v1/tasks?id=eq.${mealTask.id}`, {
    completed_at: null,
    status: "planned",
  });
  expect(reopenMeal.ok).toBeFalsy();

  const reviewCompletion = await authenticatedApi<{ id: string }>(page, "POST", "/rest/v1/rpc/save_review_record", {
    p_blockers: [],
    p_kind: "daily",
    p_next_period_focus: null,
    p_open_loops: [],
    p_outcome: null,
    p_period_end: sourceDate,
    p_period_start: sourceDate,
    p_planning_note: null,
    p_status: "completed",
    p_timezone: "Europe/Berlin",
    p_wins: [],
  });
  expect(reviewCompletion.ok).toBeTruthy();

  const runningCompletion = await authenticatedApi<{ id: string }>(page, "POST", "/rest/v1/rpc/save_completed_running_session", {
    p_average_heart_rate: null,
    p_completed_at: "2026-09-21T14:00:00.000Z",
    p_distance_km: 5,
    p_duration_minutes: 30,
    p_notes: null,
    p_plan_item_id: runningItem.id,
    p_session_date: "2026-09-21",
    p_session_id: null,
    p_started_at: "2026-09-21T13:00:00.000Z",
  });
  expect(runningCompletion.ok).toBeTruthy();

  const exercise = await insertOne<{ id: string }>(page, "exercises", {
    name: `Z1 exercise ${stamp}`,
    user_id: userId,
  });
  const strengthSession = await insertOne<{ id: string }>(page, "strength_sessions", {
    plan_id: strengthPlan.id,
    session_date: "2026-09-21",
    status: "in_progress",
    user_id: userId,
  });
  await insertOne<{ id: string }>(page, "strength_set_logs", {
    exercise_id: exercise.id,
    repetitions: 8,
    session_id: strengthSession.id,
    set_order: 1,
    user_id: userId,
  });
  const strengthCompletion = await authenticatedApi<{ id: string }>(page, "POST", "/rest/v1/rpc/complete_strength_session", {
    p_completed_at: "2026-09-21T14:00:00.000Z",
    p_session_id: strengthSession.id,
  });
  expect(strengthCompletion.ok).toBeTruthy();

  const canonicalState = await authenticatedApi<Array<{ completed_at: string | null; id: string; status: string }>>(
    page,
    "GET",
    `/rest/v1/tasks?id=in.(${mealTask.id},${reviewTask.id},${runningTask.id},${strengthTask.id})&select=id,status,completed_at`,
  );
  const canonicalMealState = await authenticatedApi<Array<{ completed_at: string | null }>>(
    page,
    "GET",
    `/rest/v1/meals?id=eq.${meal.id}&select=completed_at`,
  );
  expect(canonicalState.body).toEqual(expect.arrayContaining([
    expect.objectContaining({ completed_at: expect.any(String), id: mealTask.id, status: "done" }),
    expect.objectContaining({ completed_at: expect.any(String), id: reviewTask.id, status: "done" }),
    expect.objectContaining({ completed_at: expect.any(String), id: runningTask.id, status: "done" }),
    expect.objectContaining({ completed_at: expect.any(String), id: strengthTask.id, status: "done" }),
  ]));
  expect(canonicalMealState.body).toEqual([{ completed_at: expect.any(String) }]);
});
