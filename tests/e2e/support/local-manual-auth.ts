import { expect, type Page } from "@playwright/test";

const host = process.env.PLAYWRIGHT_HOST ?? "127.0.0.1";
const port = process.env.PLAYWRIGHT_PORT ?? "3000";
const baseUrl = `http://${host}:${port}`;

export async function signUpTechnicalManualUser(
  page: Page,
  prefix: string,
  stamp: number,
  options?: {
    issue110ExistingLocalRuntime?: true;
    issue112ExistingLocalRuntime?: true;
  },
) {
  // CONTROL #110 comment 5994346065: one explicitly scoped synthetic owner
  // on the already-running local app; this never starts an E2E runtime.
  const issue110Local =
    options?.issue110ExistingLocalRuntime === true &&
    prefix === "issue110composition" &&
    host === "localhost" &&
    port === "3000" &&
    process.env.LIFE_OS_110_SYNTHETIC_PROJECT_PROOF === "1" &&
    /^http:\/\/(localhost|127\.0\.0\.1):\d+\/?$/.test(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    );
  // #112 explicitly authorizes isolated local UI fixture writes. Production
  // authentication is untouched; this is a test-only, issue-scoped opt-in.
  const localApiSession = (await page.context().cookies()).some((cookie) =>
    /^sb-(127|localhost)-auth-token(?:\.\d+)?$/.test(cookie.name),
  );
  const issue112Local =
    options?.issue112ExistingLocalRuntime === true &&
    prefix === "issue112cockpit" &&
    host === "localhost" &&
    ["3000", "3002"].includes(port) &&
    /^http:\/\/(localhost|127\.0\.0\.1):\d+\/?$/.test(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    ) &&
    process.env.LIFE_OS_112_SYNTHETIC_PROOF === "1" &&
    localApiSession;
  if (
    process.env.LIFE_OS_E2E_RUNTIME !== "DISPOSABLE" &&
    !issue110Local &&
    !issue112Local
  ) {
    throw new Error(
      "Technical Playwright sign-up requires the disposable local E2E runtime. Use pnpm test:e2e:isolated <focused-spec>.",
    );
  }

  // Drop the read-only bootstrap session before technical owner creation.
  if (issue112Local) await page.context().clearCookies();

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
