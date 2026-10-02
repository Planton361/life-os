import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import type { Database } from "@/features/real-data/supabase/database.types";
import { readWeeklyPlanningContext } from "@/features/real-data/supabase/repositories/weekly-planning-read";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

// Fixture writes are confined to the disposable local stack; Calendar controls
// below exercise the actual authenticated Actions and persisted read models.
test("PP3 canonical context, READY queue, two owners, no-write reads, Week handoff and responsive interaction", async ({
  page,
  context,
}, info) => {
  test.setTimeout(240000);
  expect(process.env.LIFE_OS_E2E_RUNTIME).toBe("DISPOSABLE");
  const stamp = Date.now();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await signUpTechnicalManualUser(page, "pp3", stamp);
  const cookie = (await context.cookies()).find((c) =>
    c.name.includes("auth-token"),
  )!;
  const session = JSON.parse(
    Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString(),
  );
  const makeClient = () =>
    createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  const api = makeClient();
  await api.auth.setSession(session);
  const uid = (await api.auth.getUser()).data.user!.id;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
  }).format(new Date());
  const goal = async (title: string) =>
    (
      await api
        .from("goals")
        .insert({
          user_id: uid,
          title,
          description: `Outcome ${title}`,
          why: `Why ${title}`,
        })
        .select()
        .single()
        .throwOnError()
    ).data!;
  const direct = await goal(`Direct ${stamp}`),
    inherited = await goal(`Inherited ${stamp}`);
  const project = (
    await api
      .from("projects")
      .insert({
        user_id: uid,
        title: `Project ${stamp}`,
        desired_result: `Result ${stamp} ${"Den wissenschaftlichen Arbeitsstand nachvollziehbar prüfen und die nächste Entscheidung dokumentieren. ".repeat(8).trim()}`,
        goal_id: inherited.id,
        status: "active",
      })
      .select()
      .single()
      .throwOnError()
  ).data!;
  const pm = async (title: string, status: string, sort_order: number) =>
    (
      await api
        .from("project_milestones")
        .insert({
          user_id: uid,
          project_id: project.id,
          title,
          description: `Stage outcome ${title}`,
          status,
          sort_order,
        })
        .select()
        .single()
        .throwOnError()
    ).data!;
  const assigned = await pm(`Assigned ${stamp}`, "open", 0),
    current = await pm(`Project focus ${stamp}`, "active", 1);
  const gm = async (goal_id: string, title: string) =>
    (
      await api
        .from("goal_milestones")
        .insert({
          user_id: uid,
          goal_id,
          title,
          description: `Intermediate ${title}`,
          status: "active",
        })
        .select()
        .single()
        .throwOnError()
    ).data!;
  const gs1 = await gm(direct.id, `Direct focus ${stamp}`),
    gs2 = await gm(inherited.id, `Inherited focus ${stamp}`);
  const task = async (
    title: string,
    values: Partial<Database["public"]["Tables"]["tasks"]["Insert"]> = {},
  ) =>
    (
      await api
        .from("tasks")
        .insert({ user_id: uid, title, status: "planned", ...values })
        .select()
        .single()
        .throwOnError()
    ).data!;
  const mixed = await task(`Mixed ${stamp}`, {
    project_id: project.id,
    goal_id: direct.id,
    milestone_id: assigned.id,
    planned_date: today,
  });
  const via = await task(`Via ${stamp}`, { project_id: project.id });
  const same = await task(`Redundant ${stamp}`, {
    project_id: project.id,
    goal_id: inherited.id,
  });
  const only = await task(`Goal only ${stamp}`, { goal_id: direct.id });
  const plain = await task(`Plain ${stamp}`);
  const long = await task(
    `Long ${stamp} ${"VeryLongUnbrokenTaskTitle".repeat(6)}`,
  );
  const blocker = await task(`Predecessor ${stamp}`, {
    project_id: project.id,
  });
  const blocked = await task(`Blocked ${stamp}`, {
    project_id: project.id,
    due_at: "2026-01-01T12:00:00Z",
  });
  await api
    .from("task_dependencies")
    .insert({
      user_id: uid,
      project_id: project.id,
      predecessor_task_id: blocker.id,
      successor_task_id: blocked.id,
    })
    .throwOnError();
  await api
    .from("goal_milestone_task_support")
    .insert({
      user_id: uid,
      goal_id: direct.id,
      goal_milestone_id: gs1.id,
      task_id: only.id,
    })
    .throwOnError();
  await api
    .from("goal_milestone_project_support")
    .insert({
      user_id: uid,
      goal_id: inherited.id,
      goal_milestone_id: gs2.id,
      project_id: project.id,
    })
    .throwOnError();
  await api
    .from("goal_milestone_task_support")
    .insert({
      user_id: uid,
      goal_id: inherited.id,
      goal_milestone_id: gs2.id,
      task_id: same.id,
    })
    .throwOnError();
  const createSkill = async (name: string) => {
    const r = await api
      .rpc("skill_development_command", {
        p_skill_id: null,
        p_command_id: crypto.randomUUID(),
        p_operation: "skill.create",
        p_expected_revision: null,
        p_payload: { name },
      })
      .throwOnError();
    return (r.data as { skill_id: string }).skill_id;
  };
  const s1 = await createSkill(`Skill one ${stamp}`),
    s2 = await createSkill(`Skill two ${stamp}`);
  const cmd = async (operation: string, payload: Record<string, string>) => {
    const state = await api
      .rpc("skill_development_read", { p_skill_id: s1 })
      .throwOnError();
    return (
      await api
        .rpc("skill_development_command", {
          p_skill_id: s1,
          p_command_id: crypto.randomUUID(),
          p_operation: operation,
          p_expected_revision: state.data.skill.development_revision,
          p_payload: payload,
        })
        .throwOnError()
    ).data as { target_id: string };
  };
  const target = await cmd("target.create", {
    title: `Development focus ${stamp}`,
    description: "Explicit orientation only",
  });
  await cmd("target.current", { target_id: target.target_id });
  await api
    .from("task_skill_links")
    .insert([
      { user_id: uid, task_id: mixed.id, skill_id: s1 },
      { user_id: uid, task_id: mixed.id, skill_id: s2 },
    ])
    .throwOnError();
  const other = makeClient();
  const otherAuth = await other.auth.signUp({
    email: `pp3-other-${stamp}@example.local`,
    password: `C1proof-${stamp}`,
  });
  expect(otherAuth.error).toBeNull();
  const otherUid = otherAuth.data.user!.id;
  const secret = (
    await other
      .from("tasks")
      .insert({
        user_id: otherUid,
        title: `Secret ${stamp}`,
        status: "planned",
      })
      .select()
      .single()
      .throwOnError()
  ).data!;
  const snapshot = async () => {
    const tables = [
      "tasks",
      "projects",
      "goals",
      "project_milestones",
      "goal_milestones",
      "goal_milestone_task_support",
      "goal_milestone_project_support",
      "task_skill_links",
      "skills",
      "task_dependencies",
    ] as const;
    return JSON.stringify(
      await Promise.all(
        tables.map(
          async (t) =>
            (
              await api
                .from(t)
                .select("*")
                .eq("user_id", uid)
                .order("id")
                .throwOnError()
            ).data,
        ),
      ),
    );
  };
  const before = await snapshot();
  const read = await readWeeklyPlanningContext(api, uid);
  expect(read.contexts[blocked.id].execution).toBe("BLOCKED");
  expect(read.contexts[mixed.id]).toMatchObject({
    execution: "READY",
    goalConflict: true,
    project: { assigned: { id: assigned.id }, current: { id: current.id } },
  });
  expect(read.contexts[via.id].goals[0].path).toBe("via_project");
  expect(read.contexts[same.id].goals).toHaveLength(1);
  expect(read.contexts[same.id].goals[0].path).toBe("redundant");
  expect(read.contexts[only.id].goals[0].path).toBe("direct");
  expect(
    read.contexts[mixed.id].skills.map((s) => Boolean(s.currentTarget)).sort(),
  ).toEqual([false, true]);
  expect(read.contexts[secret.id]).toBeUndefined();
  const otherRead = await readWeeklyPlanningContext(other, otherUid);
  expect(otherRead.contexts[mixed.id]).toBeUndefined();
  expect(otherRead.contexts[secret.id]).toBeDefined();
  expect((await readWeeklyPlanningContext(other, uid)).contexts).toEqual({});
  const failing = new Proxy(api, {
    get(t, key) {
      if (key === "rpc")
        return (name: string, args: unknown) =>
          name === "read_task_dependency_graph"
            ? Promise.resolve({
                data: null,
                error: { message: "technical read failure" },
              })
            : t.rpc(name as never, args as never);
      return Reflect.get(t, key);
    },
  });
  const failed = await readWeeklyPlanningContext(failing, uid);
  expect(failed.dependencyUnavailable).toBe(true);
  expect(failed.contexts[mixed.id].execution).toBe("unknown");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  await page.goto(`/tasks/${mixed.id}`);
  const handoff = page
    .getByRole("region", { name: "Dein nächster Schritt", exact: true })
    .getByRole("link", { name: "Im Calendar planen", exact: true });
  await expect(handoff).toHaveAttribute(
    "href",
    `/calendar?task=${mixed.id}&date=${today}&view=week`,
  );
  await handoff.click();
  const route = `/calendar?task=${mixed.id}&date=${today}&view=week`;
  await expect(page).toHaveURL(route);
  const queue = page.locator('[data-calendar-section="planning-queue"]');
  const selected = page.locator(`[data-weekly-task-context="${mixed.id}"]`);
  const relation = selected.getByRole("region", {
    name: "Zusammenhang",
    exact: true,
  });
  await expect(
    queue.getByRole("button", { name: new RegExp(blocked.title) }),
  ).toHaveCount(0);
  await expect(
    queue
      .getByRole("button", { name: new RegExp(mixed.title) })
      .locator("[data-queue-orientation]"),
  ).toContainText("+4");
  await expect(relation).toContainText("Abweichende Goal-Pfade");
  for (const text of [
    project.title,
    project.desired_result!,
    assigned.title,
    current.title,
    direct.title,
    inherited.title,
    gs1.title,
    gs2.title,
    `Development focus ${stamp}`,
    "Kein aktueller Entwicklungsfokus.",
  ])
    await expect(relation).toContainText(text);
  await expect(relation.locator("[data-weekly-skill]")).toHaveCount(2);
  const schedule = page.locator('[data-calendar-section="queue-schedule"]');
  await expect(schedule).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(route);
  await expect(selected).toBeVisible();
  expect(await snapshot()).toBe(before);
  const skillRead = await api.rpc("skill_development_read", { p_skill_id: s1 });
  expect(skillRead.data!.skill.development_revision).toBe(2);
  expect(skillRead.data!.evidence).toHaveLength(0);
  for (const [width, height] of [
    [3840, 2160],
    [1920, 1080],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(selected).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const rowBox = (await queue
      .getByRole("button", { name: new RegExp(mixed.title) })
      .boundingBox())!;
    const orientationBox = (await queue
      .getByRole("button", { name: new RegExp(mixed.title) })
      .locator("[data-queue-orientation]")
      .boundingBox())!;
    expect(orientationBox.y + orientationBox.height).toBeLessThanOrEqual(
      rowBox.y + rowBox.height - 1,
    );
    const railBounds = (await page
      .locator(".calendar-right-rail")
      .boundingBox())!;
    expect(railBounds.x).toBeGreaterThanOrEqual(0);
    expect(railBounds.x + railBounds.width).toBeLessThanOrEqual(width + 1);
    if (width > 390)
      expect(railBounds.y + railBounds.height).toBeLessThanOrEqual(height + 1);
    await page.screenshot({
      path: info.outputPath(`pp3-calendar-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.keyboard.press("Escape");
  const row = queue.getByRole("button", { name: new RegExp(mixed.title) });
  await expect(row).toBeFocused();
  await row.press("Enter");
  await expect(selected).toBeVisible();
  const contextHrefs = await relation
    .locator("a")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")!));
  expect(contextHrefs).toHaveLength(5);
  for (const href of contextHrefs) {
    const link = relation.locator(`a[href="${href}"]`);
    await link.focus();
    await expect(link).toBeFocused();
    await link.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await page.goto(route);
  }
  for (const [t, text] of [
    [via, "Goal über Project"],
    [same, "Direkt und über Project · dasselbe Goal"],
    [only, "Direkter Goal-Kontext"],
    [plain, "Kein verknüpfter Project-, Goal- oder Skill-Kontext."],
  ] as const) {
    await page.goto(`/calendar?task=${t.id}&date=${today}&view=week`);
    await expect(
      page.locator(`[data-weekly-task-context="${t.id}"]`),
    ).toContainText(text);
  }
  await expect(
    page.locator(`[data-weekly-task-context="${same.id}"]`),
  ).toHaveCount(0);
  await page.goto(`/calendar?task=${same.id}&date=${today}&view=week`);
  const supported = page.locator(`[data-weekly-task-context="${same.id}"]`);
  await expect(supported).toContainText("Task unterstützt Goal-Etappe");
  await expect(supported).toContainText("Project unterstützt Goal-Etappe");
  await page
    .getByRole("button", { name: "Planung schließen", exact: true })
    .click();
  for (const t of [mixed, via, same, only, plain, long, blocker]) {
    await queue
      .getByRole("button", {
        name: new RegExp(t.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
      })
      .click();
    await expect(
      page.locator(`[data-weekly-task-context="${t.id}"]`),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Planung schließen", exact: true })
      .click();
  }
  await page.goto(`/calendar?task=${blocked.id}&date=${today}&view=week`);
  const blockedPanel = page.locator(
    `[data-weekly-task-context="${blocked.id}"]`,
  );
  await expect(blockedPanel).toContainText("BLOCKED");
  await expect(
    blockedPanel.getByRole("link", { name: blocker.title }),
  ).toHaveAttribute("href", `/tasks/${blocker.id}`);
  await expect(schedule).toHaveCount(0);
  await page.reload();
  await expect(blockedPanel).toBeVisible();
  await page
    .getByRole("button", { name: "Inspector schließen", exact: true })
    .click();
  await expect(page).not.toHaveURL(/(?:\?|&)task=/);
  await page.goto(`/calendar?task=${blocked.id}&date=${today}&view=week`);
  await expect(blockedPanel).toBeVisible();
  // A direct SSR arrival may precede the client Escape listener. Retry the
  // actual key interaction until the interactive page dismisses selection.
  await expect(async () => {
    await page.keyboard.press("Escape");
    await expect(page).not.toHaveURL(/(?:\?|&)task=/);
  }).toPass({ timeout: 10000 });
  await expect(page.locator('[data-calendar-view="week"]')).toBeFocused();
  await page.goto(`/calendar?task=${blocked.id}&date=${today}&view=week`);
  await blockedPanel.getByRole("link", { name: blocker.title }).click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${blocker.id}$`));
  await page.goto(`/calendar?task=${long.id}&date=${today}&view=week`);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("pp3-long-390.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(route);
  expect(await snapshot()).toBe(before);
  const form = schedule.getByRole("form", { name: `${mixed.title} planen` });
  await form.getByLabel("Weekday").fill(today);
  await form.getByLabel("Start time").fill("09:00");
  await form
    .getByRole("button", { name: "Schedule task", exact: true })
    .click();
  await expect(
    page.getByLabel("Benachrichtigungen").getByRole("status"),
  ).toContainText(/geplant|terminiert|Zeitblock|gespeichert/i);
  await page.reload();
  const block = page.locator("[data-calendar-timed-block]").filter({
    has: page.getByRole("button", { name: new RegExp(mixed.title) }),
  });
  await expect(block).toBeVisible();
  await expect(selected).toBeVisible();
  await expect(
    queue.getByRole("button", { name: new RegExp(mixed.title) }),
  ).toHaveCount(0);
  await page.goto(`/tasks/${mixed.id}`);
  const scheduledHandoff = page
    .getByRole("region", { name: "Dein nächster Schritt", exact: true })
    .getByRole("link", { name: "Geplanten Termin öffnen", exact: true });
  await expect(scheduledHandoff).toHaveAttribute("href", route);
  await scheduledHandoff.click();
  await expect(page).toHaveURL(route);
  await expect(
    page.locator('[data-calendar-section="inspector"]'),
  ).toBeVisible();
  await page.reload();
  await expect(selected).toBeVisible();
  await page.goto("/today");
  await expect(
    page.locator('[data-today-section="activity-stream"]'),
  ).toContainText(mixed.title);
  await page.reload();
  await expect(
    page.locator('[data-today-section="activity-stream"]'),
  ).toContainText(mixed.title);
  await page.goto("/dashboard");
  await expect(
    page.locator('section[aria-labelledby="today-agenda-title"]'),
  ).toContainText(mixed.title);
  await page.reload();
  await expect(
    page.locator('section[aria-labelledby="today-agenda-title"]'),
  ).toContainText(mixed.title);
  await page.goto(route);
  for (const [width, height] of [
    [3840, 2160],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    await page.locator('[data-calendar-section="inspector"]').evaluate((el) => {
      el.scrollTop = 0;
    });
    await page.screenshot({
      path: info.outputPath(`pp3-scheduled-context-${width}.png`),
      fullPage: true,
    });
  }
  // A scheduled Task remains inspectable if a real predecessor becomes blocking.
  await api
    .from("task_dependencies")
    .insert({
      user_id: uid,
      project_id: project.id,
      predecessor_task_id: blocker.id,
      successor_task_id: mixed.id,
    })
    .throwOnError();
  await page.reload();
  await expect(selected).toContainText("BLOCKED");
  await expect(
    selected.getByRole("link", { name: blocker.title }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("PP3 retains honest Manual auth-blocked, Empty and curated Demo; local DB checks", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.context().addCookies([
    {
      name: "life_os_profile",
      value: "manual",
      url:
        process.env.PLAYWRIGHT_BASE_URL ??
        `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT}`,
      httpOnly: true,
    },
  ]);
  await page.goto("/calendar");
  await expect(
    page.locator('[data-calendar-section="planning-queue"]'),
  ).toContainText("authentifizierte Supabase-Session");
  await page.context().addCookies([
    {
      name: "life_os_profile",
      value: "empty",
      url: page.url(),
      httpOnly: true,
    },
  ]);
  await page.reload();
  await expect(
    page.locator('[data-calendar-section="planning-queue"]'),
  ).not.toContainText("Mixed");
  await page.context().addCookies([
    {
      name: "life_os_profile",
      value: "demo",
      url: page.url(),
      httpOnly: true,
    },
  ]);
  await page.reload();
  await expect(
    page.locator('[data-calendar-section="planning-queue"]'),
  ).toBeVisible();
  for (const args of [
    ["db", "lint", "--local", "--level", "warning"],
    [
      "db",
      "advisors",
      "--local",
      "--type",
      "security",
      "--level",
      "warn",
      "--fail-on",
      "none",
    ],
  ])
    execFileSync(
      "pnpm",
      [
        "exec",
        "supabase",
        ...args,
        "--workdir",
        process.env.LIFE_OS_E2E_WORKDIR!,
      ],
      { stdio: "inherit" },
    );
});
