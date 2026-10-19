import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";
import {
  expectTaskCaptureParity,
  expectOptionalTaskFieldParity,
  standaloneTaskCapture,
  setTaskOptionalSections,
} from "./support/task-create-parity";

test("Issue 80 standalone and contextual Task capture have responsive visual parity", async ({
  page,
  context,
}, info) => {
  test.setTimeout(180_000);
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, "origin-parity", stamp);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || /hydration/i.test(message.text()))
      errors.push(message.text());
  });
  const cookie = (await context.cookies()).find((item) =>
    item.name.includes("auth-token"),
  )!;
  const api = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  await api.auth.setSession(
    JSON.parse(
      Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString(),
    ),
  );
  const uid = (await api.auth.getUser()).data.user!.id;
  const goal = (
    await api
      .from("goals")
      .insert({ user_id: uid, title: `Parity Goal ${stamp}` })
      .select()
      .single()
      .throwOnError()
  ).data!;
  const project = (
    await api
      .from("projects")
      .insert({
        user_id: uid,
        title: `Parity Project ${stamp}`,
        status: "active",
        goal_id: goal.id,
      })
      .select()
      .single()
      .throwOnError()
  ).data!;
  const milestone = (
    await api
      .from("project_milestones")
      .insert({
        user_id: uid,
        project_id: project.id,
        title: `Parity Milestone ${stamp}`,
        status: "active",
      })
      .select()
      .single()
      .throwOnError()
  ).data!;
  const goalMilestone = (
    await api
      .from("goal_milestones")
      .insert({
        user_id: uid,
        goal_id: goal.id,
        title: `Parity Goal Milestone ${stamp}`,
        status: "active",
      })
      .select()
      .single()
      .throwOnError()
  ).data!;
  const form = page.getByRole("form", { name: "Task erstellen", exact: true });
  const origins = [
    "standalone",
    "empty-project",
    "non-empty-project",
    "milestone",
    "goal",
    "goal-milestone",
  ] as const;
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    const baseline = await standaloneTaskCapture(page);
    for (const origin of origins) {
      if (origin === "empty-project") {
        // Make this a genuinely empty Project at each viewport.
        await api
          .from("tasks")
          .update({ archived_at: new Date().toISOString() })
          .eq("user_id", uid)
          .eq("project_id", project.id)
          .throwOnError();
        await page.goto(`/projects/${project.id}`);
        await page
          .getByRole("region", { name: "Project Task guidance", exact: true })
          .getByRole("link", { name: "Erste Task anlegen", exact: true })
          .click();
      } else if (origin === "non-empty-project") {
        await page.goto(`/projects/${project.id}`);
        await page
          .getByRole("region", { name: "Tasks & Progress", exact: true })
          .getByRole("link", { name: "+ Task", exact: true })
          .click();
      } else {
        const query =
          origin === "milestone"
            ? `?project=${project.id}&milestone=${milestone.id}`
            : origin === "goal"
              ? `?goal=${goal.id}`
              : origin === "goal-milestone"
                ? `?goal=${goal.id}&goalMilestone=${goalMilestone.id}`
                : "";
        await page.goto(`/tasks/new${query}`);
      }
      await expectTaskCaptureParity(page, baseline);
      await expect(page).toHaveURL(/\/tasks\/new(?:\?|$)/);
      await page.reload();
      await expectTaskCaptureParity(page, baseline);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const capturePath = info.outputPath(`${origin}-${viewport.width}.png`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForFunction(() => window.scrollY === 0);
      await page.screenshot({
        path: capturePath,
        fullPage: true,
        caret: "initial",
        style: "nextjs-portal { display: none !important; }",
      });
      await info.attach(`${origin}-${viewport.width}`, {
        path: capturePath,
        contentType: "image/png",
      });
      await setTaskOptionalSections(page, true);
      await expectOptionalTaskFieldParity(
        page,
        baseline,
        origin === "goal-milestone",
      );
      if (origin.includes("project") || origin === "milestone") {
        await expect(form.getByLabel("Project", { exact: true })).toHaveValue(
          project.id,
        );
        await expect(
          form.getByLabel("Project", { exact: true }),
        ).toHaveAttribute("required", "");
        await expect(
          form
            .getByLabel("Project", { exact: true })
            .locator('option[value=""]'),
        ).toHaveCount(0);
        await expect(
          form.getByLabel("Project Milestone", { exact: true }),
        ).toHaveValue(milestone.id);
      } else if (origin === "goal") {
        await expect(
          form.getByLabel("Goal-Kontext", { exact: true }),
        ).toHaveValue(goal.id);
      } else if (origin === "goal-milestone") {
        await expect(
          form.getByLabel("Project-Kontext (optional)", { exact: true }),
        ).toBeVisible();
        await expect(form.locator('input[name="goalId"]')).toHaveValue(goal.id);
        await expect(form.locator('input[name="goalMilestoneId"]')).toHaveValue(
          goalMilestone.id,
        );
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await setTaskOptionalSections(page, false);
      await expectTaskCaptureParity(page, baseline);
      const createUrl = page.url();
      const cancelHref = await form
        .getByRole("link", { name: "Abbrechen", exact: true })
        .getAttribute("href");
      const expectedCancelHref =
        origin === "standalone"
          ? "/tasks"
          : origin.includes("project") || origin === "milestone"
            ? `/projects/${project.id}`
            : origin === "goal-milestone"
              ? `/goals/${goal.id}?goalMilestone=${goalMilestone.id}`
              : `/goals/${goal.id}`;
      expect(cancelHref).toBe(expectedCancelHref);
      const cancelledTitle = `Cancelled ${origin} ${viewport.width} ${stamp}`;
      await form.getByLabel("Titel", { exact: true }).fill(cancelledTitle);
      await form.getByRole("link", { name: "Abbrechen", exact: true }).click();
      await expect(page).toHaveURL(new URL(cancelHref!, createUrl).toString());
      expect(
        (
          await api
            .from("tasks")
            .select("id")
            .eq("user_id", uid)
            .eq("title", cancelledTitle)
            .throwOnError()
        ).data,
      ).toEqual([]);
      await page.goto(createUrl);
      await expectTaskCaptureParity(page, baseline);
      const title = `Parity ${origin} ${viewport.width} ${stamp}`;
      await form.getByLabel("Titel", { exact: true }).fill(title);
      if (origin === "non-empty-project") {
        const countBefore = (
          await api.from("tasks").select("id").eq("user_id", uid)
        ).data!.length;
        await form
          .getByRole("link", { name: "Abbrechen", exact: true })
          .click();
        await expect(page).toHaveURL(new RegExp(`/projects/${project.id}$`));
        expect(
          (await api.from("tasks").select("id").eq("user_id", uid)).data!,
        ).toHaveLength(countBefore);
      } else {
        await form
          .getByRole("button", { name: "Task erstellen", exact: true })
          .click();
        const destination =
          origin === "standalone"
            ? /\/tasks\/[0-9a-f-]{36}$/
            : origin === "empty-project" || origin === "milestone"
              ? new RegExp(`/projects/${project.id}$`)
              : new RegExp(`/goals/${goal.id}\\?created=task`);
        await expect(page).toHaveURL(destination);
        await page.reload();
        const row = (
          await api
            .from("tasks")
            .select("id,project_id,milestone_id,goal_id")
            .eq("user_id", uid)
            .eq("title", title)
            .single()
            .throwOnError()
        ).data!;
        if (origin === "goal-milestone") {
          const support = (
            await api
              .from("goal_milestone_task_support")
              .select("goal_id,goal_milestone_id")
              .eq("task_id", row.id)
              .single()
              .throwOnError()
          ).data!;
          expect(support).toMatchObject({
            goal_id: goal.id,
            goal_milestone_id: goalMilestone.id,
          });
          await expect(
            page.locator(`[data-goal-current-task="${row.id}"]`),
          ).toContainText(title);
        }
        if (origin === "milestone") expect(row.milestone_id).toBe(milestone.id);
      }
    }
  }
  expect(errors).toEqual([]);
});
