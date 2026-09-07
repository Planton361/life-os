import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";
import type { Database } from "@/types/supabase";

async function open(page: Page, route: string) {
  await page.goto(route);
  await page.waitForLoadState("networkidle");
}
const slot = (page: Page, date: string, type: string) =>
  page.locator(`[data-meal-slot="${date}-${type}"]`);

test("R2-05 Nutrition canonical recipe, planning, DnD, logging and dependent projections", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(12000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => {
    if (["error", "warning"].includes(e.type())) errors.push(e.text());
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  const stamp = Date.now();
  const title = `Nutrition Rezept ${stamp}`;
  const ingredient = `Linsen ${stamp}`;
  await signUpTechnicalManualUser(page, "nutrition-surface", stamp);
  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const auth = await db.auth.signInWithPassword({
    email: `nutrition-surface-${stamp}@example.local`,
    password: `C1proof-${stamp}`,
  });
  expect(auth.error).toBeNull();
  await open(page, "/nutrition/recipes");
  await expect(
    page.getByRole("region", { name: "Rezeptbibliothek", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Rezept erstellen", exact: true }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "Neues Rezept", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Neues Rezept",
    exact: true,
  });
  await dialog.getByLabel("Titel", { exact: true }).fill(title);
  await dialog.getByLabel("Kurzbeschreibung").fill("Rezept für den Wochenplan");
  await dialog.getByLabel("Portionen", { exact: true }).fill("2");
  await dialog.getByLabel("Zubereitungszeit (min)", { exact: true }).fill("20");
  await dialog
    .getByLabel("Tags / Mahlzeiten")
    .fill("breakfast, lunch, dinner, vegetarian");
  await dialog
    .getByLabel("Zubereitung", { exact: true })
    .fill("Linsen kochen.");
  for (const [label, value] of [
    ["Energie (kcal)", "600"],
    ["Protein (g)", "40"],
    ["Kohlenhydrate (g)", "80"],
    ["Fett (g)", "12"],
  ])
    await dialog.getByLabel(label, { exact: true }).fill(value);
  await dialog
    .getByRole("button", { name: "Rezept erstellen", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await page.reload();
  const browser = page.getByRole("region", {
    name: "Rezeptbibliothek",
    exact: true,
  });
  await browser.getByRole("button").filter({ hasText: title }).click();
  const detail = page.getByRole("region", {
    name: "Ausgewähltes Rezept",
    exact: true,
  });
  await expect(
    detail.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  await detail
    .locator("summary")
    .filter({ hasText: "Rezept bearbeiten" })
    .click();
  const edit = detail.getByRole("form", {
    name: "Rezept bearbeiten",
    exact: true,
  });
  await edit.getByLabel("Kurzbeschreibung").fill("Überarbeitet");
  await edit.getByLabel("Energie (kcal)", {exact:true}).fill("650");
  await edit
    .getByRole("button", { name: "Rezept speichern", exact: true })
    .click();
  await expect(detail.getByText("Überarbeitet", { exact: true })).toBeVisible();
  await detail
    .locator("summary")
    .filter({ hasText: "Rezept bearbeiten" })
    .click();
  const add = detail.getByRole("form", {
    name: "Zutat hinzufügen",
    exact: true,
  });
  await add.getByLabel("Name", { exact: true }).fill(ingredient);
  await add.getByLabel("Menge", { exact: true }).fill("200");
  await add.getByLabel("Einheit", { exact: true }).fill("g");
  await add
    .getByRole("button", { name: "Zutat hinzufügen", exact: true })
    .click();
  await expect(detail.locator("[data-recipe-ingredient-id]")).toHaveCount(1);
  await page.reload();
  await expect(detail.getByText(ingredient, { exact: true })).toBeVisible();
  await browser.getByLabel("Suche", { exact: true }).fill("kein-treffer");
  await expect(browser.getByRole("listitem")).toHaveCount(0);
  await browser.getByLabel("Suche", { exact: true }).fill(title);
  await browser.getByLabel("Sortierung", { exact: true }).selectOption("title");
  await expect(browser.getByRole("listitem")).toHaveCount(1);
  await open(page, "/nutrition/meal-planner");
  const dates = await page
    .locator("[data-meal-slot]")
    .evaluateAll((nodes) => [
      ...new Set(
        nodes.map((n) => n.getAttribute("data-meal-slot")!.slice(0, 10)),
      ),
    ]);
  const [monday, tuesday, wednesday] = dates;
  const recipeChoices = page.getByRole("region", {
    name: "Rezeptauswahl",
    exact: true,
  });
  await slot(page, monday, "breakfast")
    .getByRole("button", { name: "Rezept wählen", exact: true })
    .click();
  await recipeChoices.getByLabel("Suche", { exact: true }).fill(title);
  await recipeChoices.getByLabel("Mahlzeitfilter").selectOption("breakfast");
  await recipeChoices.getByLabel("Sortierung").selectOption("prep");
  await recipeChoices
    .getByRole("button", { name: "Zuordnen", exact: true })
    .click();
  await expect(slot(page, monday, "breakfast")).toContainText(
    "Noch nicht gespeichert",
  );
  await page
    .getByRole("button", { name: "Änderungen zurücksetzen", exact: true })
    .click();
  await expect(slot(page, monday, "breakfast")).not.toContainText(title);
  await recipeChoices
    .getByRole("button", { name: "Zuordnen", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Woche speichern", exact: true })
    .click();
  await expect(
    slot(page, monday, "breakfast").locator("[data-meal-id]"),
  ).toHaveCount(1);
  const mealId = await slot(page, monday, "breakfast")
    .locator("[data-meal-id]")
    .getAttribute("data-meal-id");
  await page.reload();
  await expect(
    slot(page, monday, "breakfast").locator(`[data-meal-id="${mealId}"]`),
  ).toBeVisible();
  // A real browser drag; the same entity persists on a different day/type.
  await slot(page, monday, "breakfast")
    .locator("[data-meal-id]")
    .dragTo(slot(page, tuesday, "lunch"));
  await expect(
    slot(page, tuesday, "lunch").locator(`[data-meal-id="${mealId}"]`),
  ).toBeVisible();
  await page.reload();
  await expect(
    slot(page, monday, "breakfast").locator("[data-meal-id]"),
  ).toHaveCount(0);
  await expect(
    slot(page, tuesday, "lunch").locator(`[data-meal-id="${mealId}"]`),
  ).toBeVisible();
  let rows = await db
    .from("meals")
    .select("id,date,meal_type")
    .eq("user_id", auth.data.user!.id);
  expect(rows.error).toBeNull();
  expect(rows.data).toEqual([
    { id: mealId, date: tuesday, meal_type: "lunch" },
  ]);
  // Occupied target has its own real meal and never gets replaced.
  await slot(page, wednesday, "dinner")
    .getByRole("button", { name: "Rezept wählen", exact: true })
    .click();
  await recipeChoices
    .getByRole("button", { name: "Zuordnen", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Woche speichern", exact: true })
    .click();
  await expect(
    slot(page, wednesday, "dinner").locator("[data-meal-id]"),
  ).toHaveCount(1);
  await slot(page, tuesday, "lunch")
    .locator("[data-meal-id]")
    .dragTo(slot(page, wednesday, "dinner"));
  await expect(
    page.locator("#meal-planner-page").getByRole("alert"),
  ).toContainText("bereits belegt");
  await page.reload();
  await expect(page.locator("[data-meal-id]")).toHaveCount(2);
  // Escape cancels an actual native pointer drag without a request or mutation.
  const source = page.locator(`[data-meal-id="${mealId}"]`);
  const beforeCancel = (await db.from("meals").select("*").eq("id", mealId!))
    .data;
  await page.waitForLoadState("networkidle");
  await source.scrollIntoViewIfNeeded();
  await expect(source).toBeVisible();
  const bounds = (await source.boundingBox())!;
  await page.mouse.move(bounds.x + 20, bounds.y + 20);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 90, bounds.y + 30, { steps: 8 });
  await expect(source).toHaveAttribute("data-dragging", "true");
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect((await db.from("meals").select("*").eq("id", mealId!)).data).toEqual(
    beforeCancel,
  );
  await source.click();
  const move = page.getByRole("form", {
    name: "Mahlzeit verschieben",
    exact: true,
  });
  await move.getByLabel("Tag", { exact: true }).fill(monday);
  await move.getByLabel("Mahlzeit", { exact: true }).selectOption("breakfast");
  await move.getByRole("button", { name: "Verschieben", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    slot(page, monday, "breakfast").locator(`[data-meal-id="${mealId}"]`),
  ).toBeVisible();
  await page.reload();
  await expect(
    slot(page, monday, "breakfast").locator(`[data-meal-id="${mealId}"]`),
  ).toBeVisible();
  await open(page, "/nutrition/grocery");
  const grocery = page.locator('[data-grocery-section="draft"]');
  await expect(grocery.getByText(ingredient, { exact: true })).toBeVisible();
  await expect(grocery.getByText("200 g", { exact: true })).toBeVisible();
  await page.reload();
  await expect(grocery.getByText("200 g", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Nächste Woche", exact: true }).click();
  await expect(grocery.getByText(ingredient, { exact: true })).toHaveCount(0);
  await page
    .getByRole("link", { name: "Vorherige Woche", exact: true })
    .click();
  await expect(grocery.getByText(ingredient, { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Aktuelle Woche", exact: true }).click();
  await open(page, "/nutrition/meal-planner");
  await slot(page, wednesday, "dinner").locator("[data-meal-id]").click();
  await page.getByText("Aus Plan entfernen", { exact: true }).click();
  await page
    .getByRole("button", { name: "Entfernen bestätigen", exact: true })
    .click();
  await expect(
    slot(page, wednesday, "dinner").locator("[data-meal-id]"),
  ).toHaveCount(0);
  // Move to today's slot, then prove dashboard/grocery before completion.
  await page.locator(`[data-meal-id="${mealId}"]`).click();
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Berlin",
  });
  await move.getByLabel("Tag", { exact: true }).fill(today);
  await move.getByLabel("Mahlzeit", { exact: true }).selectOption("lunch");
  await move.getByRole("button", { name: "Verschieben", exact: true }).click();
  await expect(
    slot(page, today, "lunch").locator(`[data-meal-id="${mealId}"]`),
  ).toBeVisible();
  await open(page, "/dashboard");
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
  await open(page, "/nutrition");
  await expect(
    page.getByRole("heading", { name: "Mahlzeit erfassen", exact: true }),
  ).not.toBeVisible();
  const next = page.getByRole("region", {
    name: "Nächste Mahlzeit",
    exact: true,
  });
  await next.getByRole("link", {name: "Plan öffnen", exact: true}).click();
  const inspector = page.getByRole("region", {name:"Ausgewählte Mahlzeit",exact:true});
  await expect(inspector).toContainText(title);
  await inspector.getByRole("link", {name:"Rezept öffnen", exact:true}).click();
  await expect(page).toHaveURL(/nutrition\/recipes\/[0-9a-f-]+$/);
  await expect(page.getByRole("region",{name:"Ausgewähltes Rezept",exact:true})).toContainText(title);
  await page.reload();
  await expect(page.getByRole("region",{name:"Ausgewähltes Rezept",exact:true})).toContainText(title);
  await open(page,"/nutrition");
  await next.getByRole("button", { name: "Gegessen", exact: true }).click();
  const recent = page.getByRole("region", {
    name: "Letzte Mahlzeiten",
    exact: true,
  });
  await expect(recent.getByText(title, { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Ernährung heute", exact: true }),
  ).toContainText("325 kcal");
  await page
    .getByRole("button", { name: "Mahlzeit erfassen", exact: true })
    .click();
  const log = page.getByRole("dialog", {
    name: "Mahlzeit erfassen",
    exact: true,
  });
  const logTitle = `Erfasst ${stamp}`;
  await log.getByLabel("Titel", { exact: true }).fill(logTitle);
  await log.getByLabel("Mahlzeit", { exact: true }).selectOption("snack");
  await log
    .getByRole("button", { name: "Mahlzeit erfassen", exact: true })
    .click();
  await expect(log).not.toBeVisible();
  await expect(recent.getByText(logTitle, { exact: true })).toBeVisible();
  await page.reload();
  await expect(recent.getByText(logTitle, { exact: true })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Planerfüllung", exact: true }),
  ).toContainText("Gegessen2");
  await recent.getByRole("button").filter({ hasText: logTitle }).click();
  await expect(
    page.getByRole("dialog", { name: logTitle, exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("link", {name:"Health öffnen",exact:true}).click();
  await expect(page).toHaveURL(/\/health$/);
  await open(page, "/today");
  await expect(
    page
      .locator('[data-today-section="activity-stream"]')
      .getByText(logTitle, { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .locator('[data-today-section="activity-stream"]')
      .getByText(logTitle, { exact: true }),
  ).toBeVisible();
  await open(page, "/nutrition/grocery");
  await expect(grocery.getByText(ingredient, { exact: true })).toHaveCount(0);
  rows = await db
    .from("meals")
    .select("id,date,meal_type")
    .eq("user_id", auth.data.user!.id);
  expect(rows.data).toHaveLength(2);
  await info.attach("console", {
    body: JSON.stringify(errors),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
  await db.auth.signOut();
});

test("Nutrition real control inventory, unresolved meals and recipe lifecycle", async ({
  page,
}) => {
  test.setTimeout(150000);
  page.setDefaultTimeout(10000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, "nutrition-controls", stamp);
  await open(page, "/nutrition/meal-planner");
  for (const name of [
    "Vorherige Woche",
    "Nächste Woche",
    "Nächste Woche",
    "Aktuelle Woche",
  ]) {
    await page.getByRole("link", { name, exact: true }).click();
    await page.waitForLoadState("networkidle");
  }
  for (const button of await page.locator(".nutrition-slot-label").all())
    await button.click();
  await expect(
    page.getByRole("region", { name: "Ausgewählte Mahlzeit", exact: true }),
  ).toContainText("Wähle rechts ein Rezept");
  await page
    .getByRole("link", { name: "Erstes Rezept erstellen", exact: true })
    .click();
  await page.getByRole("button", { name: "Neues Rezept", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Neues Rezept", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Neues Rezept", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Titel", { exact: true }).fill(`Archiv ${stamp}`);
  await dialog
    .getByRole("button", { name: "Rezept erstellen", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  const browser = page.getByRole("region", {
    name: "Rezeptbibliothek",
    exact: true,
  });
  for (const name of [
    "Frühstück",
    "Mittagessen",
    "Abendessen",
    "Alle Tags",
    "Proteinreich",
    "Kohlenhydratarm",
    "Schnell",
    "Meal prep",
    "Vegetarisch",
    "Alle Tags",
    "Vollständig",
    "Angaben fehlen",
    "Entwurf",
  ]) {
    await browser.getByRole("button", { name, exact: true }).click();
  }
  for (const all of await browser
    .getByRole("button", { name: "Alle", exact: true })
    .all())
    await all.click();
  await browser
    .getByLabel("Sortierung", { exact: true })
    .selectOption("recent");
  await browser
    .getByRole("button")
    .filter({ hasText: `Archiv ${stamp}` })
    .click();
  const detail = page.getByRole("region", {
    name: "Ausgewähltes Rezept",
    exact: true,
  });
  await detail
    .locator("summary")
    .filter({ hasText: "Rezept bearbeiten" })
    .click();
  const ingredientForm = detail.getByRole("form", {
    name: "Zutat hinzufügen",
    exact: true,
  });
  await ingredientForm
    .getByLabel("Name", { exact: true })
    .fill(`Zutat ${stamp}`);
  await ingredientForm.getByLabel("Menge", { exact: true }).fill("100");
  await ingredientForm.getByLabel("Einheit", { exact: true }).fill("g");
  await ingredientForm
    .getByRole("button", { name: "Zutat hinzufügen", exact: true })
    .click();
  await expect(detail.locator("[data-recipe-ingredient-id]")).toHaveCount(1);
  const ingredientEdit = detail.getByRole("form", {
    name: `Zutat bearbeiten: Zutat ${stamp}`,
    exact: true,
  });
  await ingredientEdit.getByLabel("Menge", { exact: true }).fill("250");
  await ingredientEdit
    .getByRole("button", { name: "Zutat speichern", exact: true })
    .click();
  await expect(ingredientEdit.getByRole("status")).toContainText("Zutat aktualisiert");
  await page.reload();
  await detail
    .locator("summary")
    .filter({ hasText: "Rezept bearbeiten" })
    .click();
  await expect(ingredientEdit.getByLabel("Menge", { exact: true })).toHaveValue(
    "250",
  );
  await detail
    .getByRole("button", { name: "Zutat entfernen", exact: true })
    .click();
  await expect(detail.locator("[data-recipe-ingredient-id]")).toHaveCount(0);
  await page.reload();
  await detail
    .locator("summary")
    .filter({ hasText: "Rezept bearbeiten" })
    .click();
  await expect(detail.locator("[data-recipe-ingredient-id]")).toHaveCount(0);
  await detail
    .getByRole("button", { name: "Rezept archivieren", exact: true })
    .click();
  await expect(browser.getByRole("listitem")).toHaveCount(0);
  await page.reload();
  await expect(browser.getByRole("listitem")).toHaveCount(0);
  await open(page, "/nutrition");
  await page
    .getByRole("button", { name: "Mahlzeit erfassen", exact: true })
    .click();
  const log = page.getByRole("dialog");
  await log.getByLabel("Titel", { exact: true }).fill(`Ohne Rezept ${stamp}`);
  await log.getByLabel("Bereits gegessen").uncheck();
  await log
    .getByRole("button", { name: "Mahlzeit erfassen", exact: true })
    .click();
  await expect(log).not.toBeVisible();
  await page.getByRole("link", { name: /Einkauf öffnen/ }).click();
  const unresolved = page.locator('[data-grocery-section="unresolved"]');
  await expect(
    unresolved.getByText(`Ohne Rezept ${stamp}`, { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(unresolved).toContainText("Rezept fehlt");
  await unresolved
    .getByRole("link", { name: "Rezeptzutaten pflegen", exact: true })
    .click();
  await expect(page).toHaveURL(/nutrition\/recipes/);
  await page
    .locator("#recipes-page")
    .getByRole("link", { name: "Essensplan", exact: true })
    .click();
  const meal = page
    .locator("[data-meal-id]")
    .filter({ hasText: `Ohne Rezept ${stamp}` });
  await meal.click();
  await page.getByText("Bearbeiten / Zeitplanung", { exact: true }).click();
  const edit = page.getByRole("region", {
    name: "Mahlzeit bearbeiten",
    exact: true,
  });
  await edit.getByLabel("Titel", { exact: true }).fill(`Geändert ${stamp}`);
  await edit.getByLabel("Portionen", { exact: true }).fill("0.5");
  await edit.getByLabel("Notizen", { exact: true }).fill("Lokale Notiz");
  await edit
    .getByRole("button", { name: "Mahlzeit speichern", exact: true })
    .click();
  await expect(
    page.locator("[data-meal-id]").filter({ hasText: `Geändert ${stamp}` }),
  ).toBeVisible();
  await page.reload();
  await page
    .locator("[data-meal-id]")
    .filter({ hasText: `Geändert ${stamp}` })
    .click();
  await expect(
    page.getByRole("region", { name: "Ausgewählte Mahlzeit", exact: true }),
  ).toContainText("Lokale Notiz");
  await page.getByText("Aus Plan entfernen", { exact: true }).click();
  await page
    .getByRole("button", { name: "Entfernen bestätigen", exact: true })
    .click();
  await expect(page.locator("[data-meal-id]")).toHaveCount(0);
  await page.getByRole("link", { name: "Einkauf öffnen", exact: true }).click();
  await expect(
    unresolved.getByText(`Geändert ${stamp}`, { exact: true }),
  ).toHaveCount(0);
});

test("Nutrition Empty and auth-blocked modes expose no apparent writes or demo leakage", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => {
    if (["error", "warning"].includes(e.type())) errors.push(e.text());
  });
  const base = `http://${process.env.PLAYWRIGHT_HOST ?? "127.0.0.1"}:${process.env.PLAYWRIGHT_PORT ?? "3000"}`;
  await page.setViewportSize({ width: 390, height: 844 });
  for (const profile of ["empty", "manual"]) {
    await page.context().clearCookies();
    await page
      .context()
      .addCookies([
        {
          name: "life_os_profile",
          value: profile,
          url: base,
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);
    for (const route of [
      "/nutrition",
      "/nutrition/meal-planner",
      "/nutrition/recipes",
      "/nutrition/grocery",
    ]) {
      await open(page, route);
      const root = page.locator(".nutrition-workspace-page");
      await expect(root).toBeVisible();
      await expect(
        root.locator("[data-meal-id],[data-recipe-ingredient-id]"),
      ).toHaveCount(0);
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      if (route === "/nutrition")
        await expect(
          root.getByRole("button", { name: "Mahlzeit erfassen", exact: true }),
        ).toBeDisabled();
      if (route.endsWith("recipes"))
        await expect(
          root.getByRole("button", { name: "Neues Rezept", exact: true }),
        ).toBeDisabled();
      if (route.endsWith("meal-planner")) {
        await root.locator(".nutrition-slot-label").first().click();
        await expect(
          root.getByRole("button", { name: "Woche speichern", exact: true }),
        ).toBeDisabled();
      }
      if (profile === "manual" && !route.endsWith("grocery"))
        await expect(root.getByRole("alert")).toBeVisible();
    }
  }
  expect(errors).toEqual([]);
});
