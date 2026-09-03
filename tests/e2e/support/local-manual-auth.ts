import { expect, type Page } from "@playwright/test";

const host = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const port = process.env.PLAYWRIGHT_PORT ?? "3000";
const baseUrl = `http://${host}:${port}`;

export async function signUpTechnicalManualUser(
  page: Page,
  prefix: string,
  stamp: number,
) {
  if (process.env.LIFE_OS_E2E_RUNTIME !== "DISPOSABLE") {
    throw new Error(
      "Technical Playwright sign-up requires the disposable local E2E runtime. Use pnpm test:e2e:isolated <focused-spec>.",
    );
  }

  await page.context().addCookies([
    {
      httpOnly: true,
      name: "life_os_profile",
      sameSite: "Lax",
      url: baseUrl,
      value: "manual",
    },
  ]);
  await page.goto("/settings#supabase-session");

  const panel = page.locator("#supabase-session");
  await expect(panel.getByRole("button", { name: "Sign up" })).toBeVisible();
  await panel.getByLabel("Email").fill(`${prefix}-${stamp}@example.local`);
  await panel.getByLabel("Password").fill(`C1proof-${stamp}`);
  await panel.getByRole("button", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/inbox(?:#.*)?$/);
}
