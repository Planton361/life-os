import { expect, test, type Locator, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";
async function openDetails(region: Locator, summary: string) {
  const d = region
    .locator("details")
    .filter({ has: region.page().locator(`summary:text-is("${summary}")`) })
    .first();
  if (!(await d.evaluate((e) => e.hasAttribute("open"))))
    await d.locator("summary").first().click();
  return d;
}
async function save(form: Locator, label: string) {
  const notices = form.page().getByLabel("Benachrichtigungen");
  for (const close of await notices
    .getByRole("button", { name: "Benachrichtigung schließen" })
    .all())
    await close.click();
  await form.getByRole("button", { name: label, exact: true }).click();
  await expect(notices.getByRole("status")).toContainText("Skill gespeichert.");
  await expect(
    form.page().locator('button:has-text("Speichern …")'),
  ).toHaveCount(0);
}
async function skill(page: Page, name: string) {
  await page.goto("/skills/new");
  const f = page.getByRole("form", { name: "Skill erstellen", exact: true });
  await f.getByLabel("Name", { exact: true }).fill(name);
  await f
    .getByLabel("Warum / gewünschte Fähigkeit")
    .fill("Explizit planen und beobachten");
  await f.getByRole("button", { name: "Skill erstellen", exact: true }).click();
  await expect(page.locator("[data-skill-development] h1")).toHaveText(name);
  return page.url();
}
test("PP2 Skill workbench: explicit planning, reviews, evidence history, reload and responsive controls", async ({
  page,
}, testInfo) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(10000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await signUpTechnicalManualUser(page, "pp2", Date.now());
  const url = await skill(page, `PP2 Development ${Date.now()}`);
  const work = page.locator("[data-skill-development]");
  await expect(work).toBeVisible();
  for (const [width, height] of [
    [3840, 2160],
    [1920, 1080],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.screenshot({
      path: testInfo.outputPath(`pp2-skill-empty-${width}.png`),
      fullPage: true,
      caret: "initial",
    });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });

  await expect(
    work.getByText("Keine aktuelle Skill Evidence.", { exact: true }),
  ).toBeVisible();
  const focus = work.getByRole("region", {
    name: "Aktueller Entwicklungsfokus",
  });
  const create = focus.getByRole("form", {
    name: "Development Target erstellen",
  });
  await create.getByLabel("Titel", { exact: true }).fill("Cancelled focus");
  await create.getByRole("button", { name: "Abbrechen", exact: true }).click();
  await expect(
    focus.locator("summary").filter({ hasText: "Entwicklungsfokus festlegen" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(create).toBeVisible();
  await page.reload();
  await expect(focus.locator("[data-target]")).toHaveCount(0);
  await openDetails(focus, "Entwicklungsfokus festlegen");
  await create
    .getByLabel("Titel", { exact: true })
    .fill("Reliable SQL ownership");
  await create
    .getByLabel("Gewünschte Fähigkeit / Fokus")
    .fill("Eigene überprüfbare Queries schreiben");
  await save(create, "Development Target erstellen");
  const other = work
    .locator("details")
    .filter({
      has: page.locator('summary:text-is("Weitere Targets & Verlauf")'),
    })
    .first();
  await other.locator("summary").first().click();
  let target = other.locator("[data-target]").first();
  await save(
    target.getByRole("form", { name: "Als aktuellen Fokus wählen" }),
    "Als aktuellen Fokus wählen",
  );
  target = focus.locator("[data-target]");
  await expect(
    target.getByRole("heading", {
      name: "Reliable SQL ownership",
      exact: true,
    }),
  ).toBeVisible();
  const add = await openDetails(target, "Lernschritt hinzufügen");
  const mf = add.getByRole("form", {
    name: "Lernschritt hinzufügen",
    exact: true,
  });
  await mf.getByLabel("Titel", { exact: true }).fill("Write a scoped query");
  await save(mf, "Lernschritt hinzufügen");
  const step = target.getByRole("article", {
    name: "Lernschritt Write a scoped query",
  });
  const manage = await openDetails(step, "Lernschritt verwalten");
  await save(
    manage.getByRole("form", { name: "Als aktuellen Lernschritt wählen" }),
    "Als aktuellen Lernschritt wählen",
  );
  await page.reload();
  await expect(step.getByRole("heading")).toContainText("Aktuell");
  await work
    .getByRole("link", { name: "Practice-Task anlegen", exact: true })
    .click();
  await expect(page).toHaveURL(/\/tasks\/new$/);
  await page.goto(url);
  const recency = work.getByRole("region", { name: "Evidence & Recency" });
  const addEvidence = await openDetails(recency, "Evidence hinzufügen");
  let ef = addEvidence.getByRole("form", {
    name: "Evidence hinzufügen",
    exact: true,
  });
  await ef.getByLabel("Titel", { exact: true }).fill("Owned query observed");
  await ef.getByLabel("Datum", { exact: true }).fill("2026-09-01");
  await ef.getByLabel("Beobachtung / Kontext").fill("Manuell geprüft");
  await ef.getByLabel("Datum", { exact: true }).fill("2999-01-01");
  await ef
    .getByRole("button", { name: "Evidence hinzufügen", exact: true })
    .click();
  await expect(ef.getByRole("status")).toContainText(
    "heutiges oder vergangenes Datum",
  );
  await ef.getByLabel("Datum", { exact: true }).fill("2026-09-01");
  await save(ef, "Evidence hinzufügen");
  await page.reload();
  await expect(
    recency.getByRole("definition").filter({ hasText: "2026-09-01" }),
  ).toBeVisible();
  await expect(
    recency.getByText("Kein gültiger Completion-Zeitpunkt", { exact: true }),
  ).toBeVisible();
  for (const [width, height] of [
    [3840, 2160],
    [1920, 1080],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(work).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`pp2-skill-current-${width}.png`),
      fullPage: true,
      caret: "initial",
    });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  const review = await openDetails(target, "Target reviewen");
  const rf = review.getByRole("form", { name: "Target Review", exact: true });
  await rf.getByLabel("Entscheidung").selectOption("completed");
  await rf
    .getByLabel("Begründung", { exact: true })
    .fill("Explizit akzeptierter Fokus");
  await rf.getByLabel("Noch offene Lernschritte bewusst bestätigen").check();
  await rf.getByLabel("Owned query observed · 2026-09-01").check();
  await rf.getByRole("button", { name: "Review prüfen", exact: true }).click();
  await expect(
    rf.getByRole("region", { name: "Review-Vorschau" }),
  ).toBeVisible();
  await save(rf, "Review speichern");
  await page.reload();
  await expect(
    focus.getByText("Kein aktueller Entwicklungsfokus.", { exact: true }),
  ).toBeVisible();
  await other.locator("summary").first().click();
  target = other.locator("[data-target]").first();
  await expect(
    target.getByText("Abgeschlossen", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    target.getByRole("heading").filter({ hasText: "Write a scoped query" }),
  ).toContainText("Geplant");
  let e = recency.getByRole("article", {
    name: "Evidence Owned query observed",
  });
  const edit = await openDetails(e, "Evidence korrigieren / zurückziehen");
  ef = edit.getByRole("form", { name: "Evidence-Korrektur speichern" });
  await ef.getByLabel("Titel", { exact: true }).fill("Corrected observation");
  await ef.getByLabel("Korrekturbegründung").fill("Präzisere Aussage");
  await save(ef, "Evidence-Korrektur speichern");
  await page.reload();
  await other.locator("summary").first().click();
  const historyReview = other.getByRole("article", {
    name: "Review Reliable SQL ownership",
  });
  await expect(
    historyReview.getByText("Owned query observed · 2026-09-01 · Version 1", {
      exact: true,
    }),
  ).toBeVisible();
  const snapshot = await openDetails(historyReview, "Review-Snapshot anzeigen");
  await expect(
    snapshot.getByText("Write a scoped query · Aktuell", { exact: true }),
  ).toBeVisible();
  const amend = await openDetails(
    historyReview,
    "Review ergänzen / korrigieren",
  );
  const af = amend.getByRole("form", { name: "Review-Amendment speichern" });
  await af.getByLabel("Art", { exact: true }).selectOption("mistaken");
  await af
    .getByLabel("Begründung", { exact: true })
    .fill("Abschluss war irrtümlich");
  await save(af, "Review-Amendment speichern");
  await page.reload();
  await other.locator("summary").first().click();
  await expect(
    other
      .locator("[data-target]")
      .getByText("Geplant", { exact: true })
      .first(),
  ).toBeVisible();
  e = recency.getByRole("article", { name: "Evidence Corrected observation" });
  const withdraw = await openDetails(e, "Evidence korrigieren / zurückziehen");
  const wf = withdraw.getByRole("form", { name: "Evidence zurückziehen" });
  await wf
    .getByLabel("Begründung", { exact: true })
    .fill("Nicht mehr aktuelle Evidence");
  await save(wf, "Evidence zurückziehen");
  await page.reload();
  await expect(
    recency.getByText("Keine aktuelle Skill Evidence.", { exact: true }),
  ).toBeVisible();
  const eh = work
    .locator("details")
    .filter({ has: page.locator('summary:text-is("Evidence-History")') })
    .first();
  await eh.locator("summary").first().click();
  const restore = eh.getByRole("form", {
    name: "Evidence wiederherstellen: Corrected observation",
  });
  await restore.getByLabel("Begründung", { exact: true }).fill("Wieder gültig");
  await save(restore, "Evidence wiederherstellen: Corrected observation");
  await page.reload();
  await expect(
    recency
      .getByRole("article", { name: "Evidence Corrected observation" })
      .getByText("2026-09-01 · Version 4", { exact: true }),
  ).toBeVisible();
  // Stale page cannot silently overwrite a later save.
  const stale = await page.context().newPage();
  await stale.goto(url);
  await openDetails(
    stale.locator("[data-skill-development]"),
    "Skill verwalten",
  );
  const staleEdit = stale.getByRole("form", {
    name: "Skill speichern",
    exact: true,
  });
  await staleEdit.getByLabel("Name", { exact: true }).fill("Stale lost edit");
  const sm = await openDetails(work, "Skill verwalten");
  const sf = sm.getByRole("form", { name: "Skill speichern", exact: true });
  await sf
    .getByLabel("Warum / gewünschte Fähigkeit")
    .fill("Aktualisierter Kontext");
  await save(sf, "Skill speichern");
  await staleEdit
    .getByRole("button", { name: "Skill speichern", exact: true })
    .click();
  await expect(staleEdit.getByRole("status")).toContainText(
    "inzwischen geändert",
  );
  await stale.close();
  await page.reload();
  for (const [width, height] of [
    [3840, 2160],
    [1920, 1080],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(work).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`pp2-skill-${width}.png`),
      fullPage: true,
      caret: "initial",
    });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openDetails(work, "Skill verwalten");
  await save(
    work.getByRole("form", { name: "Skill archivieren", exact: true }),
    "Skill archivieren",
  );
  await page.reload();
  await expect(
    work.getByText("Archiviert", { exact: true }).first(),
  ).toBeVisible();
  await openDetails(work, "Skill verwalten");
  await save(
    work.getByRole("form", { name: "Skill wieder öffnen", exact: true }),
    "Skill wieder öffnen",
  );
  await page.reload();
  await expect(
    work.locator("header").first().getByText("Pausiert", { exact: true }),
  ).toBeVisible();
  await page.goto(`/portfolio?view=skills&selected=${url.split("/").at(-1)}`);
  await expect(
    page.getByRole("link", { name: "Details öffnen", exact: true }),
  ).toBeVisible();
  const inspector = page.getByRole("complementary", {
    name: "Selected Entity",
  });
  await expect(
    inspector.getByText("Priorität / Focus", { exact: true }),
  ).toHaveCount(0);
  await expect(
    inspector.getByText("Letzte Praxis", { exact: true }),
  ).toBeVisible();
  for (const [width, height] of [
    [3840, 2160],
    [1920, 1080],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await expect(inspector).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`pp2-portfolio-${width}.png`),
      fullPage: true,
      caret: "initial",
    });
  }
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.getByRole("link", { name: "Details öffnen", exact: true }).click();
  await expect(page).toHaveURL(url);
  expect(errors).toEqual([]);
});

test("PP2 Manual/Demo/Auth-blocked and Empty boundaries expose no apparent writes", async ({
  page,
  context,
}) => {
  const url = `http://${process.env.PLAYWRIGHT_HOST ?? "127.0.0.1"}:${process.env.PLAYWRIGHT_PORT ?? "3000"}`;
  await context.addCookies([
    {
      name: "life_os_profile",
      value: "manual",
      url,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/skills/new");
  const shell = page.locator('[data-entity-workbench="skill"]');
  await expect(shell.getByRole("status")).toContainText(
    "Manual-Profil und eine lokale Anmeldung",
  );
  await expect(
    shell.getByRole("form", { name: "Skill erstellen" }),
  ).toHaveCount(0);
  await context.addCookies([
    {
      name: "life_os_profile",
      value: "demo",
      url,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/skills/new");
  await expect(shell.getByRole("status")).toContainText(
    "Manual-Profil und eine lokale Anmeldung",
  );
  await expect(
    shell.getByRole("form", { name: "Skill erstellen" }),
  ).toHaveCount(0);
  await signUpTechnicalManualUser(page, "pp2-empty", Date.now());
  await page.goto("/skills");
  await expect(
    shell.getByRole("heading", { name: "Skills · 0", exact: true }),
  ).toBeVisible();
  await shell
    .getByRole("link", { name: "Skill erstellen", exact: true })
    .click();
  await expect(
    shell.getByRole("form", { name: "Skill erstellen", exact: true }),
  ).toBeVisible();
});

test("PP2 Dashboard Skill projection shows canonical Practice context without percentage", async ({
  page,
}) => {
  await signUpTechnicalManualUser(page, "pp2-projection", Date.now());
  const name = `PP2 Practice projection ${Date.now()}`;
  const url = await skill(page, name);
  await page.goto("/dashboard");
  const portfolio = page.locator(".dashboard-portfolio");
  await portfolio
    .getByRole("button", { name: "Skill View", exact: true })
    .click();
  const item = portfolio.getByRole("link", {
    name: `Open portfolio item: ${name}`,
    exact: true,
  });
  await expect(item).toBeVisible();
  await expect(item).toContainText("0 verknüpfte abgeschlossene Tasks");
  await expect(item).not.toContainText("%");
  await item.click();
  await expect(page).toHaveURL(url);
});
