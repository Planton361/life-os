import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/features/real-data/supabase/database.types";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

test.use({ actionTimeout: 15000 });

const viewports = [
  { width: 3840, height: 2160 },
  { width: 1920, height: 1080 },
  { width: 1440, height: 1080 },
  { width: 390, height: 844 },
];
async function screenshot(page: Page, info: TestInfo, name: string) {
  const path = info.outputPath(`${name}.png`);
  const modalOpen = await page.locator("dialog:modal").count();
  await page.screenshot({
    path,
    fullPage: true,
    caret: "initial",
    style: "nextjs-portal { display:none!important }",
    mask: modalOpen
      ? []
      : [
          page.getByText("Anton", { exact: true }),
          page.getByText("Student · Werkstudent", { exact: true }),
        ],
  });
  await info.attach(name, { path, contentType: "image/png" });
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function fixture(page: Page, prefix: string) {
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, prefix, stamp);
  const cookie = (await page.context().cookies()).find((c) =>
    c.name.includes("auth-token"),
  )!;
  const session = JSON.parse(
    Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString(),
  );
  const api = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  await api.auth.setSession(session);
  const uid = (await api.auth.getUser()).data.user!.id;
  return { api, uid, stamp };
}

test("#88 viewport frame, direct Tasks, context, grouping and long-content growth", async ({
  page,
}, info) => {
  test.setTimeout(300000);
  const { api, uid, stamp } = await fixture(page, "issue88frame");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  const project = (
    await api
      .from("projects")
      .insert({
        user_id: uid,
        title: `Viewport Project ${stamp}`,
        status: "active",
      })
      .select()
      .single()
      .throwOnError()
  ).data!;
  const task = (
    await api
      .from("tasks")
      .insert({
        user_id: uid,
        project_id: project.id,
        title: `Direct Task ${stamp}`,
        status: "planned",
      })
      .select()
      .single()
      .throwOnError()
  ).data!;
  const visit = () => page.goto(`/projects/${project.id}`);
  const work = page.getByRole("region", {
    name: "Tasks & Progress",
    exact: true,
  });
  const frame = page.locator("[data-project-frame]");
  const row = work.locator(`[data-project-task="${task.id}"]`);
  const assertGeometry = async (name: string, sparse: boolean) => {
    for (const viewport of viewports.filter((v) => v.width !== 1440)) {
      await page.setViewportSize(viewport);
      await noOverflow(page);
      const f = (await frame.boundingBox())!;
      const w = (await work.boundingBox())!;
      const r = (await row.boundingBox())!;
      const review = (await page
        .getByRole("region", { name: "Project Abschluss", exact: true })
        .boundingBox())!;
      expect(r.height).toBeLessThan(230);
      expect(review.height).toBeLessThan(180);
      if (sparse && viewport.width >= 1920) {
        expect(f.height).toBeGreaterThan(viewport.height - 110);
        expect(w.height).toBeGreaterThan(viewport.height * 0.5);
        expect(f.y + f.height).toBeLessThanOrEqual(viewport.height + 30);
      }
      if (sparse && viewport.width === 390) {
        expect(
          await frame.evaluate((el) => getComputedStyle(el).minHeight),
        ).toBe("0px");
        expect(w.height).toBeLessThan(430);
      }
      expect(
        await work.evaluate((el) =>
          [el, ...el.querySelectorAll("[data-project-task-list]")].some((n) =>
            ["auto", "scroll"].includes(getComputedStyle(n).overflowY),
          ),
        ),
      ).toBe(false);
      const actions = row.locator('[aria-label^="Aktionen:"]');
      const children = await actions
        .locator(":scope > :not(dialog)")
        .evaluateAll((nodes) =>
          nodes.map((n) => {
            const b = n.getBoundingClientRect();
            return { x: b.x, y: b.y, right: b.right };
          }),
        );
      expect(children).toHaveLength(3);
      expect(
        Math.max(...children.map((b) => b.y)) -
          Math.min(...children.map((b) => b.y)),
      ).toBeLessThan(5);
      for (let i = 1; i < children.length; i++)
        expect(children[i].x - children[i - 1].right).toBeGreaterThan(10);
      await screenshot(page, info, `${name}-${viewport.width}`);
    }
    await page.setViewportSize(viewports[1]);
  };
  await visit();
  await expect(
    work.getByRole("heading", { name: "Work", exact: true }),
  ).toHaveCount(1);
  await expect(work).not.toContainText("Tasks & Milestones");
  await expect(work).not.toContainText("1 Tasks");
  await expect(work).not.toContainText("Noch keine Milestones.");
  await expect(
    work.getByRole("region", { name: "Ohne Milestone", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("complementary", { name: "Project Context Rail" }),
  ).toHaveCount(0);
  await expect(
    work.locator('[data-project-task-guidance="single-ready"]'),
  ).toHaveCount(1);
  await assertGeometry("simple-direct-task", true);
  await row
    .getByRole("link", { name: `${task.title}: Details öffnen` })
    .click();
  await expect(page).toHaveURL(new RegExp(`/tasks/${task.id}$`));
  await visit();
  const goal = (
    await api
      .from("goals")
      .insert({ user_id: uid, title: `Context Goal ${stamp}` })
      .select()
      .single()
      .throwOnError()
  ).data!;
  await api
    .from("projects")
    .update({ goal_id: goal.id })
    .eq("id", project.id)
    .throwOnError();
  await visit();
  const rail = page.getByRole("complementary", {
    name: "Project Context Rail",
    exact: true,
  });
  await expect(rail).toContainText(goal.title);
  await assertGeometry("meaningful-context", true);
  await page.setViewportSize(viewports[1]);
  expect(
    (await work.boundingBox())!.width / (await rail.boundingBox())!.width,
  ).toBeCloseTo(2, 1);
  expect((await rail.boundingBox())!.height).toBeLessThan(240);
  await api
    .from("tasks")
    .insert(
      Array.from({ length: 32 }, (_, i) => ({
        user_id: uid,
        project_id: project.id,
        title: `Long Task ${i} ${stamp}`,
        status: "planned" as const,
      })),
    )
    .throwOnError();
  await visit();
  await expect(
    work.locator('[data-project-task-guidance="multiple-ready"]'),
  ).toHaveCount(1);
  await expect(work.locator("[data-project-task]")).toHaveCount(33);
  expect((await frame.boundingBox())!.height).toBeGreaterThan(1080);
  await assertGeometry("long-content", false);
  expect(errors).toEqual([]);
});

test("#88 compact completion Review, History depth and reopen survive reload", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const { api, uid, stamp } = await fixture(page, "issue88review");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  const project = (
    await api
      .from("projects")
      .insert({
        user_id: uid,
        title: `Review Project ${stamp}`,
        status: "active",
        desired_result: `Accepted result ${stamp}`,
      })
      .select()
      .single()
      .throwOnError()
  ).data!;
  await api
    .from("tasks")
    .insert({
      user_id: uid,
      project_id: project.id,
      title: `Delivered Task ${stamp}`,
      status: "done",
    })
    .throwOnError();
  const state = (
    await api
      .rpc("project_review_context", { p_project_id: project.id })
      .throwOnError()
  ).data as unknown as {
    completion_revision: string;
    completion_cycle: string;
  };
  await api
    .rpc("project_depth_command", {
      p_project_id: project.id,
      p_command_id: crypto.randomUUID(),
      p_operation: "criterion.create",
      p_expected_revision: state.completion_revision,
      p_expected_cycle: state.completion_cycle,
      p_payload: { text: `Acceptance ${stamp}`, sort_order: 0 },
    })
    .throwOnError();
  await page.goto(`/projects/${project.id}`);
  const review = page.getByRole("region", {
    name: "Project Abschluss",
    exact: true,
  });
  await review
    .getByRole("button", { name: "Abschluss prüfen", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Project Review",
    exact: true,
  });
  await expect(
    dialog.getByRole("combobox", { name: "Entscheidung", exact: true }),
  ).toBeFocused();
  await dialog
    .getByLabel("Begründung", { exact: true })
    .fill(`Continue ${stamp}`);
  await dialog
    .getByRole("button", { name: "Review speichern", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(
    review.getByRole("button", { name: "Abschluss prüfen", exact: true }),
  ).toBeVisible();
  await review
    .getByRole("button", { name: "Abschluss prüfen", exact: true })
    .click();
  await dialog
    .getByRole("combobox", { name: "Entscheidung", exact: true })
    .selectOption("completed");
  await dialog
    .getByLabel("Ergebnis ausdrücklich bestätigen", { exact: true })
    .check();
  await dialog
    .getByRole("combobox", {
      name: `Bewertung für Acceptance ${stamp}`,
      exact: true,
    })
    .selectOption("satisfied");
  await dialog
    .getByLabel("Begründung", { exact: true })
    .fill(`Completed ${stamp}`);
  await dialog
    .getByRole("button", { name: "Review speichern", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  await expect(review.locator("[data-completion-summary]")).toContainText(
    `Completed ${stamp}`,
  );
  await page.reload();
  for (const viewport of viewports.filter((v) => v.width !== 1440)) {
    await page.setViewportSize(viewport);
    await noOverflow(page);
    expect((await review.boundingBox())!.height).toBeLessThan(220);
    await expect(
      page.getByRole("dialog", { name: "Abschlussverlauf", exact: true }),
    ).toBeHidden();
    await screenshot(page, info, `completed-review-${viewport.width}`);
  }
  await review
    .getByRole("link", { name: "Abschluss-Review ansehen", exact: true })
    .click();
  const history = page.getByRole("dialog", {
    name: "Abschlussverlauf",
    exact: true,
  });
  await expect(history).toContainText(`Completed ${stamp}`);
  await page.reload();
  await expect(history).toContainText(`Completed ${stamp}`);
  await page.keyboard.press("Escape");
  await review
    .getByRole("button", { name: "Project wieder öffnen", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Wiederöffnung bestätigen", exact: true })
    .getByRole("button", { name: "Project wieder öffnen", exact: true })
    .click();
  await expect(
    review.getByRole("button", { name: "Abschluss prüfen", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    review.getByRole("button", { name: "Abschluss prüfen", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("#88 Milestone integration keeps compact heads, contained Tasks and right-side actions", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const { api, uid, stamp } = await fixture(page, "issue88milestonevisual");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" || /hydration/i.test(m.text()))
      errors.push(m.text());
  });
  const project = (
    await api
      .from("projects")
      .insert({
        user_id: uid,
        title: `Milestone Work ${stamp}`,
        status: "active",
        desired_result: `Visible result ${stamp}`,
      })
      .select()
      .single()
      .throwOnError()
  ).data!;
  const makeMilestone = async (
    title: string,
    status: "active" | "open" = "open",
  ) => {
    await api
      .rpc("write_project_milestone", {
        p_project_id: project.id,
        p_operation: "save",
        p_title: title,
        p_status: status,
        p_target_date: "2026-10-20",
      })
      .throwOnError();
    return (
      await api
        .from("project_milestones")
        .select()
        .eq("project_id", project.id)
        .eq("title", title)
        .single()
        .throwOnError()
    ).data!;
  };
  const current = await makeMilestone(`Current ${stamp}`, "active");
  const tasks = (
    await api
      .from("tasks")
      .insert([
        {
          user_id: uid,
          project_id: project.id,
          milestone_id: current.id,
          title: `Assigned ${stamp}`,
          status: "planned",
        },
        {
          user_id: uid,
          project_id: project.id,
          milestone_id: current.id,
          title: `Delivered ${stamp}`,
          status: "done",
        },
        {
          user_id: uid,
          project_id: project.id,
          title: `Unassigned ${stamp}`,
          status: "planned",
        },
      ])
      .select()
      .throwOnError()
  ).data!;
  const assigned = tasks.find((t) => t.status === "planned" && t.milestone_id)!;
  const work = page.getByRole("region", {
    name: "Tasks & Progress",
    exact: true,
  });
  const group = work.locator(`[data-milestone-id="${current.id}"]`);
  const unassigned = work.getByRole("region", {
    name: "Ohne Milestone",
    exact: true,
  });
  const capture = async (name: string) => {
    for (const viewport of [
      { width: 1920, height: 1080 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(group).toBeVisible();
      await expect(unassigned).toContainText(`Unassigned ${stamp}`);
      await noOverflow(page);
      const head = group.locator(":scope > div").first();
      await expect(head).toContainText("Meilenstein");
      await expect(head).toContainText("Aktuell");
      await expect(head).toContainText("20.10.2026");
      await expect(head).toContainText("1/2 Tasks erledigt");
      const row = group.locator(`[data-project-task="${assigned.id}"]`);
      await expect(row).toBeVisible();
      const list = group.locator(":scope > ul");
      const unassignedRow = unassigned.locator("[data-project-task]").first();
      const rowGrammar = (el: Element) => {
        const css = getComputedStyle(el);
        return [
          css.display,
          css.paddingTop,
          css.paddingBottom,
          css.gap,
          css.borderBottomWidth,
        ];
      };
      expect(await row.evaluate(rowGrammar)).toEqual(
        await unassignedRow.evaluate(rowGrammar),
      );
      const resultRead = page.getByRole("region", {
        name: "Project Ergebnis und Kriterien",
      });
      await expect(resultRead).toContainText(`Visible result ${stamp}`);
      await expect(resultRead).toContainText(`Visible criterion ${stamp}`);
      await expect(resultRead.getByRole("button")).toHaveCount(0);
      const header = page.getByLabel("Project Header", { exact: true });
      const resultAction = header.getByRole("button", {
        name: "Ergebnis und Kriterien bearbeiten",
        exact: true,
      });
      await expect(resultAction).toBeVisible();
      expect(
        await group.evaluate((el) => getComputedStyle(el).backgroundColor),
      ).toBe("rgba(0, 0, 0, 0)");
      expect(
        await list.evaluate((el) => getComputedStyle(el).borderRadius),
      ).toBe("0px");
      if (viewport.width === 1920) {
        const hb = (await head.boundingBox())!;
        const manage = (await group
          .getByRole("button", { name: "Milestone verwalten", exact: true })
          .boundingBox())!;
        const lb = (await list.boundingBox())!;
        const gb = (await group.boundingBox())!;
        expect(hb.height).toBeLessThan(32);
        const actionGroup = resultAction.locator("..");
        const actionBounds = (await actionGroup.boundingBox())!;
        const headerBounds = (await header.boundingBox())!;
        expect(
          Math.abs(
            actionBounds.x +
              actionBounds.width -
              headerBounds.x -
              headerBounds.width +
              16,
          ),
        ).toBeLessThan(3);
        await expect(
          actionGroup.getByRole("button", {
            name: "Beziehungen verwalten",
            exact: true,
          }),
        ).toBeVisible();
        await expect(
          actionGroup.getByRole("button", {
            name: "Project verwalten",
            exact: true,
          }),
        ).toBeVisible();
        expect(Math.abs(manage.y - hb.y)).toBeLessThan(20);
        expect(
          lb.y - Math.max(hb.y + hb.height, manage.y + manage.height),
        ).toBeLessThanOrEqual(8);
        expect(
          Math.abs(manage.x + manage.width - gb.x - gb.width),
        ).toBeLessThan(3);
        const cluster = (await row
          .locator('[aria-label^="Aktionen:"]')
          .boundingBox())!;
        expect(
          Math.abs(cluster.x + cluster.width - gb.x - gb.width),
        ).toBeLessThan(3);
        const heading = (await work
          .getByRole("heading", { name: "Work", exact: true })
          .boundingBox())!;
        for (const control of [
          work.getByRole("link", { name: "+ Task", exact: true }),
          work.getByRole("button", {
            name: "Meilenstein +",
            exact: true,
          }),
        ]) {
          const b = (await control.boundingBox())!;
          expect(b.x).toBeGreaterThan(heading.x + heading.width);
          expect(Math.abs(b.y - heading.y)).toBeLessThan(16);
        }
      }
      await screenshot(page, info, `${name}-${viewport.width}`);
    }
  };
  await page.goto(`/projects/${project.id}`);
  await page
    .getByLabel("Project Header", { exact: true })
    .getByRole("button", {
      name: "Ergebnis und Kriterien bearbeiten",
      exact: true,
    })
    .click();
  const resultManager = page.getByRole("dialog", {
    name: "Ergebnis und Kriterien verwalten",
    exact: true,
  });
  await expect(resultManager.getByLabel("Gewünschtes Ergebnis")).toBeFocused();
  await resultManager
    .getByLabel("Neues Kriterium")
    .fill(`Visible criterion ${stamp}`);
  await resultManager
    .getByRole("button", { name: "Kriterium hinzufügen", exact: true })
    .click();
  await expect(resultManager.getByRole("status")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", {
      name: "Ergebnis und Kriterien bearbeiten",
      exact: true,
    }),
  ).toBeFocused();
  await page.reload();
  await capture("readability-current-unassigned");
  const next = await makeMilestone(`Next ${stamp}`);
  const empty = await makeMilestone(`Empty ${stamp}`);
  await api
    .from("tasks")
    .insert({
      user_id: uid,
      project_id: project.id,
      milestone_id: next.id,
      title: `Next work ${stamp}`,
      status: "planned",
    })
    .throwOnError();
  await page.reload();
  await expect(work.locator("[data-milestone-id]")).toHaveCount(3);
  const emptyGroup = work.locator(`[data-milestone-id="${empty.id}"]`);
  await expect(emptyGroup).toContainText("Noch keine Tasks.");
  expect((await emptyGroup.boundingBox())!.height).toBeLessThan(150);
  await capture("readability-multiple-empty");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await group
    .getByRole("button", { name: "Milestone verwalten", exact: true })
    .click();
  await expect(
    group.getByRole("dialog", { name: "Milestone verwalten", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    group.getByRole("button", { name: "Milestone verwalten", exact: true }),
  ).toBeFocused();
  await group
    .locator(`[data-project-task="${assigned.id}"]`)
    .getByRole("button", { name: "Bearbeiten", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Task bearbeiten", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
});
