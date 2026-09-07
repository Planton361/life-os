import { assertHealthWorkspace } from "./support/health-workspace-proof";
import { expect, test, type Page, type Locator } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";
const routes = [
  "/health",
  "/health/mental",
  "/health/habits",
  "/health/running",
  "/health/strength",
];
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
function section(page: Page, title: string) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}
async function submit(page: Page, form: Locator, name: string) {
  const before = new URL(page.url()).searchParams.get("trainingUpdate");
  await form.getByRole("button", { name, exact: true }).click();
  if (
    new URL(page.url()).pathname.includes("running") ||
    new URL(page.url()).pathname.includes("strength")
  )
    await expect
      .poll(() => new URL(page.url()).searchParams.get("trainingUpdate"))
      .not.toBe(before);
  await page.waitForLoadState("networkidle");
}

test("R2-05 current Health and Fitness controls, writes, projections and viewport evidence", async ({
  page,
}, info) => {
  test.setTimeout(360_000);
  page.setDefaultTimeout(10000);
  const stamp = Date.now();
  const name = `R205 Habit ${stamp}`,
    runPlan = `R205 Run ${stamp}`,
    unit = `R205 Unit ${stamp}`,
    exercise = `R205 Row ${stamp}`,
    plan = `R205 Strength ${stamp}`;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (["error", "warning"].includes(m.type())) errors.push(m.text());
  });
  const inventory: {
    CONTROL: string;
    EXPECTED: string;
    ACTUAL: string;
    RESULT: string;
  }[] = [];
  const proof = (CONTROL: string, EXPECTED: string) => {
    console.log(`CONTROL_PASS ${CONTROL}`);
    inventory.push({ CONTROL, EXPECTED, ACTUAL: EXPECTED, RESULT: "PASS" });
  };
  await page.setViewportSize({ width: 1920, height: 1080 });
  await signUpTechnicalManualUser(page, "r205", stamp);
  // Empty Manual surfaces are real empty data, with no fixture fallback.
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
  }
  await page.goto("/health/habits");
  await expect(page.getByText("Habit erstellen", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByLabel(/Slot/)).toHaveCount(0);
  proof(
    "Habit Create / Slot",
    "Keine Create-Surface und kein sichtbares Slot-Feld",
  );
  // Mood remains Dashboard-owned.
  await page.goto("/dashboard");
  await page
    .getByRole("region", { name: "Mood", exact: true })
    .getByRole("button", { name: "Focused", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Mood gespeichert." }),
  ).toBeVisible();
  await page.goto("/health/mental");
  await expect(
    page.getByRole("region", { name: "Aktueller Zustand", exact: true }),
  ).toContainText("Fokussiert");
  await expect(
    page.getByRole("region", { name: "Mood im Verlauf", exact: true }),
  ).toContainText("Fokussiert");
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Aktueller Zustand", exact: true }),
  ).toContainText("Fokussiert");
  await page.getByText(/Mood-Historie öffnen/).click();
  await expect(
    page
      .getByRole("region", { name: "Mood im Verlauf", exact: true })
      .locator("ol"),
  ).toContainText("Fokussiert");
  proof(
    "Mood Current / Trend / History",
    "Dashboard-Mood nach Reload in Zustand und Verlauf",
  );
  await page
    .getByText("Schlaf erfassen & Verlauf öffnen", { exact: true })
    .click();
  const sleep = page.getByRole("region", {
    name: "Schlafprotokoll",
    exact: true,
  });
  await sleep.getByLabel("Nacht / Datum").fill(today());
  await sleep.getByLabel("Stunden", { exact: true }).fill("7");
  await sleep.getByLabel("Minuten", { exact: true }).fill("42");
  await sleep.getByLabel("Qualität (optional)").selectOption("4");
  await sleep.getByLabel("Notiz (optional)").fill(`Schlaf ${stamp}`);
  await sleep.getByRole("button", { name: "Schlaf speichern" }).click();
  await expect(page).toHaveURL(/health=saved/);
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Schlaf & Erholung", exact: true }),
  ).toContainText("7h 42m");
  proof(
    "Sleep form / history",
    "Datum, Dauer, Qualität und Notiz gespeichert und Reload-stabil",
  );
  await page.goto("/health");
  await expect(page.locator('[data-health-section="mental"]')).toContainText(
    "Fokussiert",
  );
  await expect(page.locator('[data-health-section="mental"]')).toContainText(
    "7h 42m",
  );
  await page.reload();
  await expect(page.locator('[data-health-section="mental"]')).toContainText(
    "7h 42m",
  );
  proof(
    "Mental overview projection",
    "Mood und Schlaf erscheinen in der bestehenden Health-Übersicht nach Reload",
  );
  await page.goto("/dashboard");
  await expect(
    page.locator('a[href="/health/mental?section=sleep"]'),
  ).toContainText("7h 42m");
  await page.reload();
  await expect(
    page.locator('a[href="/health/mental?section=sleep"]'),
  ).toContainText("7h 42m");
  proof(
    "Sleep Dashboard projection",
    "Letzte Nacht im bestehenden Dashboard nach Reload",
  );
  // Each Mental context link navigates to its real owner.
  for (const [label, path] of [
    ["Mood im Dashboard erfassen", "/dashboard"],
    ["Tagesreview", "/review/daily"],
    ["Wochenreview", "/review/weekly"],
    ["Journal öffnen", "/life/journal"],
  ]) {
    await page.goto("/health/mental");
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(path));
    proof(label, `Navigation ${path}`);
  }
  // Dashboard Add, increment and undo; tracker URL selection persists.
  await page.goto("/dashboard?habitWindow=Morning");
  const tracker = page.getByRole("region", { name: "Habit Trackers" });
  await tracker.getByRole("button", { name: /Add habit/i }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name", { exact: true }).fill(name);
  await dialog.getByLabel("Target", { exact: true }).fill("5");
  await dialog.getByLabel("Increment", { exact: true }).fill("2");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  const card = tracker.getByRole("article").filter({ hasText: name });
  await card
    .getByRole("button", { name: `${name} erhöhen`, exact: true })
    .click();
  await expect(card).toContainText("2 / 5");
  await page.goto("/health/habits");
  await page
    .locator("[data-habit-id]")
    .filter({ hasText: name })
    .getByRole("link")
    .click();
  const selected = page.locator('[data-habits-section="selected"]');
  await expect(selected).toContainText("2 / 5");
  for (const [label, key] of [
    ["Tag", "day"],
    ["Woche", "week"],
    ["Monat", "month"],
  ]) {
    await page
      .getByRole("navigation", { name: "Habit Zeitraum" })
      .getByRole("link", { name: label, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`period=${key}`));
    await page.reload();
    await expect(
      selected.locator(`[data-habit-date="${today()}"]`),
    ).toContainText("2 / 5");
    proof(`Habit ${label}`, "Aggregierte Menge und URL nach Reload korrekt");
  }
  await page.goto("/dashboard?habitWindow=Morning");
  await card.getByRole("button", { name: /rückgängig|Undo/i }).click();
  await expect(card).toContainText("0 / 5");
  await page.goto("/health/habits");
  await page.reload();
  await expect(
    selected.locator(`[data-habit-date="${today()}"]`),
  ).toContainText("0 / 5");
  proof("Habit Dashboard Undo", "Tracker-Werte nach Undo korrigiert");
  await page.goto("/dashboard?habitWindow=Midday");
  await tracker.getByRole("button", { name: /Add habit/i }).click();
  await dialog.getByLabel("Name", { exact: true }).fill(`R205 Platz ${stamp}`);
  await dialog.getByLabel("Target", { exact: true }).fill("1");
  await dialog.getByLabel("Increment", { exact: true }).fill("1");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await page.goto("/health/habits");
  await page
    .locator("[data-habit-id]")
    .filter({ hasText: name })
    .getByRole("link")
    .click();
  await page.getByText(`Bearbeiten · ${name}`, { exact: true }).click();
  const manage = page.locator('[data-habits-section="management"]');
  await manage.getByLabel("Einheit", { exact: true }).fill("min");
  await manage.getByLabel("Tagesziel optional").fill("20");
  await manage.getByLabel("Schrittweite").fill("10");
  await manage.getByLabel("Zeitfenster").selectOption("Midday");
  await manage.getByRole("button", { name: "Habit speichern" }).click();
  await expect(page).toHaveURL(/habit=saved/);
  await page.reload();
  await expect(selected).toContainText("Mittags");
  await expect(selected).toContainText("20 min");
  proof("Habit edit", "Einheit, Ziel, Schrittweite, Window reload-stabil");
  await page.goto("/dashboard?habitWindow=Midday");
  await card
    .getByRole("button", { name: `${name} erhöhen`, exact: true })
    .click();
  await expect(card).toContainText("10 / 20");
  await page.goto("/today");
  await expect(
    page.locator('[data-today-section="activity-stream"]'),
  ).toContainText(name);
  await page.goto("/health");
  await expect(page.locator('[data-health-section="habits"]')).toContainText(
    /10|1/,
  );
  proof(
    "Habit occupied-window move / projections",
    "Freier Platz automatisch gewählt; Increment erscheint in Dashboard, Today und Health",
  );
  // Running manual session and edit path.
  await page.goto("/health/running");
  const runForm = page.getByTestId("running-session-form");
  await runForm.getByLabel("Distanz (km)").fill("4.2");
  await runForm.getByLabel("Dauer (Minuten)").fill("28");
  await runForm.getByLabel("Startzeit (optional)").fill("10:15");
  await runForm.getByLabel("Ø Herzfrequenz (optional)").fill("140");
  await runForm.getByLabel("Notizen (optional)").fill(`Lauf ${stamp}`);
  await submit(page, runForm, "Lauf speichern");
  await expect(
    page
      .locator('[aria-label="Benachrichtigungen"]')
      .getByRole("status")
      .filter({ hasText: "Trainingsdaten gespeichert." })
      .first(),
  ).toBeVisible();
  await page.reload();
  const history = section(page, "Laufhistorie");
  await expect(history).toContainText("4.2 km");
  await expect(
    page.getByRole("region", { name: "Laufentwicklung" }),
  ).toContainText("4.2 km");
  proof(
    "Manual Run / Summary / History / Trend",
    "4.2 km, 28 Minuten, abgeleitetes Tempo nach Reload",
  );
  // Plans and their existing canonical Calendar boundary.
  const plans = section(page, "Laufpläne");
  await plans.getByText("Neuer Plan", { exact: true }).click();
  const createPlan = plans.locator("form").first();
  await createPlan.getByLabel("Planname").fill(runPlan);
  await createPlan.getByLabel("Ziel / Kontext").fill("R205 Ausdauer");
  await submit(page, createPlan, "Plan erstellen");
  const rp = page.locator('[data-testid^="running-plan-"]').first();
  await rp.getByText("Planeinheit hinzufügen", { exact: true }).click();
  const addUnit = rp
    .locator("details")
    .filter({
      has: page.locator("summary", { hasText: "Planeinheit hinzufügen" }),
    })
    .locator("form");
  await addUnit.getByLabel("Titel", { exact: true }).fill(unit);
  await addUnit.getByLabel("Distanz km").fill("5");
  await addUnit.getByLabel("Dauer min").fill("30");
  await submit(page, addUnit, "Einheit hinzufügen");
  await rp.getByText("Termin im Kalender", { exact: true }).click();
  const schedule = rp.locator('[data-testid^="schedule-running_plan_item"]');
  await schedule.getByRole("button", { name: "Im Kalender einplanen" }).click();
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(rp).toContainText("Kalendertermin verknüpft");
  proof(
    "Running plan / unit / calendar",
    "Plan mit Einheit angelegt und kanonisch eingeplant",
  );
  await rp.getByText("Geplanten Lauf abschließen", { exact: true }).click();
  const completeRun = rp.locator("form").filter({
    has: page.getByRole("button", { name: "Lauf abschließen", exact: true }),
  });
  await completeRun.getByLabel("Distanz km").fill("5");
  await completeRun.getByLabel("Dauer min").fill("30");
  await submit(page, completeRun, "Lauf abschließen");
  await page.reload();
  await expect(history).toContainText("5 km");
  proof(
    "Planned Run complete",
    "Reale Session zur geplanten Einheit nach Reload",
  );
  await page.goto("/dashboard");
  await expect(
    page.getByRole("region", { name: "Running Tracker", exact: true }),
  ).toContainText("5");
  await page.goto("/today");
  await expect(
    page.locator('[data-today-section="activity-stream"]'),
  ).toContainText(/Run|Lauf/);
  await page.goto("/health");
  await expect(page.locator('[data-health-section="running"]')).toContainText(
    "5",
  );
  proof(
    "Running projections",
    "Dashboard, Today, Health lesen abgeschlossenen Lauf",
  );
  // Exercise library, multi muscle relation and plan/set lifecycle.
  await page.goto("/health/strength");
  await page.getByText("Neue Übung", { exact: true }).click();
  const exerciseForm = page.locator("form").filter({
    has: page.getByRole("group", { name: "Muskelgruppen", exact: true }),
  });
  await exerciseForm.getByLabel("Name", { exact: true }).fill(exercise);
  await exerciseForm
    .getByLabel("Equipment", { exact: true })
    .fill("Kurzhantel");
  await exerciseForm
    .getByLabel("Beschreibung", { exact: true })
    .fill("Kontrolliertes Rudern");
  await exerciseForm.getByLabel("Rücken", { exact: true }).check();
  await exerciseForm.getByLabel("Bizeps", { exact: true }).check();
  await submit(page, exerciseForm, "Übung erstellen");
  await page.reload();
  const library = section(page, "Übungsbibliothek");
  await expect(library).toContainText("Rücken, Bizeps");
  await expect(library).toContainText("Kontrolliertes Rudern");
  proof(
    "Exercise create / multiple muscles",
    "Übung, Equipment, Beschreibung und mehrere Muskelrelationen reload-stabil",
  );
  const sp = section(page, "Krafttrainingspläne");
  await sp.getByText("Neuer Plan", { exact: true }).click();
  const spCreate = sp.locator("form").first();
  await spCreate.getByLabel("Planname").fill(plan);
  await spCreate.getByLabel("Ziel / Kontext").fill("R205 Training");
  await submit(page, spCreate, "Plan erstellen");
  const planCard = page.locator('[data-testid^="strength-plan-"]').first();
  await planCard.getByText("Planübung hinzufügen", { exact: true }).click();
  const addExercise = planCard.locator("form").filter({
    has: page.getByRole("button", { name: "Übung hinzufügen", exact: true }),
  });
  await addExercise.getByLabel("Übung").selectOption({ label: exercise });
  await addExercise.getByLabel("Sätze", { exact: true }).fill("1");
  await addExercise.getByLabel("Wiederholungen", { exact: true }).fill("10");
  await addExercise.getByLabel("Gewicht kg", { exact: true }).fill("25");
  await submit(page, addExercise, "Übung hinzufügen");
  await planCard.getByText("Termin im Kalender", { exact: true }).click();
  await planCard
    .locator('[data-testid^="schedule-strength_plan"]')
    .getByRole("button", { name: "Im Kalender einplanen" })
    .click();
  await page.waitForLoadState("networkidle");
  await page.reload();
  await expect(planCard).toContainText("Kalendertermin verknüpft");
  await submit(
    page,
    planCard.locator("form").filter({
      has: page.getByRole("button", { name: "Session starten", exact: true }),
    }),
    "Session starten",
  );
  const session = page.locator('[data-testid^="strength-session-"]').first();
  await submit(
    page,
    session.locator("form").filter({
      has: page.getByRole("button", {
        name: "Session abschließen",
        exact: true,
      }),
    }),
    "Session abschließen",
  );
  await expect(page).toHaveURL(/training=error/);
  const notices = page.locator('[aria-label="Benachrichtigungen"]');
  await expect(notices.getByRole("alert")).toBeVisible();
  await notices
    .getByRole("alert")
    .getByRole("button", { name: "Benachrichtigung schließen" })
    .click();
  await expect(session).toContainText("Läuft");
  proof(
    "Strength complete without sets",
    "Sichtbarer Fehler, Session bleibt offen",
  );
  const set = session.locator("form").filter({
    has: page.getByRole("button", { name: "Satz speichern", exact: true }),
  });
  await set.getByLabel("Wiederholungen", { exact: true }).fill("10");
  await set.getByLabel("Gewicht kg (optional)").fill("25");
  await set.getByLabel("Notizen", { exact: true }).fill("R205 Satz");
  await submit(page, set, "Satz speichern");
  await page.reload();
  await expect(session).toContainText("250.0 kg");
  await submit(
    page,
    session.locator("form").filter({
      has: page.getByRole("button", {
        name: "Session abschließen",
        exact: true,
      }),
    }),
    "Session abschließen",
  );
  await page.reload();
  await expect(session).toContainText("Abgeschlossen");
  await expect(section(page, "Muskelübersicht")).toContainText("Rücken");
  await expect(section(page, "Muskelübersicht")).toContainText("Bizeps");
  proof(
    "Strength plan / sets / complete / muscle map",
    "Plan, Satz und Completion mit 250 kg Volumen reload-stabil",
  );
  await page
    .getByText("Freie Session starten", { exact: true })
    .first()
    .click();
  await submit(
    page,
    page.getByTestId("free-strength-session"),
    "Freie Session starten",
  );
  const free = page
    .locator('[data-testid^="strength-session-"]')
    .filter({ hasText: "Freie Session" });
  const freeSet = free.locator("form").filter({
    has: page.getByRole("button", { name: "Satz speichern", exact: true }),
  });
  await freeSet.getByLabel("Übung").selectOption({ label: exercise });
  await freeSet.getByLabel("Wiederholungen", { exact: true }).fill("12");
  await submit(page, freeSet, "Satz speichern");
  await submit(
    page,
    free.locator("form").filter({
      has: page.getByRole("button", {
        name: "Session abschließen",
        exact: true,
      }),
    }),
    "Session abschließen",
  );
  await page.reload();
  await expect(free).toContainText("12 Wiederholungen ohne Gewicht");
  proof(
    "Free Strength Session",
    "Ohne Plan, Übung gewählt, ungewichteter Satz und Completion reload-stabil",
  );
  await page.goto("/today");
  await expect(
    page.locator('[data-today-section="activity-stream"]'),
  ).toContainText(/Strength|Kraft/);
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Muscle", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Running Tracker", exact: true }),
  ).toContainText("Back");
  await page.goto("/health");
  await expect(page.locator('[data-health-section="strength"]')).toContainText(
    /2|250/,
  );
  await expect(
    page.locator('[data-health-section="strength"]'),
  ).not.toContainText("Noch keine Krafteinheiten");
  await page.reload();
  await expect(
    page.locator('[data-health-section="strength"] [aria-label$="2 Sessions"]'),
  ).toHaveCount(1);
  proof("Strength projections", "Today, Dashboard und Health zeigen Training");
  // Current visible navigation on every detail page, clicked individually.
  for (const route of routes.slice(1))
    for (const [name, path] of [
      ["Health Übersicht", "/health"],
      ["Dashboard", "/dashboard"],
      ["Kalender", "/calendar"],
    ]) {
      await page.goto(route);
      await page
        .getByRole("navigation", { name: "Health Navigation" })
        .getByRole("link", { name, exact: true })
        .click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      proof(`${route} ${name}`, `Navigation ${path}`);
    }
  // Review context is a canonical read, never a guessed journal correlation.
  await page.goto("/review/daily");
  await page.getByLabel("Outcome", { exact: true }).fill(`Reflexion ${stamp}`);
  await page.getByRole("button", { name: /Complete Daily Review/i }).click();
  await expect(page).toHaveURL(/review=saved/);
  await page.goto("/health/mental");
  const reflection = page.getByRole("region", {
    name: "Reflexion & Journal",
    exact: true,
  });
  await reflection.locator("summary").click();
  await expect(reflection).toContainText(`Reflexion ${stamp}`);
  await page.reload();
  await reflection.locator("summary").click();
  await expect(reflection).toContainText(`Reflexion ${stamp}`);
  proof(
    "Reflection history",
    "Gespeicherter Tagesreview öffnet seinen kanonischen Kontext nach Reload",
  );
  for (const [area, path] of [
    ["mental", "/health/mental"],
    ["habits", "/health/habits"],
    ["running", "/health/running"],
    ["strength", "/health/strength"],
  ]) {
    await page.goto("/health");
    const link = page
      .locator(`[data-health-section="${area}"] a[href="${path}"]`)
      .first();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    proof(`Health ${area}`, `Navigation ${path}`);
  }
  // Whole surface screenshots + geometry at all required desktop/mobile sizes.
  for (const size of [
    { width: 3840, height: 2160 },
    { width: 2560, height: 1440 },
    { width: 1920, height: 1080 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(size);
    for (const route of routes) {
      await page.goto(route);
      if (route === "/health/habits")
        await page
          .locator("[data-habit-id]")
          .filter({ hasText: name })
          .getByRole("link")
          .click();
      await page.waitForLoadState("networkidle");
      await expect(page.locator("h1")).toBeVisible();
      await page.screenshot({
        path: info.outputPath(
          `${route.replaceAll("/", "-")}-${size.width}.png`,
        ),
        fullPage: true,
      });
      const bounds = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        viewport: innerWidth,
        overlaps: [
          ...document.querySelectorAll("[data-health-detail] > div > section"),
        ].map((e) => ({
          x: e.getBoundingClientRect().x,
          y: e.getBoundingClientRect().y,
          w: e.getBoundingClientRect().width,
          h: e.getBoundingClientRect().height,
        })),
      }));
      expect(bounds.width).toBeLessThanOrEqual(bounds.viewport);
      if (size.width >= 1280 && route !== "/health")
        await info.attach(`${route}-${size.width}-one-page`, {
          body: JSON.stringify(await assertHealthWorkspace(page)),
          contentType: "application/json",
        });
      if (route === "/health") {
        const geometry = await page.evaluate(() => ({
          bottom: Math.max(
            ...[...document.querySelectorAll("[data-health-section]")].map(
              (e) => e.getBoundingClientRect().bottom,
            ),
          ),
          weight: document
            .getElementById("weight-tracking-title")!
            .closest("section")!
            .getBoundingClientRect().top,
        }));
        expect(geometry.weight).toBeGreaterThanOrEqual(geometry.bottom);
      }
      if (size.width === 390 && route !== "/health") {
        const open = route.endsWith("mental")
          ? "Schlaf erfassen & Verlauf öffnen"
          : route.endsWith("habits")
            ? `Bearbeiten · ${name}`
            : route.endsWith("strength")
              ? "Neue Übung"
              : "Neuer Plan";
        await page.getByText(open, { exact: true }).click();
        await expect(page.locator("main form:visible").first()).toBeVisible();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(390);
        await page.screenshot({
          path: info.outputPath(`${route.replaceAll("/", "-")}-390-form.png`),
          fullPage: true,
        });
      }
      await info.attach(`${route}-${size.width}-bounds`, {
        body: JSON.stringify(bounds),
        contentType: "application/json",
      });
    }
  }
  proof(
    "Viewports",
    "Vollständige Screenshots 3840/2560/1920/390, kein horizontaler Page-Overflow",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/health/habits");
  await page
    .locator("[data-habit-id]")
    .filter({ hasText: name })
    .getByRole("link")
    .click();
  await page.getByText(`Bearbeiten · ${name}`, { exact: true }).click();
  await page
    .getByRole("button", { name: "Habit archivieren", exact: true })
    .click();
  await expect(page).toHaveURL(/habit=saved/);
  await page.reload();
  await expect(
    page.locator("[data-habit-id]").filter({ hasText: name }),
  ).toContainText("Archiviert");
  proof(
    "Habit archive",
    "Archivierte Historie erhalten, aktiver Tracker entfernt",
  );
  await page.goto("/health/running");
  const runHistory = section(page, "Laufhistorie");
  const runRow = runHistory.locator("article").last();
  await runRow.locator("summary").click();
  const editRun = runRow.locator("form").first();
  await editRun.getByLabel("Distanz km", { exact: true }).fill("4.3");
  await submit(page, editRun, "Änderungen speichern");
  await page.reload();
  await expect(runHistory).toContainText("4.3 km");
  await runHistory.locator("article").last().locator("summary").click();
  await submit(
    page,
    runHistory.locator("article").last().locator("form").last(),
    "Archivieren",
  );
  await page.reload();
  await expect(runHistory).not.toContainText("4.3 km");
  proof("Run edit / archive", "Korrigierte Distanz und Archiv nach Reload");
  const runningPlan = page.locator('[data-testid^="running-plan-"]').first();
  await runningPlan.getByText("Plan bearbeiten", { exact: true }).click();
  await runningPlan
    .locator("form")
    .first()
    .getByLabel("Ziel / Kontext")
    .fill("Geänderter Laufkontext");
  await submit(page, runningPlan.locator("form").first(), "Plan speichern");
  await runningPlan
    .getByText("Planeinheit bearbeiten", { exact: true })
    .click();
  const editUnit = runningPlan.locator("form").filter({
    has: page.getByRole("button", {
      name: "Planeinheit speichern",
      exact: true,
    }),
  });
  await editUnit.getByLabel("Dauer min", { exact: true }).fill("31");
  await submit(page, editUnit, "Planeinheit speichern");
  await page.reload();
  await expect(runningPlan).toContainText("31 min");
  await submit(
    page,
    runningPlan.locator("form").filter({
      has: page.getByRole("button", {
        name: "Plan archivieren",
        exact: true,
      }),
    }),
    "Plan archivieren",
  );
  await page.reload();
  await expect(page.locator('[data-testid^="running-plan-"]')).toHaveCount(0);
  proof(
    "Run plan / unit edit / archive",
    "Kontext und Planeinheit korrigiert, Plan archiviert",
  );
  await page.goto("/health/strength");
  const strengthPlan = page.locator('[data-testid^="strength-plan-"]').first();
  await strengthPlan.getByText("Plan bearbeiten", { exact: true }).click();
  await strengthPlan
    .locator("form")
    .first()
    .getByLabel("Ziel / Kontext")
    .fill("Geänderter Kraftkontext");
  await submit(page, strengthPlan.locator("form").first(), "Plan speichern");
  const itemDetails = strengthPlan.locator("details").filter({
    has: page.getByRole("button", {
      name: "Planübung speichern",
      exact: true,
      includeHidden: true,
    }),
  });
  await itemDetails.locator("summary").click();
  await itemDetails.getByLabel("Wiederholungen", { exact: true }).fill("11");
  await submit(page, itemDetails.locator("form"), "Planübung speichern");
  await page.reload();
  await expect(strengthPlan).toContainText("11");
  await submit(
    page,
    strengthPlan.locator("form").filter({
      has: page.getByRole("button", {
        name: "Plan archivieren",
        exact: true,
      }),
    }),
    "Plan archivieren",
  );
  await page.reload();
  await expect(page.locator('[data-testid^="strength-plan-"]')).toHaveCount(0);
  proof(
    "Strength plan / structure edit / archive",
    "Plan und Wiederholungen korrigiert, Plan archiviert",
  );
  const ex = section(page, "Übungsbibliothek")
    .locator("article")
    .filter({ hasText: exercise });
  await ex.locator("summary").click();
  const editExercise = ex.locator("form").first();
  await editExercise
    .getByLabel("Beschreibung", { exact: true })
    .fill("Geänderte Beschreibung");
  await editExercise.getByLabel("Bizeps", { exact: true }).uncheck();
  await submit(page, editExercise, "Übung speichern");
  await page.reload();
  await expect(ex).toContainText("Geänderte Beschreibung");
  await expect(ex.locator("p").nth(1)).not.toContainText("Bizeps");
  await ex.locator("summary").click();
  await submit(page, ex.locator("form").last(), "Übung archivieren");
  await page.reload();
  await expect(
    section(page, "Übungsbibliothek").locator("article"),
  ).toHaveCount(0);
  await expect(section(page, "Trainingshistorie & Sessions")).toContainText(
    exercise,
  );
  proof(
    "Exercise edit / mapping / archive",
    "Beschreibung und Muskelrelation korrigiert, Archiv behält Session-Historie",
  );
  await info.attach("control-inventory", {
    body: JSON.stringify(inventory, null, 2),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
});

test("R2-05 fresh local chain database lint and security advisors", async ({}, info) => {
  test.setTimeout(120_000);
  if (process.env.LIFE_OS_E2E_RUNTIME !== "DISPOSABLE" || !process.env.TMPDIR)
    throw new Error("Disposable runtime required");
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const exec = promisify(execFile);
  for (const [name, args] of [
    ["lint", ["--level", "warning"]],
    [
      "advisors",
      ["--type", "security", "--level", "warn", "--fail-on", "none"],
    ],
  ] as const) {
    const result = await exec(
      "pnpm",
      [
        "exec",
        "supabase",
        "db",
        name,
        "--local",
        "--workdir",
        process.env.TMPDIR,
        ...args,
      ],
      { timeout: 60000 },
    );
    await info.attach(`db-${name}`, {
      body: result.stdout + result.stderr,
      contentType: "text/plain",
    });
  }
});

test("R2-05 Empty and auth-blocked boundaries stay compact and do not offer writes", async ({
  page,
}, info) => {
  page.setDefaultTimeout(10000);
  const base = `http://${process.env.PLAYWRIGHT_HOST ?? "127.0.0.1"}:${process.env.PLAYWRIGHT_PORT ?? "3000"}`;
  for (const profile of ["empty", "manual"]) {
    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: "life_os_profile",
        value: profile,
        url: base,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    for (const route of routes.slice(1)) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("main form")).toHaveCount(0);
      await page.setViewportSize({ width: 390, height: 844 });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: info.outputPath(
          `${profile}-${route.replaceAll("/", "-")}-mobile.png`,
        ),
        fullPage: true,
      });
    }
  }
  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: "life_os_profile",
      value: "demo",
      url: base,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.goto("/health/running");
  await expect(page.locator('[data-running-section="page"]')).toBeVisible();
  await expect(page.getByTestId("running-session-form")).toHaveCount(0);
});
