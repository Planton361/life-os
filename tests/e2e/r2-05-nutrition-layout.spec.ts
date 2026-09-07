import { createClient } from "@supabase/supabase-js";
import { expect, test, type Page } from "@playwright/test";
import { signUpTechnicalManualUser } from "./support/local-manual-auth";
import type { Database } from "@/types/supabase";
const routes = [
  "/nutrition",
  "/nutrition/meal-planner",
  "/nutrition/recipes",
  "/nutrition/grocery",
];
async function geometry(page: Page) {
  const result = await page.evaluate(() => {
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return {
        name: el.querySelector("h2")?.textContent,
        top: r.top,
        bottom: r.bottom,
        left: r.left,
        right: r.right,
        height: r.height,
      };
    };
    const root = document.querySelector(".nutrition-workspace-page")!;
    const cards = [
      ...root.querySelectorAll(
        ".nutrition-overview-grid > section,.nutrition-planner-context > section,.nutrition-week,.nutrition-recipes-grid > section,.nutrition-grocery-grid > section",
      ),
    ].map(box);
    return {
      bodyHeight: document.documentElement.scrollHeight,
      bodyWidth: document.documentElement.scrollWidth,
      width: innerWidth,
      height: innerHeight,
      root: box(root),
      cards,
    };
  });
  expect(result.bodyWidth).toBeLessThanOrEqual(result.width);
  if (result.width >= 1280) {
    expect(result.bodyHeight, "no desktop body scroll").toBeLessThanOrEqual(
      result.height,
    );
    expect(
      result.root.bottom,
      "workspace fills viewport",
    ).toBeGreaterThanOrEqual(result.height - 24);
    expect(
      Math.max(...result.cards.map((c) => c.bottom)),
    ).toBeGreaterThanOrEqual(result.root.bottom - 2);
    for (const card of result.cards) {
      expect(card.top).toBeGreaterThanOrEqual(0);
      expect(card.bottom, card.name ?? "card").toBeLessThanOrEqual(
        result.height,
      );
      expect(card.right).toBeLessThanOrEqual(result.width);
      expect(card.height).toBeGreaterThan(100);
    }
    for (let i = 0; i < result.cards.length; i++)
      for (let j = i + 1; j < result.cards.length; j++) {
        const a = result.cards[i],
          b = result.cards[j];
        expect(
          Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1,
          `${a.name} / ${b.name} overlap`,
        ).toBe(false);
      }
  }
  return result;
}
test("Nutrition empty and populated workspace viewport matrix", async ({
  page,
}, info) => {
  test.setTimeout(300000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => {
    if (["error", "warning"].includes(e.type())) errors.push(e.text());
  });
  const stamp = Date.now();
  await signUpTechnicalManualUser(page, "nutrition-layout", stamp);
  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const auth = await db.auth.signInWithPassword({
    email: `nutrition-layout-${stamp}@example.local`,
    password: `C1proof-${stamp}`,
  });
  expect(auth.error).toBeNull();
  const user = auth.data.user!.id;
  for (const state of ["empty", "populated"]) {
    if (state === "populated") {
      const recipes = await db
        .from("recipes")
        .insert(
          Array.from({ length: 12 }, (_, i) => ({
            user_id: user,
            title: `Rezept ${i + 1}`,
            servings: 2,
            prep_minutes: 20,
            summary: "Ein selbst gepflegtes Rezept",
            instructions: "Zutaten vorbereiten und kochen.",
            tags: ["breakfast", "lunch", "dinner"],
            nutrition_estimate: {
              calories: 800,
              protein: 60,
              carbs: 90,
              fat: 22,
            },
          })),
        )
        .select("id");
      expect(recipes.error).toBeNull();
      expect(
        (
          await db.from("recipe_ingredients").insert(
            recipes.data!.map((r, i) => ({
              user_id: user,
              recipe_id: r.id,
              name: `Zutat ${i + 1}`,
              quantity: 200,
              unit: "g",
            })),
          )
        ).error,
      ).toBeNull();
      const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Europe/Berlin",
      });
      expect(
        (
          await db.from("meals").insert(
            recipes.data!.map((r, i) => ({
              user_id: user,
              recipe_id: r.id,
              date: today,
              title: `Mahlzeit ${i + 1}`,
              meal_type: ["breakfast", "lunch", "dinner"][i % 3],
              servings: 1,
              completed_at: i < 3 ? new Date().toISOString() : null,
            })),
          )
        ).error,
      ).toBeNull();
    }
    for (const size of [
      { width: 1920, height: 1080 },
      { width: 2560, height: 1440 },
      { width: 3840, height: 2160 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(size);
      for (const route of routes) {
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        await expect(page.locator(".nutrition-workspace-page")).toBeVisible();
        await info.attach(`${state}-${route}-${size.width}-bounds`, {
          body: JSON.stringify(await geometry(page)),
          contentType: "application/json",
        });
        await page.screenshot({
          path: info.outputPath(
            `${state}-${route.replaceAll("/", "-")}-${size.width}.png`,
          ),
          fullPage: true,
        });
        if (state === "populated" && route === "/nutrition/meal-planner") {
          await page.locator("[data-meal-id]").last().click();
          await geometry(page);
          await page.screenshot({
            path: info.outputPath(`selected-planner-${size.width}.png`),
            fullPage: true,
          });
        }
        if (state === "empty" && [1920,3840,390].includes(size.width) && ["/nutrition", "/nutrition/recipes"].includes(route)) {
          await page.getByRole("button", {name: route === "/nutrition" ? "Mahlzeit erfassen" : "Neues Rezept", exact: true}).click();
          const dialog = page.getByRole("dialog");
          await expect(dialog).toBeVisible();
          const bounds = await dialog.boundingBox();
          expect(bounds).not.toBeNull();
          expect(bounds!.x).toBeGreaterThanOrEqual(0);
          expect(bounds!.y).toBeGreaterThanOrEqual(0);
          expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(size.width);
          expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(size.height);
          await page.screenshot({path: info.outputPath(`dialog-${route.replaceAll("/", "-")}-${size.width}.png`), fullPage: true});
          await dialog.getByRole("button", {name:"Schließen", exact:true}).click();
          await expect(dialog).not.toBeVisible();
        }
        const inventory = await page
          .locator(".nutrition-workspace-page")
          .locator("button,a,input,select,summary")
          .evaluateAll((nodes) =>
            nodes.map((n) => ({
              control: n.textContent?.trim() || n.getAttribute("aria-label"),
              disabled: n.hasAttribute("disabled"),
              tag: n.tagName,
            })),
          );
        await info.attach(`${state}-${route}-${size.width}-controls`, {
          body: JSON.stringify(inventory),
          contentType: "application/json",
        });
      }
    }
  }
  expect(errors).toEqual([]);
  await db.auth.signOut();
});
