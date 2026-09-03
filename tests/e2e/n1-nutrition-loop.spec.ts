import { expect, test } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";

test("N1 keeps a served recipe meal consistent across grocery, Calendar, Today, Dashboard and completion", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  const stamp = Date.now();
  const recipeTitle = `N1 serving recipe ${stamp}`;
  const mealTitle = `N1 serving meal ${stamp}`;
  const ingredientTitle = `N1 Lentils ${stamp}`;

  await signUpTechnicalManualUser(page, "n1-nutrition", stamp);

  await page.goto("/nutrition/recipes");
  const recipeCreate = page.getByRole("heading", { name: "Recipe erstellen" }).locator("xpath=ancestor::section[1]");
  await recipeCreate.getByLabel("Title").fill(recipeTitle);
  await recipeCreate.getByLabel("Servings").fill("2");
  await recipeCreate.getByRole("button", { name: "Recipe erstellen" }).click();
  await expect(page.getByText(recipeTitle, { exact: true }).first()).toBeVisible();
  await page.getByText(recipeTitle, { exact: true }).first().click();

  const ingredientCreate = page.getByRole("heading", { name: "Zutat hinzufügen" }).locator("xpath=ancestor::form[1]");
  await ingredientCreate.getByLabel("Name").fill(ingredientTitle);
  await ingredientCreate.getByLabel("Menge").fill("200");
  await ingredientCreate.getByLabel("Einheit").fill("g");
  await ingredientCreate.getByRole("button", { name: "Zutat hinzufügen" }).click();
  await expect(page.getByText(ingredientTitle, { exact: true })).toBeVisible();

  await page.goto("/nutrition");
  const mealCreate = page.getByRole("heading", { name: "Meal erstellen" }).locator("xpath=ancestor::section[1]");
  await mealCreate.getByLabel("Title").fill(mealTitle);
  await mealCreate.getByLabel("Recipe").selectOption({ label: recipeTitle });
  await mealCreate.getByLabel("Portionen").fill("0.5");
  await mealCreate.getByRole("button", { name: "Meal erstellen" }).click();
  await expect(page.getByText(mealTitle, { exact: true }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByText(mealTitle, { exact: true }).first()).toBeVisible();

  await page.goto("/nutrition/grocery");
  const groceryDraft = page.locator('[data-grocery-section="draft"]');
  await expect(groceryDraft.getByText(ingredientTitle, { exact: true })).toBeVisible();
  await expect(groceryDraft.getByText("50 g", { exact: true })).toBeVisible();

  await page.goto("/nutrition/meal-planner");
  const weekPlan = page.getByRole("region", { name: "Weekly Meal Plan" });
  const mealSlot = weekPlan.locator("button").filter({ hasText: recipeTitle }).last();
  await mealSlot.click();
  await expect(mealSlot).toHaveAttribute("aria-pressed", "true");
  const schedule = page.locator(`form[aria-label="${mealTitle} als Zeitblock planen"]`);
  await expect(schedule).toBeVisible();
  await schedule.getByRole("button", { name: "Im Calendar planen" }).click();

  await page.goto("/calendar");
  const weekGrid = page.locator('[data-calendar-section="week-grid"]');
  await expect(weekGrid.getByRole("button", { name: new RegExp(mealTitle) })).toBeVisible();
  await page.reload();
  await expect(weekGrid.getByRole("button", { name: new RegExp(mealTitle) })).toBeVisible();

  await page.goto("/today");
  const activity = page.locator('[data-today-section="activity-stream"]');
  await expect(activity.getByText(mealTitle, { exact: true })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText(mealTitle, { exact: true }).first()).toBeVisible();

  await page.goto("/nutrition");
  await page.getByRole("button", { name: "Gegessen" }).click();
  await page.reload();
  await expect(page.getByRole("region", { name: "Recent Meals" }).getByText(mealTitle, { exact: true })).toBeVisible();

  await page.goto("/calendar");
  await expect(weekGrid.getByRole("button", { name: new RegExp(`${mealTitle}.*done`) })).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByText("Recipe estimates unavailable", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText(mealTitle, { exact: true }).first()).toBeVisible();
});
