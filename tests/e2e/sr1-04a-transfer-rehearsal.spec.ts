import { expect, test } from "@playwright/test";

const email = process.env.SR104A_E2E_EMAIL;
const password = process.env.SR104A_E2E_PASSWORD;

test.describe("SR1-04A synthetic transfer rehearsal", () => {
  test.setTimeout(90_000);
  test.skip(!email || !password, "Requires the isolated synthetic target credentials.");

  test("keeps Empty and unauthenticated Manual boundaries free of transferred data", async ({
    page,
  }) => {
    await page.goto("/inbox");
    const origin = new URL(page.url()).origin;

    await page.context().addCookies([
      { httpOnly: true, name: "life_os_profile", sameSite: "Lax", url: origin, value: "manual" },
    ]);
    await page.goto("/inbox");
    await expect(page.getByRole("main")).toContainText(
      "Manual DB benötigt Supabase Anmeldung",
    );
    await expect(page.getByRole("main")).not.toContainText("Synthetic inbox");

    await page.context().clearCookies();
    await page.context().addCookies([
      { httpOnly: true, name: "life_os_profile", sameSite: "Lax", url: origin, value: "empty" },
    ]);
    await page.goto("/inbox");
    await expect(page.getByRole("main")).toContainText("Inbox");
    await expect(page.getByRole("main")).not.toContainText("Synthetic inbox");
  });

  test("synthetic canonical data remains readable after login and reload", async ({ page }) => {
    await page.goto("/settings");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/inbox/);
    expect(
      (await page.context().cookies()).some(
        (cookie) =>
          cookie.name === "supabase-auth-token" ||
          (cookie.name.startsWith("sb-") && cookie.name.includes("-auth-token")),
      ),
    ).toBe(true);

    await page.goto("/settings");
    await page
      .getByRole("button", { exact: true, name: "Manual Local Profile" })
      .click();
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole("main")).toContainText("Aktives Profil: manual");
    await page.reload();
    await expect(page.getByRole("main")).toContainText("Aktives Profil: manual");

    await page.goto("/inbox");

    const inbox = page.getByRole("main");
    await expect(inbox).toContainText("Synthetic inbox");
    await page.reload();
    await expect(page.getByRole("main")).toContainText("Synthetic inbox");

    await page.goto("/dashboard");
    await expect(page.getByRole("main")).toContainText("Synthetic normal task");

    await page.goto("/tasks/00000000-0000-4000-8000-000000000200");
    const taskDetail = page.getByRole("main");
    await expect(taskDetail).toContainText("Synthetic normal task");
    await expect(taskDetail).toContainText("Project: Synthetic project");
    await expect(taskDetail).toContainText("Skill: Synthetic skill");
    await page.reload();
    await expect(page.getByRole("main")).toContainText("Skill: Synthetic skill");

    await page.goto("/projects/00000000-0000-4000-8000-000000000020");
    await expect(page.getByRole("main")).toContainText("Synthetic project");
    await page.goto("/goals/00000000-0000-4000-8000-000000000010");
    await expect(page.getByRole("main")).toContainText("Synthetic goal");
    await page.goto("/skills/00000000-0000-4000-8000-000000000050");
    await expect(page.getByRole("main")).toContainText("Synthetic skill");
    await page.goto("/resources");
    await expect(page.getByRole("main")).toContainText("Synthetic resource");
    await expect(page.getByRole("main")).toContainText("Synthetic normal task");

    await page.goto("/calendar");
    await expect(page.getByRole("main")).toContainText("Synthetic meal task");
    await expect(page.getByRole("main")).toContainText("Synthetic running task");
    await expect(page.getByRole("main")).toContainText("Synthetic strength task");
    await page.reload();
    await expect(page.getByRole("main")).toContainText("Synthetic review task");

    await page.goto("/nutrition/meal-planner");
    await expect(page.getByRole("main")).toContainText("Synthetic recipe");
    await page.reload();
    await expect(page.getByRole("main")).toContainText("Synthetic recipe");

    await page.goto("/review/daily");
    await expect(page.getByRole("main")).toContainText("Daily Review");

    await page.goto("/health/running");
    await expect(page.locator("#main-content")).toContainText("Synthetic run item");
    await page.goto("/health/strength");
    await expect(page.locator("#main-content")).toContainText("Synthetic strength plan");

    await page.goto("/health/habits");
    await expect(page.getByRole("main")).toContainText("Synthetic habit");
    await page.goto("/health");
    await expect(page.getByRole("main")).toContainText("71.00 kg");
    await page.goto("/life/inventory");
    const inventory = page.locator("#main-content");
    await expect(inventory).toContainText("Synthetic inventory");
    await expect(inventory).toContainText("Synthetic wishlist");
    await page.reload();
    await expect(page.locator("#main-content")).toContainText("Synthetic inventory");
  });
});
