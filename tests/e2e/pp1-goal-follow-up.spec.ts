import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

function outcome(page: Page) {
  return page.locator('[data-goal-outcome="workbench"]');
}

async function createSessionClient(context: BrowserContext) {
  const cookie = (await context.cookies()).find((item) =>
    item.name.includes("auth-token"),
  );
  if (!cookie) throw new Error("Supabase auth cookie was not created");
  const session = JSON.parse(
    Buffer.from(cookie.value.replace(/^base64-/, ""), "base64url").toString(),
  );
  const api = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  await api.auth.setSession(session);
  const user = await api.auth.getUser();
  if (user.error || !user.data.user)
    throw new Error("Authenticated API user missing");
  return { api, userId: user.data.user.id };
}

test("Goal capture stays lightweight, optional, draft-first, and reload-stable", async ({
  page,
}) => {
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, "pp1-goal-capture", stamp);
  await page.goto("/goals/new");
  const titleOnly = page.locator('form[aria-label="Ziel erstellen"]');
  await expect(titleOnly.getByLabel("Titel", { exact: true })).toBeVisible();
  await expect(
    titleOnly.getByLabel("Was möchtest du erreichen?", { exact: true }),
  ).toBeVisible();
  await expect(titleOnly.getByLabel("Status", { exact: true })).toHaveCount(0);
  const optional = titleOnly.getByRole("button", {
    name: "Weitere Angaben (optional)",
    exact: true,
  });
  await expect(optional).toHaveAttribute("aria-expanded", "false");
  await titleOnly
    .getByLabel("Titel", { exact: true })
    .fill(`Title-only ${stamp}`);
  await titleOnly.getByRole("button", { name: "Ziel erstellen" }).click();
  await expect(page.getByText("Ziel erstellt.", { exact: true })).toBeVisible();
  await expect(outcome(page).locator("[data-goal-status]")).toHaveText(
    "Entwurf",
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: `Title-only ${stamp}`, exact: true }),
  ).toBeVisible();
  await expect(outcome(page).locator("[data-goal-status]")).toHaveText(
    "Entwurf",
  );
});

test("Goal optional narrative and metadata persist after reload", async ({
  page,
}) => {
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, "pp1-goal-optional", stamp);
  await page.goto("/goals/new");
  const form = page.locator('form[aria-label="Ziel erstellen"]');
  await form.getByLabel("Titel", { exact: true }).fill(`Optional ${stamp}`);
  await form
    .getByLabel("Was möchtest du erreichen?", { exact: true })
    .fill(`A concrete outcome ${stamp}`);
  const optional = form.getByRole("button", {
    name: "Weitere Angaben (optional)",
    exact: true,
  });
  await optional.click();
  await form
    .getByLabel("Warum / welcher Nutzen?", { exact: true })
    .fill(`A meaningful reason ${stamp}`);
  await form.getByLabel("Horizont", { exact: true }).selectOption("quarter");
  await form.getByLabel("Zieldatum", { exact: true }).fill("2027-01-02");
  await form.getByRole("button", { name: "Ziel erstellen" }).click();
  await expect(page.getByText("Ziel erstellt.", { exact: true })).toBeVisible();
  await expect(outcome(page).locator("[data-goal-status]")).toHaveText(
    "Entwurf",
  );
  await page.reload();
  await expect(outcome(page)).toContainText(`A concrete outcome ${stamp}`);
  await expect(outcome(page)).toContainText(
    `Warum: A meaningful reason ${stamp}`,
  );
  await expect(outcome(page)).toContainText("Quartal");
  await expect(outcome(page)).toContainText("Zieltermin");
  await expect(outcome(page)).toContainText("2027");
});

test("Goal next step follows canonical readiness and releases after predecessor completion", async ({
  page,
  context,
}) => {
  test.setTimeout(150_000);
  const stamp = Date.now();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || /hydration/i.test(message.text()))
      consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await signUpTechnicalManualUser(page, "pp1-goal-readiness", stamp);
  const { api, userId } = await createSessionClient(context);
  const { data: goal, error: goalError } = await api
    .from("goals")
    .insert({
      user_id: userId,
      title: `Readiness Goal ${stamp}`,
      status: "active",
    })
    .select("id")
    .single();
  expect(goalError).toBeNull();
  const { data: project, error: projectError } = await api
    .from("projects")
    .insert({
      user_id: userId,
      goal_id: goal!.id,
      title: `Readiness Project ${stamp}`,
      status: "active",
    })
    .select("id")
    .single();
  expect(projectError).toBeNull();
  const predecessorTitle = `Waiting predecessor ${stamp}`;
  const successorTitle = `Blocked successor ${stamp}`;
  const { data: tasks, error: taskError } = await api
    .from("tasks")
    .insert([
      {
        user_id: userId,
        project_id: project!.id,
        title: predecessorTitle,
        status: "waiting",
        priority: "P2",
      },
      {
        user_id: userId,
        project_id: project!.id,
        title: successorTitle,
        status: "planned",
        priority: "P2",
      },
    ])
    .select("id,title");
  expect(taskError).toBeNull();
  const predecessor = tasks!.find((task) => task.title === predecessorTitle)!;
  const successor = tasks!.find((task) => task.title === successorTitle)!;

  await page.goto(`/tasks/${successor.id}`);
  const dependencies = page.getByRole("region", {
    name: "Task Dependencies",
    exact: true,
  });
  await dependencies
    .getByRole("button", { name: "Dependencies verwalten", exact: true })
    .click();
  await dependencies
    .getByRole("button", { name: "Dependency hinzufügen", exact: true })
    .click();
  await dependencies
    .getByLabel("Vorgänger", { exact: true })
    .selectOption(predecessor.id);
  await dependencies
    .getByRole("button", { name: "Dependency speichern", exact: true })
    .click();
  await expect(
    page.getByText("Dependency gespeichert.", { exact: true }),
  ).toBeVisible();

  await page.goto(`/goals/${goal!.id}`);
  const goalOutcome = outcome(page);
  const nextStep = goalOutcome.getByRole("region", {
    name: "Nächster Schritt",
    exact: true,
  });
  await expect(nextStep.locator("[data-goal-next-step-state]")).toHaveAttribute(
    "data-goal-next-step-state",
    "blocked",
  );
  await expect(nextStep).toContainText(successorTitle);
  await expect(
    nextStep.getByRole("link", { name: predecessorTitle, exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(nextStep.locator("[data-goal-next-step-state]")).toHaveAttribute(
    "data-goal-next-step-state",
    "blocked",
  );

  await page.goto(`/tasks/${predecessor.id}`);
  await page
    .getByRole("button", { name: "Task abschließen", exact: true })
    .click();
  await expect(
    page.getByText("Task abgeschlossen.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Task wieder öffnen", exact: true }),
  ).toBeVisible();

  await page.goto(`/goals/${goal!.id}`);
  await expect(nextStep.locator("[data-goal-next-step-state]")).toHaveAttribute(
    "data-goal-next-step-state",
    "ready",
  );
  await expect(nextStep).toContainText(successorTitle);
  await expect(nextStep.getByText("Blockiert durch:")).toHaveCount(0);
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
