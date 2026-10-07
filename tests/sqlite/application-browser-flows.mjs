import { expect } from "@playwright/test";

export async function additionalWriteFlows({
  page,
  app,
  fixture,
  step,
  fields,
  formWithButton,
  browserTask,
}) {
  const go = (route) => page.goto(app.origin + route);
  async function disclose(root, text) {
    const summary = root
      .locator("summary")
      .filter({ hasText: new RegExp(`^${text}$`) })
      .first();
    for (const details of await summary
      .locator("xpath=ancestor::details[not(@open)]")
      .elementHandles())
      await (await details.$(":scope > summary")).click();
  }
  await step(
    "Calendar schedule/reschedule/unschedule and canonical reload",
    async () => {
      await go(`/calendar?task=${browserTask}&date=${fixture.day}&view=week`);
      const queue = page.locator('[data-calendar-section="queue-schedule"]');
      await queue.getByLabel("Weekday", { exact: true }).fill(fixture.day);
      await queue.getByLabel("Start time", { exact: true }).fill("09:00");
      await queue.locator('select[name="durationMinutes"]').selectOption("30");
      await queue
        .getByRole("button", { name: "Schedule task", exact: true })
        .click();
      const inspector = page.locator("[data-calendar-inspector]");
      await expect(inspector).toContainText("09:00");
      await page.reload();
      await expect(inspector).toContainText("09:00");
      await inspector.getByLabel("Start time", { exact: true }).fill("10:00");
      await inspector
        .getByRole("button", { name: "Reschedule", exact: true })
        .click();
      await expect(inspector).toContainText("10:00");
      await page.reload();
      await expect(inspector).toContainText("10:00");
      for (const [name, expected] of [
        ["15 min früher", "09:45"],
        ["15 min später", "10:00"],
        ["Dauer +15 min", "45 min"],
        ["Dauer -15 min", "30 min"],
      ]) {
        await inspector.getByRole("button", { name, exact: true }).click();
        await expect(inspector).toContainText(expected);
        await page.reload();
        await expect(inspector).toContainText(expected);
      }
      await inspector
        .getByRole("button", { name: "Unschedule", exact: true })
        .click();
      await expect(
        page.getByRole("status").filter({ hasText: "Task entterminiert." }),
      ).toBeVisible();
      await page.reload();
      await expect(
        page
          .locator(`[data-calendar-date="${fixture.day}"]`)
          .getByRole("button", { name: /SQLite browser Task edited/ }),
      ).toHaveCount(0);
    },
  );
  await step("Source-aware Running schedule and Calendar reload", async () => {
    await go("/health/running");
    const form = page.getByTestId(
      `schedule-running_plan_item-${fixture.ids.runItem}`,
    );
    await form.locator("..").locator("summary").click();
    await fields(form, {
      plannedDate: fixture.day,
      scheduledTime: "18:00",
      durationMinutes: "30",
    });
    await form
      .getByRole("button", { name: "Im Kalender einplanen", exact: true })
      .click();
    await expect(page.locator('[data-health-detail="running"]')).toContainText(
      "Kalendertermin verknüpft",
    );
    await go(`/calendar?date=${fixture.day}&view=week`);
    const day = page.locator(`[data-calendar-date="${fixture.day}"]`);
    await expect(
      day.getByRole("button", { name: /SQLite synthetic Run/ }),
    ).toBeVisible();
    await page.reload();
    await day.getByRole("button", { name: /SQLite synthetic Run/ }).click();
    await expect(page.locator("[data-calendar-inspector]")).toContainText(
      /Quelle|Source|Running/,
    );
  });
  await step(
    "Source-owned Dashboard completion requires genuine Running flow",
    async () => {
      await go("/dashboard");
      const control = page.locator(".daily-control-current");
      await expect(control).toContainText("SQLite synthetic Run");
      await control
        .getByRole("button", { name: "Abschließen", exact: true })
        .click();
      await expect(
        page
          .getByRole("alert")
          .filter({ hasText: "Schließe den Lauf über den Running-Flow ab." })
          .last(),
      ).toBeVisible();
      await page.reload();
      await expect(control).toContainText("SQLite synthetic Run");
      await expect(
        control.getByRole("button", { name: "Abschließen", exact: true }),
      ).toBeVisible();
    },
  );
  await step(
    "Project metadata, Result/Criterion/Review and history reload",
    async () => {
      await go(`/projects/${fixture.ids.project}`);
      await page
        .getByRole("button", { name: "Project verwalten", exact: true })
        .click();
      const manage = page.getByRole("dialog", {
        name: "Project verwalten",
        exact: true,
      });
      await manage
        .getByRole("button", { name: "Bearbeiten", exact: true })
        .click();
      const metadata = manage.getByRole("form", {
        name: "Project bearbeiten",
        exact: true,
      });
      await metadata
        .getByLabel("Titel", { exact: true })
        .fill("SQLite browser Project edited");
      await metadata
        .getByRole("button", { name: "Änderungen speichern", exact: true })
        .click();
      await page.reload();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "SQLite browser Project edited",
      );
      await page
        .getByRole("button", { name: "Beziehungen verwalten", exact: true })
        .click();
      const relationships = page.getByRole("dialog", {
        name: "Beziehungen verwalten",
        exact: true,
      });
      const artifact = relationships.getByRole("form", {
        name: "Arbeitsartefakt verknüpfen",
        exact: true,
      });
      await artifact
        .getByLabel("Arbeitsartefakt", { exact: true })
        .selectOption(fixture.ids.resource);
      await artifact
        .getByLabel("Verwendung", { exact: true })
        .selectOption("primary_artifact");
      await artifact
        .getByRole("button", {
          name: "Arbeitsartefakt verknüpfen",
          exact: true,
        })
        .click();
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: /gespeichert|verknüpft/ })
          .last(),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole("region", {
          name: "Primary Work Artifact",
          exact: true,
        }),
      ).toContainText("SQLite synthetic Resource");
      await page
        .getByRole("button", {
          name: "Gewünschtes Ergebnis und Kriterien festlegen",
          exact: true,
        })
        .click();
      const result = page.getByRole("dialog", {
        name: "Ergebnis und Kriterien verwalten",
        exact: true,
      });
      await result
        .getByLabel("Gewünschtes Ergebnis", { exact: true })
        .fill("SQLite browser Project result");
      await result
        .getByRole("button", { name: "Ergebnis speichern", exact: true })
        .click();
      await page.reload();
      await page
        .getByRole("button", {
          name: "Ergebnis und Kriterien bearbeiten",
          exact: true,
        })
        .click();
      await result
        .getByLabel("Neues Kriterium", { exact: true })
        .fill("SQLite browser Project criterion");
      await result
        .getByRole("button", { name: "Kriterium hinzufügen", exact: true })
        .click();
      await page.reload();
      await expect(
        page.getByRole("region", {
          name: "Project Ergebnis und Kriterien",
          exact: true,
        }),
      ).toContainText("SQLite browser Project criterion");
      await page
        .getByRole("region", { name: "Project Abschluss", exact: true })
        .getByRole("button", { name: "Abschluss prüfen", exact: true })
        .click();
      const review = page.getByRole("dialog", {
        name: "Project Review",
        exact: true,
      });
      await review
        .getByLabel("Begründung", { exact: true })
        .fill("SQLite browser Project review history");
      await review
        .getByRole("button", { name: "Review speichern", exact: true })
        .click();
      await expect(review).toBeHidden();
      await page.reload();
      await page
        .getByRole("button", { name: "Abschlussverlauf ansehen", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", { name: "Abschlussverlauf", exact: true }),
      ).toContainText("SQLite browser Project review history");
    },
  );
  await step(
    "Normal Project export uses canonical SQLite read service",
    async () => {
      await go(`/projects/${fixture.ids.project}`);
      await page
        .getByRole("button", { name: "Project verwalten", exact: true })
        .click();
      const download = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Für Obsidian exportieren", exact: true })
        .click();
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Obsidian-Export erstellt." })
          .last(),
      ).toBeVisible();
      if (await (await download).failure())
        throw new Error("Project export download failed");
    },
  );
  await step(
    "Goal Criterion/Milestone, explicit achievement/reopen and history reload",
    async () => {
      await go(`/goals/${fixture.ids.goal}?area=planung`);
      const root = page.locator('[data-goal-outcome="workbench"]');
      const planning = root.getByRole("button", {
        name: "Planung bearbeiten",
        exact: true,
      });
      if (await planning.isVisible()) await planning.click();
      const metadata = root.getByRole("form", {
        name: "Ziel bearbeiten",
        exact: true,
      });
      await metadata.locator('[name="status"]').selectOption("active");
      await metadata
        .getByRole("button", { name: "Änderungen speichern", exact: true })
        .click();
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Ziel aktualisiert." })
          .last(),
      ).toBeVisible();
      await page.reload();
      if (await planning.isVisible()) await planning.click();
      const prompt = root.getByRole("button", {
        name: "Woran erkennst du, dass es geschafft ist?",
        exact: true,
      });
      if ((await prompt.getAttribute("aria-expanded")) !== "true")
        await prompt.click();
      await root
        .getByRole("button", {
          name: "Erfolgskriterium festlegen",
          exact: true,
        })
        .click();
      const criterion = root.getByRole("form", {
        name: "Erfolgskriterium erstellen",
        exact: true,
      });
      await criterion
        .getByLabel("Titel", { exact: true })
        .fill("SQLite browser Goal criterion");
      await criterion
        .getByLabel("Erfolg prüfen als", { exact: true })
        .selectOption("boolean");
      await criterion
        .getByRole("button", {
          name: "Erfolgskriterium erstellen",
          exact: true,
        })
        .click();
      await page.reload();
      const planningAgain = root.getByRole("button", {
        name: "Planung bearbeiten",
        exact: true,
      });
      if (await planningAgain.isVisible()) await planningAgain.click();
      const milestonePrompt = root.getByRole("button", {
        name: "Was soll als Nächstes wahr sein?",
        exact: true,
      });
      if ((await milestonePrompt.getAttribute("aria-expanded")) !== "true")
        await milestonePrompt.click();
      const milestone = root.getByRole("form", {
        name: "Zwischenziel erstellen",
        exact: true,
      });
      await milestone
        .getByLabel("Titel", { exact: true })
        .fill("SQLite browser Goal milestone");
      await milestone
        .getByRole("button", { name: "Zwischenziel erstellen", exact: true })
        .click();
      await page.reload();
      await expect(root.locator("[data-goal-progression]")).toContainText(
        "SQLite browser Goal milestone",
      );
      await root
        .getByRole("button", {
          name: "Woran erkennst du, dass es geschafft ist?",
          exact: true,
        })
        .click();
      await root
        .locator("[data-goal-criterion-id]")
        .getByRole("button", { name: "Kriterium verwalten", exact: true })
        .click();
      const evaluation = root.getByRole("form", {
        name: "Bewertung speichern",
        exact: true,
      });
      await evaluation
        .locator('[name="evaluationState"]')
        .selectOption("value");
      await evaluation.locator('[name="booleanValue"]').selectOption("true");
      await evaluation
        .getByRole("button", { name: "Bewertung speichern", exact: true })
        .click();
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Kriterium bewertet." })
          .last(),
      ).toBeVisible();
      await page.reload();
      if (
        await root
          .getByRole("button", { name: "Planung bearbeiten", exact: true })
          .isVisible()
      )
        await root
          .getByRole("button", { name: "Planung bearbeiten", exact: true })
          .click();
      await root
        .getByRole("button", { name: "Zwischenziel verwalten", exact: true })
        .click();
      await root
        .getByRole("button", {
          name: "Als aktuelles Zwischenziel festlegen",
          exact: true,
        })
        .click();
      await page.waitForLoadState("networkidle");
      await page.reload();
      if (
        await root
          .getByRole("button", { name: "Planung bearbeiten", exact: true })
          .isVisible()
      )
        await root
          .getByRole("button", { name: "Planung bearbeiten", exact: true })
          .click();
      const association = root.getByRole("button", {
        name: "Aufgabe zuordnen",
        exact: true,
      });
      await association.click();
      const link = root.getByRole("form", {
        name: "Aufgabe verknüpfen",
        exact: true,
      });
      await link.locator('[name="taskId"]').selectOption(browserTask);
      await link
        .getByRole("button", { name: "Aufgabe verknüpfen", exact: true })
        .click();
      await page.waitForLoadState("networkidle");
      await go(`/tasks/${browserTask}`);
      await page
        .getByRole("button", { name: "Mehr verwalten", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Status verwalten", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Task abschließen", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Task wieder öffnen", exact: true }),
      ).toBeVisible();
      await go(`/goals/${fixture.ids.goal}`);
      page.once("dialog", (dialog) => dialog.accept());
      await root
        .getByRole("button", { name: "Zwischenziel erreicht", exact: true })
        .click();
      await expect(
        root.getByRole("button", {
          name: "Ziel erreicht bestätigen",
          exact: true,
        }),
      ).toBeVisible();
      page.once("dialog", (dialog) => dialog.accept());
      await root
        .getByRole("button", { name: "Ziel erreicht bestätigen", exact: true })
        .click();
      await expect(
        root.getByRole("button", { name: "Ziel wieder öffnen", exact: true }),
      ).toBeVisible();
      await page.reload();
      page.once("dialog", (dialog) => dialog.accept());
      await root
        .getByRole("button", { name: "Ziel wieder öffnen", exact: true })
        .click();
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Ziel wieder geöffnet." })
          .last(),
      ).toBeVisible();
      await page.reload();
      await root
        .getByRole("link", { name: "Verlauf ansehen", exact: true })
        .click();
      await expect(
        page.getByRole("region", { name: "Verlauf & Belege", exact: true }),
      ).toContainText(/Kriterium|Zwischenziel|Etappe/);
      await page.reload();
      await expect(
        page.getByRole("region", { name: "Verlauf & Belege", exact: true }),
      ).toBeVisible();
    },
  );
  await go(`/tasks/${browserTask}`);
  await page
    .getByRole("button", { name: "Mehr verwalten", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Status verwalten", exact: true })
    .click();
  const reopenTask = page.getByRole("button", {
    name: "Task wieder öffnen",
    exact: true,
  });
  if (await reopenTask.count()) {
    await reopenTask.click();
    await expect(
      page.getByRole("button", { name: "Task abschließen", exact: true }),
    ).toBeVisible();
  }
  await step(
    "Skill Target/Milestone/Evidence/Review and selected version reload",
    async () => {
      await go(`/skills/${fixture.ids.skill}`);
      const root = page.locator("[data-skill-development]");
      await disclose(root, "Entwicklungsfokus festlegen");
      const target = root.getByRole("form", {
        name: "Entwicklungsfokus geplant speichern",
        exact: true,
      });
      await target
        .getByLabel("Was möchtest du besser können?", { exact: true })
        .fill("SQLite browser Skill target");
      await target
        .getByRole("button", {
          name: "Entwicklungsfokus geplant speichern",
          exact: true,
        })
        .click();
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Skill gespeichert." })
          .last(),
      ).toBeVisible();
      await page.reload();
      await disclose(root, "Fokus wählen");
      await root
        .getByRole("button", {
          name: "Fokus wählen: SQLite browser Skill target",
          exact: true,
        })
        .click();
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Skill gespeichert." })
          .last(),
      ).toBeVisible();
      await page.reload();
      await disclose(root, "Lernschritt hinzufügen");
      const milestone = root.getByRole("form", {
        name: "Lernschritt hinzufügen",
        exact: true,
      });
      await milestone
        .getByLabel("Titel", { exact: true })
        .fill("SQLite browser Skill milestone");
      await milestone
        .getByRole("button", { name: "Lernschritt hinzufügen", exact: true })
        .click();
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Skill gespeichert." })
          .last(),
      ).toBeVisible();
      await page.reload();
      await expect(
        root.getByRole("region", { name: "Lernweg", exact: true }),
      ).toContainText("SQLite browser Skill milestone");
      await disclose(root, "Beobachtung festhalten");
      const evidence = root.getByRole("form", {
        name: "Beobachtung festhalten",
        exact: true,
      });
      await evidence
        .getByLabel("Titel", { exact: true })
        .fill("SQLite browser Skill Evidence");
      await evidence.getByLabel("Datum", { exact: true }).fill(fixture.day);
      await evidence
        .getByRole("button", { name: "Beobachtung festhalten", exact: true })
        .click();
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Skill gespeichert." })
          .last(),
      ).toBeVisible();
      await page.reload();
      await disclose(root, "Entwicklungsfokus überprüfen");
      const review = root.getByRole("form", {
        name: "Entwicklungsfokus überprüfen",
        exact: true,
      });
      await review
        .getByLabel("Begründung", { exact: true })
        .fill("SQLite browser Skill review immutable");
      await review
        .getByRole("checkbox", { name: /SQLite browser Skill Evidence/ })
        .check();
      await review
        .getByRole("button", { name: "Überprüfung prüfen", exact: true })
        .click();
      await review
        .getByRole("button", { name: "Überprüfung speichern", exact: true })
        .click();
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Skill gespeichert." })
          .last(),
      ).toBeVisible();
      await page.reload();
      await disclose(root, "Entwicklungsfokusse & Überprüfungen");
      await expect(root).toContainText("SQLite browser Skill review immutable");
      await expect(root).toContainText("SQLite browser Skill Evidence");
    },
  );
  await step(
    "Nutrition Recipe/Meal planner assignment, completion and reload",
    async () => {
      await go("/nutrition/recipes");
      await page
        .getByRole("button", { name: "Neues Rezept", exact: true })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Neues Rezept",
        exact: true,
      });
      await dialog
        .getByLabel("Titel", { exact: true })
        .fill("SQLite browser Recipe");
      await dialog.getByLabel("Portionen", { exact: true }).fill("2");
      await dialog
        .getByRole("button", { name: "Rezept erstellen", exact: true })
        .click();
      await expect(dialog).toBeHidden();
      await page.reload();
      await expect(
        page.getByRole("region", { name: "Rezeptbibliothek", exact: true }),
      ).toContainText("SQLite browser Recipe");
      await go("/nutrition/meal-planner");
      const slot = page.locator(`[data-meal-slot="${fixture.day}-dinner"]`);
      await slot
        .getByRole("button", { name: "Rezept wählen", exact: true })
        .click();
      const choices = page.getByRole("region", {
        name: "Rezeptauswahl",
        exact: true,
      });
      await choices
        .getByLabel("Suche", { exact: true })
        .fill("SQLite browser Recipe");
      await choices
        .getByRole("button", { name: "Zuordnen", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Woche speichern", exact: true })
        .click();
      await expect(slot.locator("[data-meal-id]")).toBeVisible();
      await page.reload();
      await expect(slot).toContainText("SQLite browser Recipe");
      await page.locator(`[data-meal-id="${fixture.ids.meal}"]`).click();
      await page.locator("summary").filter({ hasText: "Bearbeiten / Zeitplanung" }).click();
      const schedule = page.getByRole("form", {
        name: "SQLite synthetic Meal als Zeitblock planen", exact: true,
      });
      await schedule.getByLabel("Blockdatum").fill(fixture.day);
      await schedule.getByLabel("Blockzeit").fill("12:00");
      await schedule.getByRole("button", { name: "Im Kalender planen", exact: true }).click();
      await expect(page.getByRole("status").filter({ hasText: "Mahlzeit im Kalender geplant." })).toBeVisible();
      await go(`/calendar?date=${fixture.day}&view=week`);
      const mealBlock = page.locator(`[data-calendar-date="${fixture.day}"]`)
        .getByRole("button", { name: /SQLite synthetic Meal/ });
      await expect(mealBlock).toBeVisible();
      await page.reload();
      await expect(mealBlock).toBeVisible();
      await go("/nutrition");
      await page
        .getByRole("region", { name: "Nächste Mahlzeit", exact: true })
        .getByRole("button", { name: "Gegessen", exact: true })
        .click();
      await page.reload();
      await expect(
        page.getByRole("region", { name: "Letzte Mahlzeiten", exact: true }),
      ).toContainText("SQLite synthetic Meal");
      await go(`/calendar?date=${fixture.day}&view=week`);
      await mealBlock.click();
      await expect(page.locator("[data-calendar-inspector]")).toContainText(/done/);
      await page.reload();
      await expect(page.locator("[data-calendar-inspector]")).toContainText(/done/);
    },
  );
  await step("Strength genuine session/set write and reload", async () => {
    await go("/health/strength");
    const start = formWithButton("Session starten");
    await fields(start, { sessionDate: fixture.day });
    await start
      .getByRole("button", { name: "Session starten", exact: true })
      .click();
    await expect(page).toHaveURL(/training=saved/);
    const set = formWithButton("Satz speichern");
    await fields(set, {
      setOrder: "1",
      repetitions: "8",
      weightKg: "20",
      notes: "SQLite browser genuine Strength set",
    });
    await set
      .getByRole("button", { name: "Satz speichern", exact: true })
      .click();
    await expect(page).toHaveURL(/training=saved/);
    await page.reload();
    await expect(page.locator('[data-health-detail="strength"]')).toContainText(
      "8 Wiederholungen × 20 kg",
    );
    await page
      .getByRole("button", { name: "Session abschließen", exact: true })
      .click();
    await page.reload();
    await expect(page.locator('[data-health-detail="strength"]')).toContainText(
      "8 Wiederholungen × 20 kg",
    );
  });
  await step(
    "Task dependency failure is visible and reload-stable",
    async () => {
      await go(`/tasks/${browserTask}`);
      const dependencies = page.getByRole("region", {
        name: "Voraussetzung",
        exact: true,
      });
      await dependencies
        .getByRole("button", { name: "Vorgänger verwalten", exact: true })
        .click();
      await dependencies
        .getByRole("button", { name: "Vorgänger hinzufügen", exact: true })
        .click();
      await dependencies
        .getByLabel("Vorgänger", { exact: true })
        .selectOption(fixture.ids.task);
      await dependencies
        .getByRole("button", { name: "Vorgänger speichern", exact: true })
        .click();
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Dependency gespeichert." })
          .last(),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Mehr verwalten", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Status verwalten", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Task abschließen", exact: true })
        .click();
      await expect(
        page
          .getByRole("form", { name: "Task abschließen", exact: true })
          .getByRole("alert"),
      ).toContainText("Task ist blockiert");
      await page.reload();
      await expect(
        page.getByLabel("Task-Status", { exact: true }),
      ).toContainText("Blockiert");
      await expect(
        page.getByLabel("Task-Status", { exact: true }),
      ).toContainText("Geplant");
    },
  );
}
