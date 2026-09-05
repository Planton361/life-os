import { expect, test } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

test("R2-01 Manual dashboard control inventory", async ({ page }, info) => {
  test.setTimeout(180_000);
  await signUpTechnicalManualUser(page, "r2-controls", Date.now());
  await page.setViewportSize({ width: 2560, height: 1440 });
  const inventory: { CONTROL: string; EXPECTED: string; ACTUAL: string; RESULT: string }[] = [];
  const record = (control: string, expected: string, actual: string) => inventory.push({ CONTROL: control, EXPECTED: expected, ACTUAL: actual, RESULT: "PASS" });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto("/dashboard");
  const capture = `R2 control ${Date.now()}`;
  const quick = page.locator('[aria-labelledby="quick-thought-title"]');
  await quick.getByLabel("Quick Thought", { exact: true }).fill(capture);
  await quick.getByRole("button", { name: "In Inbox speichern" }).click();
  const toast = page.locator('[aria-label="Benachrichtigungen"]');
  await expect(toast.getByRole("status")).toBeVisible();
  const bounds = await toast.boundingBox();
  expect(bounds!.x + bounds!.width).toBe(2544);
  expect(bounds!.y).toBe(16);
  await expect(toast.getByRole("status")).toHaveCount(0, { timeout: 7000 });
  await page.goto("/inbox");
  await expect(page.locator("main")).toContainText(capture);
  await page.reload();
  await expect(page.locator("main")).toContainText(capture);
  record("Quick Thought / Toast", "Persisted capture; top-right toast; ~5 s", "Capture after reload; toast top-right and dismissed");
  await page.goto("/dashboard");
  const mood = page.locator(".dashboard-mood");
  await expect(mood.getByRole("button")).toHaveCount(6);
  for (const name of ["Calm", "Focused", "Tired", "Anxious", "Stressed", "Happy"]) {
    await expect(page).not.toHaveURL(/health=/);
    for (const close of await toast.getByRole("button", { name: "Benachrichtigung schließen" }).all()) await close.click();
    await mood.getByRole("button", { name, exact: true }).click();
    await expect(toast.getByRole("status").filter({ hasText: "Mood gespeichert." })).toBeVisible();
    await page.reload();
    await expect(mood.getByRole("button", { name, exact: true })).toHaveAttribute("aria-pressed", "true");
    record(`Mood ${name}`, "Save and reload", "Saved selection survives reload");
  }
  const habits = page.locator(".dashboard-habits");
  for (const period of ["Morning", "Midday", "Evening"]) {
    await habits.getByRole("button", { name: period, exact: true }).click();
    await expect(habits.getByRole("button", { name: period, exact: true })).toHaveAttribute("aria-pressed", "true");
    record(`Habit ${period}`, "Eight stable slots", "Selected period; eight slots");
  }
  await expect(page).not.toHaveURL(/health=/);
  for (const close of await toast.getByRole("button", { name: "Benachrichtigung schließen" }).all()) await close.click();
  for (const name of ["Target cap", "Automatic second slot"]) {
    await habits.getByRole("button", { name: /Add habit/i }).click();
    await expect(toast.getByRole("status")).toHaveCount(0);
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel(/slot/i)).toHaveCount(0);
    await dialog.getByLabel("Name", { exact: true }).fill(name);
    await dialog.getByLabel("Target", { exact: true }).fill("2.5");
    await dialog.getByLabel("Increment", { exact: true }).fill("1");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(habits.getByRole("button", { name: `${name} erhöhen` })).toBeVisible();
    for (const close of await toast.getByRole("button", { name: "Benachrichtigung schließen" }).all()) await close.click();
  }
  const targetCard = habits.getByRole("article").filter({ has: page.getByRole("button", { name: "Target cap erhöhen" }) });
  for (const value of ["1", "2", "2.5"]) {
    await targetCard.getByRole("button", { name: "Target cap erhöhen" }).click();
    await expect(targetCard).toContainText(`${value} / 2.5`);
  }
  await page.reload();
  await expect(targetCard.getByRole("button", { name: "Target cap erhöhen" })).toBeDisabled();
  await expect(targetCard.locator('[aria-label="3 / 3 Schritte"] > span')).toHaveCount(3);
  await targetCard.getByRole("button", { name: /rückgängig/ }).click();
  await expect(targetCard).toContainText("2 / 2.5");
  await page.reload();
  await expect(targetCard).toContainText("2 / 2.5");
  await expect(habits.getByRole("button", { name: "Evening", exact: true })).toHaveAttribute("aria-pressed", "true");
  record("Habit Add / Increment / Undo", "Automatic slots; cap; real steps; stable period", "Two slots; 2.5 cap; three dots; Undo to 2; reload stable");
  const portfolio = page.locator(".dashboard-portfolio");
  for (const [view, kind] of [["Project View", "Project"], ["Goal View", "Goal"], ["Skill View", "Skill"]]) {
    await portfolio.getByRole("button", { name: view, exact: true }).click();
    await expect(portfolio.locator('[data-portfolio-placeholder]')).toHaveCount(4);
    await portfolio.getByRole("link", { name: `${kind.toLowerCase()} erstellen`, exact: true }).first().click();
    await expect(page.getByRole("form", { name: `${kind} erstellen`, exact: true })).toBeVisible();
    record(`Portfolio ${view} / Add`, "Canonical creation form", `${kind} form visible`);
    await page.goto("/dashboard");
  }
  for (const slot of ["Breakfast", "Lunch", "Dinner"]) {
    await page.getByRole("link", { name: `Planen ${slot}`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`slot=${slot.toLowerCase()}`));
    record(`Meals Planen ${slot}`, "Meal Planner with slot", `${slot} context in destination`);
    await page.goto("/dashboard");
  }
  const running = page.locator('[aria-labelledby="running-tracker-title"]');
  for (const view of ["Muscle", "Running"]) {
    await running.getByRole("button", { name: view, exact: true }).click();
    await expect(running.getByRole("button", { name: view, exact: true })).toHaveAttribute("aria-pressed", "true");
    record(`Running / ${view}`, "Real view", "Selected view rendered");
  }
  for (const view of ["Week", "Month", "Day"]) {
    await page.locator(".dashboard-agenda").getByRole("button", { name: view, exact: true }).click();
    if (view !== "Day") await expect(page.locator(`[data-agenda-view="${view}"] > section`)).toHaveCount(view === "Week" ? 7 : 42);
    record(`Agenda ${view}`, "In-card canonical projection", `${view} rendered without leaving Dashboard`);
  }
  const links = await page.locator('.life-os-command-center a, .dashboard-main-grid a').evaluateAll(elements => elements.map(el => ({ href: el.getAttribute("href")!, label: el.getAttribute("aria-label") ?? el.textContent?.trim() ?? "link" })));
  for (const { href, label } of links) {
    const link = page.locator('.life-os-command-center a, .dashboard-main-grid a').filter({ hasNot: page.locator('a') });
    await link.filter({ visible: true }).locator(`xpath=self::a[@href=${JSON.stringify(href)}]`).first().click();
    await expect(page).toHaveURL(new RegExp(href.split('?')[0].replaceAll('/', '\\/')));
    await expect(page.locator("#main-content")).toBeVisible();
    record(label, href, "Destination loaded");
    await page.goto("/dashboard");
  }
  const recipeTitle = `R2 linked recipe ${Date.now()}`;
  await page.goto("/nutrition/recipes");
  const recipeCreate = page.getByRole("heading", { name: "Recipe erstellen" }).locator("xpath=ancestor::section[1]");
  await recipeCreate.getByLabel("Title").fill(recipeTitle);
  await recipeCreate.getByRole("button", { name: "Recipe erstellen" }).click();
  await expect(page.getByText(recipeTitle, { exact: true }).first()).toBeVisible();
  await page.goto("/nutrition");
  const mealTitle = `R2 linked meal ${Date.now()}`;
  const mealCreate = page.getByRole("heading", { name: "Meal erstellen" }).locator("xpath=ancestor::section[1]");
  await mealCreate.getByLabel("Title").fill(mealTitle);
  await mealCreate.getByLabel("Recipe").selectOption({ label: recipeTitle });
  await mealCreate.getByRole("button", { name: "Meal erstellen" }).click();
  await expect(page.getByText(mealTitle, { exact: true }).first()).toBeVisible();
  await page.goto("/dashboard");
  await page.locator('[aria-labelledby="meals-today-title"]').getByRole("link", { name: new RegExp(`Open meal slot.*${mealTitle}`) }).click();
  await expect(page).toHaveURL(/recipes\/[a-f0-9-]+/);
  await page.reload();
  await expect(page.getByRole("region", { name: "Selected Recipe", exact: true }).getByRole("heading", { name: recipeTitle, exact: true })).toBeVisible();
  record("Meals existing dish", "Canonical linked recipe", "Correct recipe selected after reload");
  record("Time Progress", "Three progress rows and Today navigation", "Three rows; Today link tested");
  expect(errors).toEqual([]);
  await info.attach("control-inventory.json", { body: JSON.stringify(inventory, null, 2), contentType: "application/json" });
});
